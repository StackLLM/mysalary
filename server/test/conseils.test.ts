import type { ConseilsDto, IndicateursDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

// Salaire 10 000 DH le 27, qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv. Aujourd'hui : 10 janv.
const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }

const appeler = (id: string, method: 'GET' | 'POST', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function ok(id: string, chemin: string, payload: object) {
  const r = await appeler(id, 'POST', chemin, payload)
  expect(r.statusCode, r.body).toBeLessThan(300)
  return r.statusCode === 204 ? null : r.json()
}
const lire = async <T,>(id: string, chemin: string) => (await appeler(id, 'GET', chemin)).json() as T

/** Loyer payé, internet (8 janv.) pas payé, courses dépassées ; moto 85 000 DH pour décembre ; 10 000 DH d'épargne. */
async function compte(prenom = 'A') {
  const { id } = await creerCompte(ctx.app, prenom)
  await ok(id, '/salaire/contrats', CONTRAT)
  const categories = (await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  const cat = (l: string) => categories.find((c) => c.libelle === l)!.id
  const loyer = (await ok(id, '/charges', { libelle: 'Loyer', categorieId: cat('Logement'), nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-11', essentielle: true })).id
  await ok(id, '/charges', { libelle: 'Internet', categorieId: cat('Logement'), nature: 'fixe', montant: 30_000, jour: 8, debut: '2026-11' })
  const courses = (await ok(id, '/charges', { libelle: 'Courses', categorieId: cat('Alimentation'), nature: 'enveloppe', montant: 200_000, debut: '2026-11', essentielle: true })).id
  ctx.jour = '2027-01-10'
  await ok(id, '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
  await ok(id, '/depenses', { date: '2027-01-05', montant: 350_000, categorieId: cat('Logement'), chargeId: loyer, echeance: '2027-01-05' })
  await ok(id, '/depenses', { date: '2027-01-06', montant: 230_000, categorieId: cat('Alimentation'), chargeId: courses })
  await ok(id, '/epargne/comptes', { libelle: 'CIH', solde: 1_000_000, auLe: '2027-01-01' })
  const moto = (await ok(id, '/objectifs', { libelle: 'Moto', type: 'moto', montantCible: 8_500_000, montantInitial: 200_000, dateCible: '2027-12' })).id as string
  return { id, moto }
}

describe('indicateurs (Plan.md § 8)', () => {
  it('mois en cours par défaut ; reste à dépenser, taux, écart, part variable, objectif prioritaire', async () => {
    const { id, moto } = await compte()
    const k = await lire<IndicateursDto>(id, '/indicateurs')
    expect(k.mois.cle).toBe('2027-01')
    // 10 000 − (3 500 + 2 300) − 300 (internet à payer) = 3 900 DH, sur 17 jours.
    expect(k.resteADepenser).toMatchObject({ montant: 390_000, nature: 'reel', engagements: 30_000, joursRestants: 17 })
    expect(k.tauxCharges).toMatchObject({ reel: 0.58, prevu: 0.58 })
    expect(k.ecart).toMatchObject({ base: 'aDate', reel: 580_000 })
    expect(k.partVariable).toMatchObject({ part: 0, du: '2027-01', au: '2027-12' })
    expect(k.objectif).toMatchObject({ id: moto, dateCible: '2027-12' })
    expect((await lire<IndicateursDto>(id, '/indicateurs?mois=2026-12')).resteADepenser).toBeNull()
    expect((await appeler(id, 'GET', '/indicateurs?mois=janvier')).statusCode).toBe(400)
  })
})

describe('recommandations et alertes', () => {
  it('alertes rédigées avec leur action ; recommandations avec base, condition et confiance', async () => {
    const { id, moto } = await compte()
    const c = await lire<ConseilsDto>(id, '/recommandations')
    expect(c.alertes.map((a) => [a.type, a.titre.replace(/\s+/g, ' ')])).toEqual([
      ['echeanceEnRetard', '« Internet » pas encore payé'],
      ['enveloppeDepassee', 'Enveloppe « Courses » dépassée'],
      ['semaineDepassee', 'Budget de la semaine dépassé'],
    ])
    expect(c.alertes[0]!.action).toEqual({ libelle: 'Ouvrir le mois', chemin: '/mois?mois=2027-01' })
    const effort = c.recommandations.find((r) => r.type === 'effort')!
    expect(effort).toMatchObject({ objectifId: moto, confiance: 'elevee', condition: 'Si tes revenus et tes dépenses restent conformes au plan.' })
    expect(effort.message.replace(/\s+/g, ' ')).toMatch(/^Pour avoir « Moto » en décembre 2027, il faudrait environ 6 917 DH par mois/)
    // Charges essentielles : loyer 3 500 + courses 2 000 → fonds de 3 mois = 16 500 DH.
    expect(c.recommandations.find((r) => r.type === 'fondsSecurite')).toMatchObject({ cible: 1_650_000 })
  })

  it('isolées par compte : un autre compte ne voit rien', async () => {
    await compte('A')
    const { id } = await creerCompte(ctx.app, 'B')
    ctx.jour = '2027-01-10'
    expect(await lire<ConseilsDto>(id, '/recommandations')).toEqual({ aujourdhui: '2027-01-10', alertes: [], recommandations: [] })
  })
})
