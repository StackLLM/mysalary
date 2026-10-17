import { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { cookieDe, creerCompte, MOT_DE_PASSE_TEST, pour, preparerApp, url } from './outils'

// Parcours de compte de bout en bout (prod.md § 5.6, lot P3).

const ctx = preparerApp()

const appeler = (method: 'GET' | 'POST' | 'PUT', chemin: string, entetes: { cookie?: string } = {}, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: entetes, ...(payload ? { payload } : {}) })
const connecter = (email: string, motDePasse = MOT_DE_PASSE_TEST) => appeler('POST', '/auth/connexion', {}, { email, motDePasse })
const JOUR = 24 * 60 * 60 * 1000
const jetonDu = (texte: string) => texte.match(/jeton=([^\s&]+)/)![1]!

describe('session', () => {
  it('prolongée de 30 jours quand il lui reste moins de 7 jours ; laissée telle quelle sinon', async () => {
    const a = await creerCompte(ctx.app, 'A')
    await ctx.prisma.session.updateMany({ data: { expireLe: new Date(Date.now() + 3 * JOUR) } })
    const proche = await appeler('GET', '/reglages', pour(a.id))
    expect(proche.statusCode).toBe(200)
    expect(String(proche.headers['set-cookie'])).toMatch(/Max-Age=2592000/)
    const prolongee = await ctx.prisma.session.findFirstOrThrow()
    expect(prolongee.expireLe.getTime()).toBeGreaterThan(Date.now() + 29 * JOUR)

    await ctx.prisma.session.updateMany({ data: { expireLe: new Date(Date.now() + 20 * JOUR) } })
    const loin = await appeler('GET', '/auth/session', pour(a.id))
    expect(loin.statusCode).toBe(200)
    expect(loin.headers['set-cookie']).toBeUndefined()
  })

  it('« Se déconnecter de tous les appareils » ferme toutes les sessions du compte, pas celles des autres', async () => {
    const a = await creerCompte(ctx.app, 'A', 'partout@exemple.test')
    const b = await creerCompte(ctx.app, 'B')
    const telephone = cookieDe(await connecter('partout@exemple.test'))
    const sortie = await appeler('POST', '/compte/sessions/fermeture', pour(a.id))
    expect(sortie.statusCode).toBe(204)
    expect(String(sortie.headers['set-cookie'])).toContain('Max-Age=0')
    expect((await appeler('GET', '/reglages', pour(a.id))).statusCode).toBe(401)
    expect((await appeler('GET', '/reglages', { cookie: telephone })).statusCode).toBe(401)
    expect((await appeler('GET', '/reglages', pour(b.id))).statusCode).toBe(200)
  })
})

describe('trop d’essais', () => {
  it('le refus donne le délai réel et l’en-tête Retry-After', async () => {
    await creerCompte(ctx.app, 'A', 'delai@exemple.test')
    for (let i = 0; i < 5; i++) await connecter('delai@exemple.test', 'non-non-non')
    const bloque = await connecter('delai@exemple.test')
    expect(bloque.statusCode).toBe(429)
    expect(bloque.json().erreur.message).toMatch(/^Trop d’essais\. Réessaie dans 15 minutes\.$/)
    expect(Number(bloque.headers['retry-after'])).toBeGreaterThan(0)
  })
})

describe('e-mails d’alerte', () => {
  it('après un changement de mot de passe dans les Réglages', async () => {
    const a = await creerCompte(ctx.app, 'Léa', 'alerte@exemple.test')
    ctx.messages.length = 0
    expect((await appeler('PUT', '/compte/mot-de-passe', pour(a.id), { actuel: MOT_DE_PASSE_TEST, nouveau: 'un-autre-mot-de-passe' })).statusCode).toBe(204)
    expect(ctx.messages).toHaveLength(1)
    expect(ctx.messages[0]).toMatchObject({ a: 'alerte@exemple.test', sujet: 'MySalary : ton mot de passe a changé' })
    expect(ctx.messages[0]!.texte).toContain('https://mysalary.test/mot-de-passe/oubli')
  })

  it('après une réinitialisation par lien', async () => {
    await creerCompte(ctx.app, 'Léa', 'oubli-alerte@exemple.test')
    await appeler('POST', '/auth/mot-de-passe/oubli', {}, { email: 'oubli-alerte@exemple.test' })
    const jeton = jetonDu(ctx.messages.at(-1)!.texte)
    ctx.messages.length = 0
    expect((await appeler('POST', '/auth/mot-de-passe/reinitialisation', {}, { jeton, motDePasse: 'un-autre-mot-de-passe' })).statusCode).toBe(204)
    expect(ctx.messages.map((m) => [m.a, m.sujet])).toEqual([['oubli-alerte@exemple.test', 'MySalary : ton mot de passe a changé']])
  })

  it('l’ancienne adresse est prévenue quand l’e-mail de connexion change, sans lien vers le compte', async () => {
    const a = await creerCompte(ctx.app, 'Léa', 'ancienne@exemple.test')
    await appeler('PUT', '/compte/email', pour(a.id), { email: 'nouvelle@exemple.test', motDePasse: MOT_DE_PASSE_TEST })
    const jeton = jetonDu(ctx.messages.at(-1)!.texte)
    ctx.messages.length = 0
    expect((await appeler('POST', '/auth/email/verification', {}, { jeton })).statusCode).toBe(204)
    expect(ctx.messages).toHaveLength(1)
    expect(ctx.messages[0]).toMatchObject({ a: 'ancienne@exemple.test', sujet: 'MySalary : ton adresse de connexion a changé' })
    expect(ctx.messages[0]!.texte).toContain('nouvelle@exemple.test')
    expect(ctx.messages[0]!.texte).not.toContain('jeton=')
  })

  it('une alerte qui ne part pas n’annule pas le changement', async () => {
    const a = await creerCompte(ctx.app, 'Léa', 'panne@exemple.test')
    const avant = ctx.app.auth.messagerie
    ctx.app.auth.messagerie = async () => {
      throw new Error('SMTP en panne')
    }
    try {
      expect((await appeler('PUT', '/compte/mot-de-passe', pour(a.id), { actuel: MOT_DE_PASSE_TEST, nouveau: 'un-autre-mot-de-passe' })).statusCode).toBe(204)
    } finally {
      ctx.app.auth.messagerie = avant
    }
    expect((await connecter('panne@exemple.test', 'un-autre-mot-de-passe')).statusCode).toBe(200)
  })
})

describe('suppression du compte', () => {
  it('envoie une confirmation et ne laisse aucune ligne du compte dans aucune table', async () => {
    const a = await creerCompte(ctx.app, 'Léa', 'adieu@exemple.test')
    await appeler('POST', '/salaire/contrats', pour(a.id), { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' })
    await appeler('POST', '/objectifs', pour(a.id), { libelle: 'Voyage', montantCible: 100_000 })
    await appeler('POST', '/auth/mot-de-passe/oubli', {}, { email: 'adieu@exemple.test' })
    ctx.messages.length = 0

    expect((await appeler('POST', '/compte/suppression', pour(a.id), { motDePasse: MOT_DE_PASSE_TEST })).statusCode).toBe(204)
    expect(ctx.messages.map((m) => [m.a, m.sujet])).toEqual([['adieu@exemple.test', 'MySalary : ton compte est supprimé']])

    const tables = Prisma.dmmf.datamodel.models.filter((m) => m.fields.some((f) => f.name === 'utilisateurId')).map((m) => m.name[0]!.toLowerCase() + m.name.slice(1))
    type Delegue = { count(args: object): Promise<number> }
    for (const table of tables) {
      expect(await (ctx.prisma as unknown as Record<string, Delegue>)[table]!.count({ where: { utilisateurId: a.id } }), table).toBe(0)
    }
    expect(await ctx.prisma.utilisateur.count({ where: { id: a.id } })).toBe(0)
  })
})

describe('informations publiques', () => {
  it('donnent le contact du responsable, sans session', async () => {
    const r = await appeler('GET', '/infos')
    expect(r.statusCode).toBe(200)
    expect(r.json()).toEqual({ contact: null })
  })
})
