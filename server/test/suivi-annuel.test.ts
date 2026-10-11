import type { SuiviAnnuelDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

// Paie le 27 qui finance le mois suivant : « janvier 2027 » va du dim. 27 déc. au mar. 26 janv.
const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function ok(id: string, method: 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) {
  const r = await appeler(id, method, chemin, payload)
  expect(r.statusCode, r.body).toBeLessThan(300)
  return r.statusCode === 204 ? null : r.json()
}

async function compte(prenom = 'A') {
  const { id } = await creerCompte(ctx.app, prenom)
  await ok(id, 'POST', '/salaire/contrats', CONTRAT)
  const categories = (await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  const cat = (libelle: string) => categories.find((x) => x.libelle === libelle)!.id
  ctx.jour = '2027-01-10'
  await ok(id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
  const loyer = (await ok(id, 'POST', '/charges', { libelle: 'Loyer', categorieId: cat('Logement'), nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-11' })).id
  await ok(id, 'POST', '/charges', { libelle: 'Internet', categorieId: cat('Télécom & internet'), nature: 'fixe', montant: 30_000, jour: 8, debut: '2026-11' })
  await ok(id, 'POST', '/depenses', { date: '2027-01-05', montant: 350_000, categorieId: cat('Logement'), chargeId: loyer, echeance: '2027-01-05' })
  return { id, cat }
}

const suivi = async (id: string, an: number | string = 2027) => {
  const r = await appeler(id, 'GET', `/annee/${an}/suivi`)
  expect(r.statusCode, r.body).toBe(200)
  return r.json() as SuiviAnnuelDto
}

describe('suivi annuel', () => {
  it('douze mois, réel et projeté séparés, mois coûteux, objectif', async () => {
    const { id } = await compte()
    await ok(id, 'POST', '/objectifs', { libelle: 'Moto', type: 'moto', montantCible: 3_000_000, montantInitial: 100_000, dateCible: '2027-12', versementMensuel: 100_000 })
    const a = await suivi(id)
    expect(a).toMatchObject({ aujourdhui: '2027-01-10', annee: 2027, etat: 'enCours', sansDonnees: 0 })
    expect(a.mois).toHaveLength(12)
    expect(a.mois[0]).toMatchObject({ cle: '2027-01', nature: 'enCours', reel: { revenus: 1_000_000, charges: 350_000 } })
    expect(a.mois[1]).toMatchObject({ nature: 'prevu', reel: { revenus: 0, charges: 0, epargne: 0 } })
    expect(a.revenus.reel).toBe(1_000_000)
    expect(a.revenus.total).toBe(a.revenus.reel + a.revenus.projete)
    expect(a.charges.reel).toBe(350_000)
    expect(a.couteux).toHaveLength(3)
    expect(a.couteux[0]!.charges).toBeGreaterThanOrEqual(a.couteux[1]!.charges)
    expect(a.objectifs).toEqual([expect.objectContaining({ libelle: 'Moto', montantCible: 3_000_000, debut: 100_000, reelADate: 100_000, atteint: false })])
    expect(a.objectifs[0]!.finProjetee).toBeGreaterThan(100_000)
  })

  it('année passée et à venir, clé invalide, comptes isolés', async () => {
    const a = await compte('A')
    const b = await compte('B')
    await ok(a.id, 'POST', '/objectifs', { libelle: 'Moto', type: 'moto', montantCible: 3_000_000, montantInitial: 0, dateCible: null, versementMensuel: null })
    expect((await suivi(b.id)).objectifs).toEqual([])
    expect(await suivi(a.id, 2026)).toMatchObject({ etat: 'passee', sansDonnees: 12 })
    expect(await suivi(a.id, 2028)).toMatchObject({ etat: 'future', revenus: { reel: 0 } })
    expect((await appeler(a.id, 'GET', '/annee/1/suivi')).statusCode).toBe(400)
  })
})
