import { describe, expect, it } from 'vitest'
import { activerCompte } from '../src/lib/activation'
import { purgerExpires } from '../src/lib/purge'
import { cookieDe, creerCompte, MOT_DE_PASSE_TEST, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

const appeler = (id: string | null, method: 'GET' | 'POST' | 'PUT', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: id ? pour(id) : {}, ...(payload ? { payload } : {}) })
/** Jeton du lien de confirmation du dernier e-mail envoyé. */
const jetonDuDernierMessage = () => decodeURIComponent(ctx.messages.at(-1)!.texte.match(/https:\/\/mysalary\.test\/email\/verification\?jeton=(\S+)/)![1]!)
const ouvrir = (jeton: string) => appeler(null, 'POST', '/auth/email/verification', { jeton })
const ligne = (id: string) => ctx.prisma.utilisateur.findUniqueOrThrow({ where: { id } })

describe('confirmation de l’adresse', () => {
  it('l’inscription envoie un lien (texte et HTML) ; l’ouvrir confirme l’adresse ; il ne sert qu’une fois', async () => {
    const a = await creerCompte(ctx.app, 'Léa', 'lea@exemple.test')
    expect(a.emailVerifie).toBe(false)
    expect(ctx.messages).toHaveLength(1)
    const message = ctx.messages[0]!
    expect(message).toMatchObject({ a: 'lea@exemple.test', sujet: 'MySalary : confirme ton adresse e-mail' })
    expect(message.texte).toContain('Bonjour Léa')
    expect(message.html).toMatch(/<a href="https:\/\/mysalary\.test\/email\/verification\?jeton=[^"]+"/)

    const jeton = jetonDuDernierMessage()
    expect(await ctx.prisma.jetonEmail.count({ where: { id: jeton } })).toBe(0) // seule l'empreinte est en base
    expect((await ouvrir(jeton)).statusCode).toBe(204)
    expect((await appeler(a.id, 'GET', '/auth/session')).json()).toMatchObject({ emailVerifie: true })
    const apres = await ouvrir(jeton)
    expect(apres.statusCode).toBe(400)
    expect(apres.json().erreur.code).toBe('LIEN_INVALIDE')
  })

  it('un lien expiré ou inventé est refusé ; l’adresse reste à confirmer', async () => {
    const a = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    const jeton = jetonDuDernierMessage()
    expect((await ouvrir('x'.repeat(40))).json().erreur.code).toBe('LIEN_INVALIDE')
    ctx.jour = '2099-01-01'
    expect((await ouvrir(jeton)).statusCode).toBe(400)
    expect(await ctx.prisma.jetonEmail.count()).toBe(0)
    expect((await ligne(a.id)).emailVerifieLe).toBeNull()
  })

  it('renvoi : un nouveau lien remplace l’ancien ; déjà confirmé : refusé ; 3 envois par heure', async () => {
    const a = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    const ancien = jetonDuDernierMessage()
    expect((await appeler(a.id, 'POST', '/compte/email/renvoi', {})).statusCode).toBe(204)
    expect(ctx.messages).toHaveLength(2)
    expect((await ouvrir(ancien)).statusCode).toBe(400)
    expect((await appeler(a.id, 'POST', '/compte/email/renvoi', {})).statusCode).toBe(204)
    expect((await ouvrir(jetonDuDernierMessage())).statusCode).toBe(204)
    expect((await appeler(a.id, 'POST', '/compte/email/renvoi', {})).statusCode).toBe(409)

    const b = await creerCompte(ctx.app, 'B', 'b@exemple.test')
    for (let i = 0; i < 3; i++) expect((await appeler(b.id, 'POST', '/compte/email/renvoi', {})).statusCode).toBe(204)
    expect((await appeler(b.id, 'POST', '/compte/email/renvoi', {})).statusCode).toBe(429)
    expect((await appeler(null, 'POST', '/compte/email/renvoi', {})).statusCode).toBe(401)
  })

  it('un mot de passe choisi par le lien reçu confirme aussi l’adresse ; l’activation d’un ancien compte aussi', async () => {
    const a = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    await appeler(null, 'POST', '/auth/mot-de-passe/oubli', { email: 'a@exemple.test' })
    const dernier = ctx.messages.at(-1)!
    expect(dernier.html).toContain('Choisir un mot de passe')
    const jeton = decodeURIComponent(dernier.texte.match(/mot-de-passe\/nouveau\?jeton=(\S+)/)![1]!)
    await appeler(null, 'POST', '/auth/mot-de-passe/reinitialisation', { jeton, motDePasse: 'nouveau-mot-de-passe' })
    expect((await ligne(a.id)).emailVerifieLe).not.toBeNull()

    const ancien = await ctx.prisma.utilisateur.create({ data: { prenom: 'Ancien', reglages: { create: {} } } })
    await activerCompte(ctx.prisma, { compte: 'Ancien', email: 'ancien@exemple.test' }, new Date(), 'https://mysalary.test')
    expect((await ligne(ancien.id)).emailVerifieLe).not.toBeNull()
  })
})

describe('changement d’e-mail', () => {
  it('mot de passe exigé ; adresse déjà prise ou identique refusée ; rien ne change avant le clic', async () => {
    const a = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    await creerCompte(ctx.app, 'B', 'b@exemple.test')
    ctx.messages.length = 0
    const faux = await appeler(a.id, 'PUT', '/compte/email', { email: 'neuf@exemple.test', motDePasse: 'pas-le-bon' })
    expect(faux.statusCode).toBe(401)
    expect((await appeler(a.id, 'PUT', '/compte/email', { email: 'b@exemple.test', motDePasse: MOT_DE_PASSE_TEST })).statusCode).toBe(409)
    expect((await appeler(a.id, 'PUT', '/compte/email', { email: 'A@exemple.test', motDePasse: MOT_DE_PASSE_TEST })).statusCode).toBe(422)
    expect(ctx.messages).toHaveLength(0)

    const ok = await appeler(a.id, 'PUT', '/compte/email', { email: ' Neuf@Exemple.test ', motDePasse: MOT_DE_PASSE_TEST })
    expect(ok.statusCode).toBe(202)
    expect(ok.json()).toEqual({ email: 'neuf@exemple.test' })
    expect(ctx.messages).toHaveLength(1)
    expect(ctx.messages[0]).toMatchObject({ a: 'neuf@exemple.test', sujet: 'MySalary : confirme ta nouvelle adresse' })
    expect((await ligne(a.id)).email).toBe('a@exemple.test')
  })

  it('le lien remplace l’adresse et la confirme ; l’ancienne ne connecte plus, la nouvelle oui', async () => {
    const a = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    await appeler(a.id, 'PUT', '/compte/email', { email: 'neuf@exemple.test', motDePasse: MOT_DE_PASSE_TEST })
    const jeton = jetonDuDernierMessage()
    expect((await ouvrir(jeton)).statusCode).toBe(204)
    expect(await ligne(a.id)).toMatchObject({ email: 'neuf@exemple.test' })
    expect((await ligne(a.id)).emailVerifieLe).not.toBeNull()
    expect((await appeler(null, 'POST', '/auth/connexion', { email: 'a@exemple.test', motDePasse: MOT_DE_PASSE_TEST })).statusCode).toBe(401)
    const nouveau = await appeler(null, 'POST', '/auth/connexion', { email: 'neuf@exemple.test', motDePasse: MOT_DE_PASSE_TEST })
    expect(nouveau.statusCode).toBe(200)
    expect(cookieDe(nouveau)).toMatch(/^mysalary_session=/)
    expect((await ouvrir(jeton)).statusCode).toBe(400)
  })

  it('une adresse prise entre la demande et le clic est refusée', async () => {
    const a = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    await appeler(a.id, 'PUT', '/compte/email', { email: 'neuf@exemple.test', motDePasse: MOT_DE_PASSE_TEST })
    const jeton = jetonDuDernierMessage()
    await creerCompte(ctx.app, 'B', 'neuf@exemple.test')
    const r = await ouvrir(jeton)
    expect(r.statusCode).toBe(409)
    expect((await ligne(a.id)).email).toBe('a@exemple.test')
  })

  it('un lien de vérification d’une ancienne adresse ne confirme pas la nouvelle', async () => {
    const a = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    const ancienLien = jetonDuDernierMessage()
    await appeler(a.id, 'PUT', '/compte/email', { email: 'neuf@exemple.test', motDePasse: MOT_DE_PASSE_TEST })
    await ouvrir(jetonDuDernierMessage())
    expect((await ouvrir(ancienLien)).statusCode).toBe(400)
  })
})

describe('purge', () => {
  it('supprime les sessions et les liens expirés, garde les autres', async () => {
    const a = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    await appeler(null, 'POST', '/auth/mot-de-passe/oubli', { email: 'a@exemple.test' })
    const passe = new Date('2000-01-01T00:00:00Z')
    const futur = new Date('2999-01-01T00:00:00Z')
    await ctx.prisma.session.create({ data: { id: 'vieille', utilisateurId: a.id, expireLe: passe } })
    await ctx.prisma.jetonMotDePasse.updateMany({ data: { expireLe: passe } })
    await ctx.prisma.jetonEmail.create({ data: { id: 'vieux', utilisateurId: a.id, type: 'changement', email: 'x@exemple.test', expireLe: passe } })

    const n = await purgerExpires(ctx.prisma, new Date())
    expect(n).toEqual({ sessions: 1, liensMotDePasse: 1, liensEmail: 1 })
    expect(await ctx.prisma.session.count()).toBe(1) // la session ouverte à l'inscription
    expect(await ctx.prisma.jetonEmail.count()).toBe(1) // le lien de vérification de l'inscription
    expect(futur.getTime()).toBeGreaterThan(Date.now())
  })
})
