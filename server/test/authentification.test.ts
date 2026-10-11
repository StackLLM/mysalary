import type { Utilisateur } from '@mysalary/partage'
import { afterAll, describe, expect, it } from 'vitest'
import { construireApp } from '../src/app'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()
const MOT = 'un-mot-de-passe'

const appeler = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, { payload, cookie, id }: { payload?: object; cookie?: string; id?: string } = {}) =>
  ctx.app.inject({ method, url: url(chemin), headers: { ...(id ? pour(id) : {}), ...(cookie ? { cookie } : {}) }, ...(payload ? { payload } : {}) })

const cookieDe = (r: { headers: Record<string, unknown> }) => String(r.headers['set-cookie']).split(';')[0]!

async function compteProtege(prenom = 'Protégé') {
  const r = await appeler('POST', '/utilisateurs', { payload: { prenom, motDePasse: MOT } })
  expect(r.statusCode, r.body).toBe(201)
  // La création ouvre une session pour son créateur ; les tests repartent sans session.
  expect(String(r.headers['set-cookie'])).toContain('HttpOnly')
  await ctx.prisma.session.deleteMany()
  return r.json() as Utilisateur
}
const connecter = async (id: string, motDePasse = MOT) => appeler('POST', `/utilisateurs/${id}/connexion`, { payload: { motDePasse } })

describe('mot de passe et sessions', () => {
  it('un compte protégé exige une session ; un compte sans mot de passe reste ouvert', async () => {
    const libre = await creerCompte(ctx.app, 'Libre')
    const protege = await compteProtege()
    expect(protege).toMatchObject({ protege: true })
    expect(JSON.stringify(protege)).not.toContain('scrypt')
    expect((await appeler('GET', '/reglages', { id: libre.id })).statusCode).toBe(200)

    const refuse = await appeler('GET', '/reglages', { id: protege.id })
    expect(refuse.statusCode).toBe(401)
    expect(refuse.json().erreur.code).toBe('SESSION_REQUISE')
    expect((await appeler('POST', `/utilisateurs/${protege.id}/ouvrir`)).json().erreur.code).toBe('SESSION_REQUISE')
    for (const [m, chemin] of [['GET', `/utilisateurs/${protege.id}/export`], ['DELETE', `/utilisateurs/${protege.id}`], ['POST', `/utilisateurs/${protege.id}/reinitialiser`]] as const) {
      expect((await appeler(m, chemin)).statusCode, chemin).toBe(401)
    }
    const liste = (await appeler('GET', '/utilisateurs')).json() as Utilisateur[]
    expect(liste.map((u) => [u.prenom, u.protege]).sort()).toEqual([['Libre', false], ['Protégé', true]])
  })

  it('connexion : mauvais mot de passe refusé ; bon mot de passe ouvre une session par cookie HttpOnly', async () => {
    const protege = await compteProtege()
    const mauvais = await connecter(protege.id, 'pas-le-bon')
    expect(mauvais.statusCode).toBe(401)
    expect(mauvais.json().erreur).toMatchObject({ code: 'IDENTIFIANTS_REFUSES', champs: { motDePasse: 'Mot de passe incorrect.' } })
    expect(mauvais.headers['set-cookie']).toBeUndefined()

    const bon = await connecter(protege.id)
    expect(bon.statusCode, bon.body).toBe(200)
    expect(String(bon.headers['set-cookie'])).toMatch(/HttpOnly; SameSite=Strict/)
    const cookie = cookieDe(bon)
    expect((await appeler('GET', '/reglages', { id: protege.id, cookie })).statusCode).toBe(200)
    expect((await appeler('POST', `/utilisateurs/${protege.id}/ouvrir`, { cookie })).statusCode).toBe(200)
    expect((await appeler('GET', `/utilisateurs/${protege.id}/export`, { cookie })).statusCode).toBe(200)
    // Le jeton n'est jamais stocké en clair.
    expect(await ctx.prisma.session.count({ where: { id: cookie.split('=')[1]! } })).toBe(0)
    expect(await ctx.prisma.session.count()).toBe(1)
  })

  it('la session d’un compte n’ouvre pas un autre compte protégé', async () => {
    const a = await compteProtege('A')
    const b = await compteProtege('B')
    const cookie = cookieDe(await connecter(a.id))
    expect((await appeler('GET', '/reglages', { id: b.id, cookie })).statusCode).toBe(401)
  })

  it('session expirée ou déconnexion : l’accès retombe', async () => {
    const protege = await compteProtege()
    const cookie = cookieDe(await connecter(protege.id))
    await ctx.prisma.session.updateMany({ data: { expireLe: new Date(Date.now() - 1000) } })
    expect((await appeler('GET', '/reglages', { id: protege.id, cookie })).statusCode).toBe(401)
    expect(await ctx.prisma.session.count()).toBe(0)

    const neuf = cookieDe(await connecter(protege.id))
    const sortie = await appeler('POST', '/deconnexion', { cookie: neuf })
    expect(sortie.statusCode).toBe(204)
    expect(String(sortie.headers['set-cookie'])).toContain('Max-Age=0')
    expect((await appeler('GET', '/reglages', { id: protege.id, cookie: neuf })).statusCode).toBe(401)
  })

  it('5 mauvais mots de passe bloquent les essais, même avec le bon', async () => {
    const protege = await compteProtege()
    for (let i = 0; i < 5; i++) expect((await connecter(protege.id, 'non-non-non')).statusCode).toBe(401)
    const bloque = await connecter(protege.id)
    expect(bloque.statusCode).toBe(429)
    expect(bloque.json().erreur.code).toBe('TROP_DE_TENTATIVES')
  })

  it('définir, changer et retirer le mot de passe', async () => {
    const libre = await creerCompte(ctx.app, 'Libre')
    expect((await appeler('PUT', `/utilisateurs/${libre.id}/mot-de-passe`, { payload: { nouveau: 'court' } })).statusCode).toBe(400)
    const defini = await appeler('PUT', `/utilisateurs/${libre.id}/mot-de-passe`, { payload: { nouveau: MOT } })
    expect(defini.statusCode, defini.body).toBe(200)
    expect(defini.json().protege).toBe(true)
    const cookie = cookieDe(defini)
    expect((await appeler('GET', '/reglages', { id: libre.id, cookie })).statusCode).toBe(200)
    expect((await appeler('GET', '/reglages', { id: libre.id })).statusCode).toBe(401)

    // Changer : session et ancien mot de passe exigés ; les autres sessions tombent.
    const autre = cookieDe(await connecter(libre.id))
    expect((await appeler('PUT', `/utilisateurs/${libre.id}/mot-de-passe`, { payload: { nouveau: 'nouveau-mot-de-passe' } })).statusCode).toBe(401)
    expect((await appeler('PUT', `/utilisateurs/${libre.id}/mot-de-passe`, { cookie, payload: { actuel: 'faux-faux', nouveau: 'nouveau-mot-de-passe' } })).statusCode).toBe(401)
    const change = await appeler('PUT', `/utilisateurs/${libre.id}/mot-de-passe`, { cookie, payload: { actuel: MOT, nouveau: 'nouveau-mot-de-passe' } })
    expect(change.statusCode, change.body).toBe(200)
    expect((await appeler('GET', '/reglages', { id: libre.id, cookie: autre })).statusCode).toBe(401)
    expect((await connecter(libre.id, MOT)).statusCode).toBe(401)
    const cookie2 = cookieDe(await connecter(libre.id, 'nouveau-mot-de-passe'))

    // Retirer : mot de passe exigé ; le compte redevient ouvert.
    expect((await appeler('POST', `/utilisateurs/${libre.id}/mot-de-passe/retrait`, { cookie: cookie2, payload: { motDePasse: 'faux-faux' } })).statusCode).toBe(401)
    const retire = await appeler('POST', `/utilisateurs/${libre.id}/mot-de-passe/retrait`, { cookie: cookie2, payload: { motDePasse: 'nouveau-mot-de-passe' } })
    expect(retire.json().protege).toBe(false)
    expect((await appeler('GET', '/reglages', { id: libre.id })).statusCode).toBe(200)
  })

  it('mot de passe trop court à la création ; supprimer le compte supprime ses sessions', async () => {
    expect((await appeler('POST', '/utilisateurs', { payload: { prenom: 'X', motDePasse: 'court' } })).statusCode).toBe(400)
    const protege = await compteProtege()
    const cookie = cookieDe(await connecter(protege.id))
    expect((await appeler('DELETE', `/utilisateurs/${protege.id}`, { cookie })).statusCode).toBe(204)
    expect(await ctx.prisma.session.count()).toBe(0)
  })
})

describe('serveur ouvert au réseau', () => {
  let app: Awaited<ReturnType<typeof construireApp>>
  const ouvrir = async () => (app ??= await construireApp({ prisma: ctx.prisma, reseau: true }))
  afterAll(async () => app?.close())

  it('création sans mot de passe, import et retrait du mot de passe refusés', async () => {
    const a = await ouvrir()
    const sans = await a.inject({ method: 'POST', url: url('/utilisateurs'), payload: { prenom: 'Sans' } })
    expect(sans.statusCode).toBe(400)
    expect(sans.json().erreur.champs.motDePasse).toBeDefined()
    const avec = await a.inject({ method: 'POST', url: url('/utilisateurs'), payload: { prenom: 'Avec', motDePasse: MOT } })
    expect(avec.statusCode).toBe(201)
    const id = avec.json().id as string
    const connexion = await a.inject({ method: 'POST', url: url(`/utilisateurs/${id}/connexion`), payload: { motDePasse: MOT } })
    const cookie = cookieDe(connexion)
    const retrait = await a.inject({ method: 'POST', url: url(`/utilisateurs/${id}/mot-de-passe/retrait`), headers: { cookie }, payload: { motDePasse: MOT } })
    expect(retrait.statusCode).toBe(422)
    const importe = await a.inject({ method: 'POST', url: url('/utilisateurs/import'), payload: { format: 'mysalary-export', version: 1, compte: { prenom: 'I', devise: 'MAD' }, donnees: {} } })
    expect(importe.statusCode).toBe(422)
  })
})
