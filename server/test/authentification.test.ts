import { VERSION_CONDITIONS, type Utilisateur } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { construireApp } from '../src/app'
import { activerCompte } from '../src/lib/activation'
import { cookieDe, creerCompte, MOT_DE_PASSE_TEST, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

const appeler = (method: 'GET' | 'POST' | 'PUT', chemin: string, { payload, cookie }: { payload?: object; cookie?: string } = {}) =>
  ctx.app.inject({ method, url: url(chemin), headers: cookie ? { cookie } : {}, ...(payload ? { payload } : {}) })
const inscrire = (payload: object) => appeler('POST', '/auth/inscription', { payload: { accepteConditions: true, ...payload } })
const connecter = (email: string, motDePasse: string) => appeler('POST', '/auth/connexion', { payload: { email, motDePasse } })
/** Le lien du dernier e-mail envoyé, et son jeton. */
const dernierLien = () => {
  const lien = ctx.messages.at(-1)!.texte.match(/https:\/\/mysalary\.test\/mot-de-passe\/nouveau\?jeton=(\S+)/)!
  return { lien: lien[0], jeton: decodeURIComponent(lien[1]!) }
}

describe('inscription', () => {
  it('crée le compte (e-mail en minuscules, réglages par défaut), ouvre la session ; le mot de passe n’est jamais renvoyé', async () => {
    const r = await inscrire({ prenom: '  Léa ', email: ' Lea@Exemple.TEST ', motDePasse: 'un-bon-mot-de-passe' })
    expect(r.statusCode, r.body).toBe(201)
    const compte = r.json() as Utilisateur
    expect(compte).toMatchObject({ prenom: 'Léa', email: 'lea@exemple.test', devise: 'MAD', onboardingTermine: false })
    expect(r.body).not.toMatch(/scrypt|motDePasse/)
    expect(String(r.headers['set-cookie'])).toMatch(/^mysalary_session=[\w-]{20,}; HttpOnly; SameSite=Strict; Path=\/; Max-Age=2592000$/)
    expect((await appeler('GET', '/auth/session', { cookie: cookieDe(r) })).json()).toMatchObject({ id: compte.id, email: 'lea@exemple.test' })
    expect(await ctx.prisma.reglages.count({ where: { utilisateurId: compte.id } })).toBe(1)
    const ligne = await ctx.prisma.utilisateur.findUniqueOrThrow({ where: { id: compte.id } })
    expect(ligne.motDePasse).toMatch(/^scrypt\$/)
    expect(ligne.motDePasse).not.toContain('un-bon-mot-de-passe')
    expect(ligne).toMatchObject({ conditionsVersion: VERSION_CONDITIONS })
    expect(ligne.conditionsAccepteesLe).toBeInstanceOf(Date)
  })

  it('refuse l’inscription sans acceptation des conditions d’utilisation et de confidentialité', async () => {
    const r = await inscrire({ prenom: 'A', email: 'sans@exemple.test', motDePasse: 'un-bon-mot-de-passe', accepteConditions: false })
    expect(r.statusCode).toBe(400)
    expect(r.json().erreur.champs.accepteConditions).toMatch(/Accepte les conditions/)
    expect(await ctx.prisma.utilisateur.count()).toBe(0)
  })

  it('refuse un e-mail déjà pris (même casse différente) et des champs invalides, par champ', async () => {
    await inscrire({ prenom: 'A', email: 'a@exemple.test', motDePasse: 'mot-de-passe-1' })
    const doublon = await inscrire({ prenom: 'B', email: 'A@EXEMPLE.test', motDePasse: 'mot-de-passe-2' })
    expect(doublon.statusCode).toBe(409)
    expect(doublon.json().erreur.champs.email).toMatch(/existe déjà/)
    const mauvais = await inscrire({ prenom: '', email: 'pas-un-email', motDePasse: 'court', role: 'admin' })
    expect(mauvais.statusCode).toBe(400)
    expect(mauvais.json().erreur.champs).toEqual({ prenom: 'Le prénom est obligatoire.', email: 'Cet e-mail n’est pas valide.', motDePasse: 'Au moins 8 caractères.', role: 'Champ non autorisé.' })
  })
})

describe('connexion, session, déconnexion', () => {
  it('bon mot de passe : nouvelle session (jeton jamais stocké en clair) ; mauvais ou e-mail inconnu : même réponse', async () => {
    const compte = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    const bon = await connecter('A@exemple.test', MOT_DE_PASSE_TEST)
    expect(bon.statusCode, bon.body).toBe(200)
    expect(bon.json()).toMatchObject({ id: compte.id, derniereOuverture: expect.any(String) })
    const cookie = cookieDe(bon)
    expect(await ctx.prisma.session.count({ where: { id: cookie.split('=')[1]! } })).toBe(0)
    expect((await appeler('GET', '/reglages', { cookie })).statusCode).toBe(200)

    for (const [email, mot] of [['a@exemple.test', 'mauvais-mot'], ['inconnu@exemple.test', MOT_DE_PASSE_TEST]]) {
      const r = await connecter(email!, mot!)
      expect(r.statusCode).toBe(401)
      expect(r.json().erreur).toMatchObject({ code: 'IDENTIFIANTS_REFUSES', message: 'E-mail ou mot de passe incorrect.' })
      expect(r.headers['set-cookie']).toBeUndefined()
    }
  })

  it('session : 401 sans cookie ; déconnexion : le cookie est effacé et la session ne vaut plus rien', async () => {
    expect((await appeler('GET', '/auth/session')).statusCode).toBe(401)
    const compte = await creerCompte(ctx.app, 'A')
    const sortie = await ctx.app.inject({ method: 'POST', url: url('/auth/deconnexion'), headers: pour(compte.id) })
    expect(sortie.statusCode).toBe(204)
    expect(String(sortie.headers['set-cookie'])).toContain('Max-Age=0')
    expect((await ctx.app.inject({ method: 'GET', url: url('/reglages'), headers: pour(compte.id) })).statusCode).toBe(401)
  })

  it('session expirée : refusée et supprimée', async () => {
    const compte = await creerCompte(ctx.app, 'A')
    await ctx.prisma.session.updateMany({ data: { expireLe: new Date(Date.now() - 1000) } })
    expect((await ctx.app.inject({ method: 'GET', url: url('/auth/session'), headers: pour(compte.id) })).statusCode).toBe(401)
    expect(await ctx.prisma.session.count()).toBe(0)
  })

  it('5 échecs pour un e-mail bloquent les essais, même avec le bon mot de passe', async () => {
    await creerCompte(ctx.app, 'A', 'bloque@exemple.test')
    for (let i = 0; i < 5; i++) expect((await connecter('bloque@exemple.test', 'non-non-non')).statusCode).toBe(401)
    const bloque = await connecter('bloque@exemple.test', MOT_DE_PASSE_TEST)
    expect(bloque.statusCode).toBe(429)
    expect(bloque.json().erreur.code).toBe('TROP_DE_TENTATIVES')
  })

  it('un compte d’avant le lot 23 (sans mot de passe) ne peut pas se connecter', async () => {
    await ctx.prisma.utilisateur.create({ data: { prenom: 'Ancien', email: 'ancien@exemple.test' } })
    expect((await connecter('ancien@exemple.test', 'nimporte-quoi')).statusCode).toBe(401)
  })
})

describe('mot de passe oublié', () => {
  it('envoie un lien à usage unique ; le nouveau mot de passe ferme toutes les sessions', async () => {
    const compte = await creerCompte(ctx.app, 'A', 'oubli@exemple.test')
    ctx.messages.length = 0 // le message de confirmation de l'inscription
    const r = await appeler('POST', '/auth/mot-de-passe/oubli', { payload: { email: 'Oubli@exemple.test' } })
    expect(r.statusCode).toBe(204)
    expect(ctx.messages).toHaveLength(1)
    expect(ctx.messages[0]).toMatchObject({ a: 'oubli@exemple.test', sujet: 'MySalary : choisis un nouveau mot de passe' })
    const { jeton } = dernierLien()
    // Le jeton n'est stocké que sous forme d'empreinte.
    expect(await ctx.prisma.jetonMotDePasse.count({ where: { id: jeton } })).toBe(0)

    const court = await appeler('POST', '/auth/mot-de-passe/reinitialisation', { payload: { jeton, motDePasse: 'court' } })
    expect(court.statusCode).toBe(400)
    const ok = await appeler('POST', '/auth/mot-de-passe/reinitialisation', { payload: { jeton, motDePasse: 'nouveau-mot-de-passe' } })
    expect(ok.statusCode, ok.body).toBe(204)
    expect((await ctx.app.inject({ method: 'GET', url: url('/reglages'), headers: pour(compte.id) })).statusCode).toBe(401)
    expect((await connecter('oubli@exemple.test', MOT_DE_PASSE_TEST)).statusCode).toBe(401)
    expect((await connecter('oubli@exemple.test', 'nouveau-mot-de-passe')).statusCode).toBe(200)

    const encore = await appeler('POST', '/auth/mot-de-passe/reinitialisation', { payload: { jeton, motDePasse: 'encore-un-autre' } })
    expect(encore.statusCode).toBe(400)
    expect(encore.json().erreur.code).toBe('LIEN_INVALIDE')
  })

  it('e-mail inconnu : même réponse, aucun message ; lien expiré ou remplacé : refusé', async () => {
    expect((await appeler('POST', '/auth/mot-de-passe/oubli', { payload: { email: 'personne@exemple.test' } })).statusCode).toBe(204)
    expect(ctx.messages).toHaveLength(0)

    await creerCompte(ctx.app, 'A', 'a@exemple.test')
    await appeler('POST', '/auth/mot-de-passe/oubli', { payload: { email: 'a@exemple.test' } })
    const premier = dernierLien().jeton
    await appeler('POST', '/auth/mot-de-passe/oubli', { payload: { email: 'a@exemple.test' } })
    const second = dernierLien().jeton
    expect((await appeler('POST', '/auth/mot-de-passe/reinitialisation', { payload: { jeton: premier, motDePasse: 'nouveau-mot-de-passe' } })).statusCode).toBe(400)
    await ctx.prisma.jetonMotDePasse.updateMany({ data: { expireLe: new Date(Date.now() - 1000) } })
    expect((await appeler('POST', '/auth/mot-de-passe/reinitialisation', { payload: { jeton: second, motDePasse: 'nouveau-mot-de-passe' } })).statusCode).toBe(400)
  })
})

describe('activation d’un compte d’avant le lot 23', () => {
  it('donne un e-mail, garde les données, et le lien choisit le mot de passe', async () => {
    const ancien = await ctx.prisma.utilisateur.create({ data: { prenom: 'Oussama', reglages: { create: {} } } })
    await ctx.prisma.objectif.create({ data: { utilisateurId: ancien.id, libelle: 'Moto', montantCible: 8_300_000, priorite: 1 } })
    const { lien } = await activerCompte(ctx.prisma, { compte: 'Oussama', email: 'Oussama@Exemple.test' }, new Date(), 'https://mysalary.test')
    const jeton = decodeURIComponent(lien.split('jeton=')[1]!)
    expect((await appeler('POST', '/auth/mot-de-passe/reinitialisation', { payload: { jeton, motDePasse: 'mon-mot-de-passe' } })).statusCode).toBe(204)
    const connexion = await connecter('oussama@exemple.test', 'mon-mot-de-passe')
    expect(connexion.json()).toMatchObject({ id: ancien.id, prenom: 'Oussama' })
    const objectifs = await appeler('GET', '/objectifs', { cookie: cookieDe(connexion) })
    expect(objectifs.json().objectifs.map((o: { libelle: string }) => o.libelle)).toEqual(['Moto'])
  })

  it('refuse un e-mail déjà utilisé, un prénom ambigu ou inconnu', async () => {
    await creerCompte(ctx.app, 'Pris', 'pris@exemple.test')
    await ctx.prisma.utilisateur.create({ data: { prenom: 'Double' } })
    await ctx.prisma.utilisateur.create({ data: { prenom: 'Double' } })
    const ancien = await ctx.prisma.utilisateur.create({ data: { prenom: 'Seul' } })
    await expect(activerCompte(ctx.prisma, { compte: 'Seul', email: 'pris@exemple.test' }, new Date(), 'x')).rejects.toThrow('déjà utilisé')
    await expect(activerCompte(ctx.prisma, { compte: 'Double', email: 'd@exemple.test' }, new Date(), 'x')).rejects.toThrow('Plusieurs comptes')
    await expect(activerCompte(ctx.prisma, { compte: 'Personne', email: 'p@exemple.test' }, new Date(), 'x')).rejects.toThrow('Aucun compte')
    expect((await activerCompte(ctx.prisma, { compte: ancien.id, email: 's@exemple.test' }, new Date(), 'x')).prenom).toBe('Seul')
  })
})

describe('cookie Secure en HTTPS', () => {
  it('le cookie de session porte Secure quand l’application est servie en HTTPS', async () => {
    const app = await construireApp({ prisma: ctx.prisma, auth: { cookieSecurise: true } })
    const r = await app.inject({ method: 'POST', url: url('/auth/inscription'), payload: { prenom: 'S', email: 's@exemple.test', motDePasse: 'mot-de-passe-s', accepteConditions: true } })
    expect(String(r.headers['set-cookie'])).toMatch(/; Secure$/)
    await app.close()
  })
})
