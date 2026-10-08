import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function compte(prenom = 'A') {
  const c = await creerCompte(ctx.app, prenom)
  await appeler(c.id, 'POST', '/salaire/contrats', CONTRAT)
  const categories = (await appeler(c.id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  const cat = (libelle: string) => categories.find((x) => x.libelle === libelle)!.id
  return { c, cat }
}

async function creer(id: string, chemin: string, saisie: object) {
  const r = await appeler(id, 'POST', chemin, saisie)
  expect(r.statusCode, r.body).toBe(201)
  return r.json().id as string
}

describe('catégories', () => {
  it('crée les catégories par défaut au premier usage', async () => {
    const c = await creerCompte(ctx.app, 'A')
    const liste = (await appeler(c.id, 'GET', '/categories')).json()
    expect(liste.length).toBe(13)
    expect(liste[0]).toMatchObject({ libelle: 'Logement', groupe: 'essentiel', utilisee: false })
  })

  it('refuse un doublon et la suppression d’une catégorie utilisée', async () => {
    const { c, cat } = await compte()
    expect((await appeler(c.id, 'POST', '/categories', { libelle: 'Logement', groupe: 'essentiel' })).statusCode).toBe(409)
    await creer(c.id, '/charges', { libelle: 'Loyer', categorieId: cat('Logement'), nature: 'fixe', montant: 300_000, jour: 1, debut: '2027-01' })
    const refus = await appeler(c.id, 'DELETE', `/categories/${cat('Logement')}`)
    expect(refus.statusCode).toBe(422)
    expect(refus.json().erreur.message).toContain('utilisée par 1 élément')
    expect((await appeler(c.id, 'DELETE', `/categories/${cat('Sport')}`)).statusCode).toBe(204)
  })
})

describe('charges du mois', () => {
  it('résume le mois en cours par type et par groupe', async () => {
    const { c, cat } = await compte()
    ctx.jour = '2027-02-01'
    await creer(c.id, '/charges', { libelle: 'Téléphone', categorieId: cat('Télécom & internet'), nature: 'fixe', montant: 10_000, jour: 5, debut: '2027-01', essentielle: true })
    await creer(c.id, '/charges', { libelle: 'Nourriture', categorieId: cat('Alimentation'), nature: 'enveloppe', montant: 150_000, debut: '2027-01' })
    await creer(c.id, '/charges', { libelle: 'Sorties', categorieId: cat('Loisirs'), nature: 'enveloppe', montant: 50_000, debut: '2027-01' })
    await creer(c.id, '/ponctuels', { libelle: 'Assurance', categorieId: cat('Assurances'), montant: 55_000, date: '2027-02-15' })
    await creer(c.id, '/dettes', { libelle: 'Prêt', creancier: 'Mohamed', montantTotal: 850_000, mensualite: 200_000, premiereEcheance: '2027-02-10' })

    const resume = (await appeler(c.id, 'GET', '/charges/resume')).json()
    expect(resume.mois).toMatchObject({ cle: '2027-02', debut: '2027-01-27', fin: '2027-02-26' })
    expect(resume.duMois.totaux).toEqual({ fixe: 10_000, enveloppe: 200_000, ponctuel: 55_000, dette: 200_000, total: 465_000 })
    expect(resume.parGroupe).toEqual({ essentiel: 215_000, flexible: 50_000, engagement: 200_000 })
    expect(resume.equivalentMensuel).toEqual({ fixe: 10_000, enveloppe: 200_000, essentiel: 10_000 })
    expect(resume.prochaines.map((l: { libelle: string }) => l.libelle)).toEqual(['Téléphone', 'Prêt', 'Assurance', 'Téléphone', 'Prêt'])
    expect(resume.detteRestante).toBe(850_000)

    const [telephone] = (await appeler(c.id, 'GET', '/charges')).json()
    expect(telephone).toMatchObject({ prochaineDate: '2027-02-05', equivalentMensuel: 10_000, active: true })
    const [assurance] = (await appeler(c.id, 'GET', '/ponctuels')).json()
    expect(assurance).toMatchObject({ moisBudget: '2027-02', passe: false })
  })

  it('refuse une catégorie d’un autre compte', async () => {
    const { c } = await compte('A')
    const { cat: catB } = await compte('B')
    const r = await appeler(c.id, 'POST', '/charges', { libelle: 'X', categorieId: catB('Logement'), nature: 'enveloppe', montant: 1, debut: '2027-01' })
    expect(r.statusCode).toBe(422)
    expect(r.json().erreur.champs).toHaveProperty('categorieId')
  })
})

describe('dettes', () => {
  it('note des paiements, refuse un dépassement, puis solde la dette', async () => {
    const { c } = await compte()
    ctx.jour = '2027-03-01'
    const id = await creer(c.id, '/dettes', { libelle: 'Prêt', montantTotal: 850_000, mensualite: 200_000, premiereEcheance: '2027-01-31' })

    await creer(c.id, `/dettes/${id}/paiements`, { date: '2027-01-31', montant: 300_000 })
    let [dette] = (await appeler(c.id, 'GET', '/dettes')).json()
    expect(dette.etat).toMatchObject({ paye: 300_000, restant: 550_000, soldee: false })
    expect(dette.etat.echeances[1]).toMatchObject({ statut: 'partielle', attendu: 100_000 })

    const trop = await appeler(c.id, 'POST', `/dettes/${id}/paiements`, { date: '2027-02-28', montant: 600_000 })
    expect(trop.statusCode).toBe(422)
    expect(trop.json().erreur.message).toBe('Ce paiement dépasse le reste dû (5 500 DH).')
    expect((await appeler(c.id, 'POST', `/dettes/${id}/paiements`, { date: '2027-03-02', montant: 1 })).statusCode).toBe(422)

    await creer(c.id, `/dettes/${id}/paiements`, { date: '2027-02-28', montant: 550_000 })
    ;[dette] = (await appeler(c.id, 'GET', '/dettes')).json()
    expect(dette.etat).toMatchObject({ restant: 0, soldee: true, prochaine: null })
    expect((await appeler(c.id, 'GET', '/mois/2027-04')).statusCode).toBe(200)
    expect((await appeler(c.id, 'GET', '/charges/resume')).json().detteRestante).toBe(0)

    // Le total ne peut pas descendre sous ce qui est déjà remboursé.
    const reduit = await appeler(c.id, 'PUT', `/dettes/${id}`, { libelle: 'Prêt', montantTotal: 100, mensualite: 100, premiereEcheance: '2027-01-31' })
    expect(reduit.statusCode).toBe(422)
  })
})

describe('isolation des charges', () => {
  it('B ne voit ni ne touche les charges et dettes de A', async () => {
    const { c: a, cat } = await compte('A')
    const { c: b } = await compte('B')
    const charge = await creer(a.id, '/charges', { libelle: 'Loyer', categorieId: cat('Logement'), nature: 'fixe', montant: 1, jour: 1, debut: '2027-01' })
    const dette = await creer(a.id, '/dettes', { libelle: 'Prêt', montantTotal: 10, mensualite: 5, premiereEcheance: '2027-01-31' })

    expect((await appeler(b.id, 'GET', '/charges')).json()).toEqual([])
    expect((await appeler(b.id, 'GET', '/dettes')).json()).toEqual([])
    expect((await appeler(b.id, 'DELETE', `/charges/${charge}`)).statusCode).toBe(404)
    expect((await appeler(b.id, 'POST', `/dettes/${dette}/paiements`, { date: '2026-10-01', montant: 1 })).statusCode).toBe(404)
    expect((await appeler(b.id, 'DELETE', `/categories/${cat('Logement')}`)).statusCode).toBe(404)
  })
})
