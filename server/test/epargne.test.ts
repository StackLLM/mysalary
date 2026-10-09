import type { BilanDto, EpargneDto, ObjectifDetailDto, ObjectifsDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

// Salaire 10 000 DH le 27, qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv.
const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function ok(id: string, method: 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) {
  const r = await appeler(id, method, chemin, payload)
  expect(r.statusCode, r.body).toBeLessThan(300)
  return r.statusCode === 204 ? null : r.json()
}
const lire = async <T,>(id: string, chemin: string) => {
  const r = await appeler(id, 'GET', chemin)
  expect(r.statusCode, r.body).toBe(200)
  return r.json() as T
}

/** Compte d'épargne de 5 000 DH au 1er janvier ; moto (85 000 DH, 2 000 DH déjà de côté) et permis ; 1 000 DH versés à la moto le 5. */
async function compte(prenom = 'A') {
  const { id } = await creerCompte(ctx.app, prenom)
  await ok(id, 'POST', '/salaire/contrats', CONTRAT)
  const categories = (await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  await ok(id, 'POST', '/charges', { libelle: 'Loyer', categorieId: categories.find((c) => c.libelle === 'Logement')!.id, nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-11', essentielle: true })
  ctx.jour = '2027-01-10'
  await ok(id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
  const cih = (await ok(id, 'POST', '/epargne/comptes', { libelle: 'Compte épargne', solde: 500_000, auLe: '2027-01-01' })).id as string
  const moto = (await ok(id, 'POST', '/objectifs', { libelle: 'Moto', type: 'moto', montantCible: 8_500_000, montantInitial: 200_000, dateCible: '2027-12' })).id as string
  const permis = (await ok(id, 'POST', '/objectifs', { libelle: 'Permis', montantCible: 300_000, dateCible: '2027-03', versementMensuel: 100_000 })).id as string
  await ok(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, objectifId: moto, date: '2027-01-05', montant: 100_000 })
  return { id, cih, moto, permis }
}

describe('épargne', () => {
  it('solde déclaré + mouvements, réservé, disponible ; le versement prend le nom de l’objectif', async () => {
    const { id } = await compte()
    const e = await lire<EpargneDto>(id, '/epargne')
    expect(e.etat).toMatchObject({ solde: 600_000, reserve: 300_000, disponible: 300_000, depassement: 0 })
    expect(e.mouvements.map((m) => [m.libelle, m.montant, m.objectif, m.compte])).toEqual([['Moto', 100_000, 'Moto', 'Compte épargne']])
    expect(e.objectifs.map((o) => o.libelle)).toEqual(['Moto', 'Permis'])
  })

  it('refuse une date future, un retrait plus grand que l’épargné, un compte qui a des mouvements', async () => {
    const { id, cih, moto } = await compte()
    expect((await appeler(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, date: '2027-01-11', montant: 1_000 })).statusCode).toBe(422)
    const retrait = await appeler(id, 'POST', '/epargne/mouvements', { sens: 'retrait', compteId: cih, objectifId: moto, date: '2027-01-10', montant: 400_000 })
    expect(retrait.statusCode).toBe(422)
    expect(retrait.json().erreur.message).toMatch(/n’a que 3\s000\sDH d’épargné/)
    expect((await appeler(id, 'DELETE', `/epargne/comptes/${cih}`)).statusCode).toBe(422)
  })

  it('déclarer un nouveau solde remplace l’ancien à partir de sa date', async () => {
    const { id, cih } = await compte()
    await ok(id, 'PUT', `/epargne/comptes/${cih}`, { libelle: 'CIH', solde: 700_000, auLe: '2027-01-08' })
    expect((await lire<EpargneDto>(id, '/epargne')).etat.solde).toBe(700_000)
  })
})

describe('objectifs', () => {
  it('liste : projections par scénario, risque, fonds de sécurité proposé', async () => {
    const { id } = await compte()
    const o = await lire<ObjectifsDto>(id, '/objectifs')
    const moto = o.objectifs.find((x) => x.libelle === 'Moto')!
    expect(moto).toMatchObject({ priorite: 1, epargne: 300_000, restant: 8_200_000, effortMensuel: 691_667, risque: 'horsPortee' })
    expect(moto.estimations).toEqual({ prudent: '2028-02', realiste: '2028-02', ambitieux: '2028-02' })
    expect(o.objectifs.find((x) => x.libelle === 'Permis')!.risque).toBe('sur')
    expect(o.fondsSecurite).toEqual({ min: 1_050_000, max: 2_100_000, base: 350_000 })
    expect(o.comptes.map((c) => c.libelle)).toEqual(['Compte épargne'])
  })

  it('aperçu : projection sans rien écrire', async () => {
    const { id } = await compte()
    const a = await ok(id, 'POST', '/objectifs/apercu', { libelle: 'Voyage', montantCible: 1_000_000 })
    expect(a.objectif).toMatchObject({ id: 'apercu', priorite: 3, restant: 1_000_000 })
    expect(a.objectif.estimations.realiste).toMatch(/^\d{4}-\d{2}$/)
    expect((await lire<ObjectifsDto>(id, '/objectifs')).objectifs).toHaveLength(2)
  })

  it('ordre de priorité : complet, sinon refusé', async () => {
    const { id, moto, permis } = await compte()
    await ok(id, 'PUT', '/objectifs/ordre', { ids: [permis, moto] })
    expect((await lire<ObjectifsDto>(id, '/objectifs')).objectifs.map((o) => o.libelle)).toEqual(['Permis', 'Moto'])
    expect((await appeler(id, 'PUT', '/objectifs/ordre', { ids: [moto] })).statusCode).toBe(422)
  })

  it('achat réalisé (R19) : l’épargné sort du compte, aucune dépense ; annulable', async () => {
    const { id, cih, moto } = await compte()
    await ok(id, 'POST', `/objectifs/${moto}/realiser`, { date: '2027-01-09', compteId: cih })
    const e = await lire<EpargneDto>(id, '/epargne')
    expect(e.etat).toMatchObject({ solde: 300_000, reserve: 0, disponible: 300_000 })
    const achat = e.mouvements.find((m) => m.type === 'achat')!
    expect(achat).toMatchObject({ montant: -300_000, libelle: 'Achat : Moto' })
    expect(((await lire<{ depenses: unknown[] }>(id, '/depenses')).depenses)).toHaveLength(0)
    expect((await appeler(id, 'DELETE', `/epargne/mouvements/${achat.id}`)).statusCode).toBe(422)
    expect((await appeler(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, objectifId: moto, date: '2027-01-10', montant: 1_000 })).statusCode).toBe(422)

    await ok(id, 'POST', `/objectifs/${moto}/statut`, { statut: 'actif' })
    const detail = await lire<ObjectifDetailDto>(id, `/objectifs/${moto}`)
    expect(detail.objectif).toMatchObject({ statut: 'actif', realiseLe: null, epargne: 300_000 })
    expect((await lire<EpargneDto>(id, '/epargne')).etat.solde).toBe(600_000)
  })

  it('détail : trajectoire et versements ; le bilan du mois montre l’épargne hors des charges', async () => {
    const { id, moto } = await compte()
    const d = await lire<ObjectifDetailDto>(id, `/objectifs/${moto}`)
    expect(d.trajectoire.find((p) => p.aujourdhui)).toMatchObject({ mois: '2027-01', reel: 300_000, projete: 300_000 })
    expect(d.versements.map((v) => v.montant)).toEqual([100_000])
    const b = await lire<BilanDto>(id, '/mois/2027-01/bilan')
    expect(b.lignes.filter((l) => l.famille === 'epargne').map((l) => [l.libelle, l.prevu, l.reel])).toEqual([
      ['Moto', null, 100_000],
      ['Permis', 100_000, 0],
    ])
    expect(b.epargne).toEqual({ prevue: 100_000, reelle: 100_000 })
  })

  it('isole les comptes', async () => {
    const a = await compte('A')
    const b = await compte('B')
    expect((await appeler(b.id, 'GET', `/objectifs/${a.moto}`)).statusCode).toBe(404)
    expect((await appeler(b.id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: a.cih, date: '2027-01-10', montant: 1_000 })).statusCode).toBe(404)
    expect((await appeler(b.id, 'PUT', '/objectifs/ordre', { ids: [a.moto, a.permis] })).statusCode).toBe(422)
  })
})
