import type { ExportCompte } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { cookieDe, creerCompte, MOT_DE_PASSE_TEST, pour, preparerApp, url } from './outils'

const ctx = preparerApp()
const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function categorie(id: string) {
  return ((await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]).find((c) => c.libelle === 'Logement')!.id
}

describe('compte connecté', () => {
  it('renommer ; changer de mot de passe exige l’actuel et ferme les autres sessions', async () => {
    const a = await creerCompte(ctx.app, 'A', 'a@exemple.test')
    expect((await appeler(a.id, 'PUT', '/compte', { prenom: ' Alice ' })).json()).toMatchObject({ prenom: 'Alice' })

    const autre = cookieDe(await ctx.app.inject({ method: 'POST', url: url('/auth/connexion'), payload: { email: 'a@exemple.test', motDePasse: MOT_DE_PASSE_TEST } }))
    const faux = await appeler(a.id, 'PUT', '/compte/mot-de-passe', { actuel: 'pas-le-bon', nouveau: 'nouveau-mot-de-passe' })
    expect(faux.statusCode).toBe(401)
    expect(faux.json().erreur.champs.motDePasse).toBe('Mot de passe incorrect.')
    const change = await appeler(a.id, 'PUT', '/compte/mot-de-passe', { actuel: MOT_DE_PASSE_TEST, nouveau: 'nouveau-mot-de-passe' })
    expect(change.statusCode).toBe(204)
    expect((await ctx.app.inject({ method: 'GET', url: url('/reglages'), headers: { cookie: autre } })).statusCode).toBe(401)
    expect((await ctx.app.inject({ method: 'GET', url: url('/reglages'), headers: { cookie: cookieDe(change) } })).statusCode).toBe(200)
  })

  it('suppression : mot de passe exigé ; tout part avec le compte, les autres comptes ne bougent pas', async () => {
    const a = await creerCompte(ctx.app, 'A')
    const b = await creerCompte(ctx.app, 'B')
    await appeler(a.id, 'POST', '/charges', { libelle: 'Loyer', categorieId: await categorie(a.id), nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-10' })
    await appeler(b.id, 'POST', '/charges', { libelle: 'Loyer', categorieId: await categorie(b.id), nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-10' })
    expect((await appeler(a.id, 'POST', '/compte/suppression', { motDePasse: 'faux-faux' })).statusCode).toBe(401)
    const r = await appeler(a.id, 'POST', '/compte/suppression', { motDePasse: MOT_DE_PASSE_TEST })
    expect(r.statusCode).toBe(204)
    expect(await ctx.prisma.utilisateur.count({ where: { id: a.id } })).toBe(0)
    expect(await ctx.prisma.charge.count({ where: { utilisateurId: a.id } })).toBe(0)
    expect(await ctx.prisma.session.count({ where: { utilisateurId: a.id } })).toBe(0)
    expect(await ctx.prisma.charge.count({ where: { utilisateurId: b.id } })).toBe(1)
  })

  it('export puis restauration dans un compte vide ; refusée si le compte a des données ; réinitialisation avec le mot de passe', async () => {
    const a = await creerCompte(ctx.app, 'A')
    await appeler(a.id, 'POST', '/charges', { libelle: 'Loyer', categorieId: await categorie(a.id), nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-10' })
    const fichier = (await appeler(a.id, 'GET', '/compte/export')).json() as ExportCompte
    expect(fichier).toMatchObject({ format: 'mysalary-export', compte: { prenom: 'A' } })
    expect(JSON.stringify(fichier)).not.toContain(a.id)

    const plein = await appeler(a.id, 'POST', '/compte/restauration', fichier)
    expect(plein.statusCode).toBe(409)

    const b = await creerCompte(ctx.app, 'B')
    await categorie(b.id) // catégories par défaut créées : le compte reste « vide »
    const restaure = await appeler(b.id, 'POST', '/compte/restauration', fichier)
    expect(restaure.statusCode, restaure.body).toBe(200)
    expect(restaure.json()).toMatchObject({ utilisateur: { id: b.id, prenom: 'B', onboardingTermine: true } })
    expect(((await appeler(b.id, 'GET', '/charges')).json() as { libelle: string }[]).map((c) => c.libelle)).toEqual(['Loyer'])

    expect((await appeler(a.id, 'POST', '/compte/reinitialisation', { motDePasse: 'faux-faux' })).statusCode).toBe(401)
    const vide = await appeler(a.id, 'POST', '/compte/reinitialisation', { motDePasse: MOT_DE_PASSE_TEST })
    expect(vide.json()).toMatchObject({ onboardingEtape: 0, onboardingTermine: false })
    expect(await ctx.prisma.charge.count({ where: { utilisateurId: a.id } })).toBe(0)
    expect(await ctx.prisma.charge.count({ where: { utilisateurId: b.id } })).toBe(1)
    // Le compte réinitialisé garde sa connexion.
    expect((await appeler(a.id, 'GET', '/auth/session')).json()).toMatchObject({ id: a.id })
  })
})

describe('isolation entre comptes par identifiant', () => {
  it('B ne lit, ne modifie ni ne supprime une donnée de A en connaissant son identifiant', async () => {
    const a = await creerCompte(ctx.app, 'A')
    const b = await creerCompte(ctx.app, 'B')
    const charge = (await appeler(a.id, 'POST', '/charges', { libelle: 'Loyer', categorieId: await categorie(a.id), nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-10' })).json() as { id: string }
    const objectif = (await appeler(a.id, 'POST', '/objectifs', { libelle: 'Moto', montantCible: 8_300_000 })).json() as { id: string }

    expect((await appeler(b.id, 'GET', `/objectifs/${objectif.id}`)).statusCode).toBe(404)
    expect((await appeler(b.id, 'PUT', `/charges/${charge.id}`, { libelle: 'Volé', categorieId: await categorie(b.id), nature: 'fixe', montant: 1, jour: 1, debut: '2026-10' })).statusCode).toBe(404)
    expect((await appeler(b.id, 'DELETE', `/charges/${charge.id}`)).statusCode).toBe(404)
    expect((await appeler(b.id, 'DELETE', `/objectifs/${objectif.id}`)).statusCode).toBe(404)
    expect(((await appeler(b.id, 'GET', '/charges')).json() as unknown[]).length).toBe(0)
    expect(await ctx.prisma.charge.findUniqueOrThrow({ where: { id: charge.id } })).toMatchObject({ libelle: 'Loyer', montant: 350_000 })
    expect(await ctx.prisma.objectif.count({ where: { id: objectif.id } })).toBe(1)
    // Les routes du compte n'existent plus par identifiant : impossible de viser le compte de A.
    expect((await appeler(b.id, 'GET', `/utilisateurs/${a.id}/export`)).statusCode).toBe(404)
  })
})
