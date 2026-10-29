import type { AnneeDto, BilanDto, CumulDto, Reglages } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

// Salaire 10 000 DH le 27, qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv. Aujourd'hui : 10 janv.
const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function ok(id: string, method: 'POST' | 'PUT', chemin: string, payload: object) {
  const r = await appeler(id, method, chemin, payload)
  expect(r.statusCode, r.body).toBeLessThan(300)
  return r.statusCode === 204 ? null : r.json()
}
const lire = async <T,>(id: string, chemin: string) => (await appeler(id, 'GET', chemin)).json() as T

/** Paie de janvier reçue, loyer 3 500 DH payé le 5 janv. */
async function compte(prenom = 'A') {
  const { id } = await creerCompte(ctx.app, prenom)
  await ok(id, 'POST', '/salaire/contrats', { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' })
  const categories = (await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  const logement = categories.find((c) => c.libelle === 'Logement')!.id
  const loyer = (await ok(id, 'POST', '/charges', { libelle: 'Loyer', categorieId: logement, nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-11' })).id
  ctx.jour = '2027-01-10'
  await ok(id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
  await ok(id, 'POST', '/depenses', { date: '2027-01-05', montant: 350_000, categorieId: logement, chargeId: loyer, echeance: '2027-01-05' })
  return id
}

describe('cumul de mois en mois (lot 13)', () => {
  it('le reste de janvier passe sur février, puis sur mars ; rien avant le premier mois suivi', async () => {
    const id = await compte()
    const c = await lire<CumulDto>(id, '/cumul?du=2026-12&au=2027-03')
    expect(c).toMatchObject({ debut: '2027-01', depart: null })
    expect(c.mois.map((m) => [m.cle, m.nature, m.report, m.cumul])).toEqual([
      ['2026-12', 'avant', null, null],
      ['2027-01', 'enCours', 0, 650_000],
      ['2027-02', 'prevu', 650_000, 1_300_000],
      ['2027-03', 'prevu', 1_300_000, 1_950_000],
    ])
    expect(c.resume).toMatchObject({ revenus: 3_000_000, charges: 1_050_000, cumulFin: 1_950_000, plusBas: { cle: '2027-01', cumul: 650_000 }, negatifs: [] })
    expect((await lire<BilanDto>(id, '/mois/2027-02/bilan')).cumul).toMatchObject({ report: 650_000, cumul: 1_300_000 })
  })

  it('solde de départ déclaré dans les Réglages : il devient le report du premier mois', async () => {
    const id = await compte()
    const r = (await ok(id, 'PUT', '/reglages', { depart: { mois: '2027-01', solde: 200_000 } })) as Reglages
    expect(r.depart).toEqual({ mois: '2027-01', solde: 200_000 })
    expect((await lire<CumulDto>(id, '/cumul?du=2027-01&au=2027-01')).mois[0]).toMatchObject({ report: 200_000, cumul: 850_000 })
    expect(((await ok(id, 'PUT', '/reglages', { depart: null })) as Reglages).depart).toBeNull()
  })

  it('calendrier de l’année : 12 mois, reste après charges, revenus et charges datés de chaque mois', async () => {
    const id = await compte()
    const a = await lire<AnneeDto>(id, '/annee/2027')
    expect(a).toMatchObject({ annee: 2027, debutSemaine: 1, debut: '2027-01' })
    expect(a.mois.map((m) => m.cle)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m) => `2027-${m}`))
    expect(a.mois[0]).toMatchObject({ revenus: 1_000_000, charges: 350_000, apresCharges: 650_000, cumul: 650_000 })
    expect(a.evenements['2027-01']!.map((e) => [e.date, e.type, e.libelle])).toEqual([
      ['2026-12-27', 'revenu', 'Salaire'],
      ['2027-01-05', 'charge', 'Loyer'],
    ])
    expect(a.resume.cumulFin).toBe(a.mois[11]!.cumul)
    expect((await appeler(id, 'GET', '/annee/deux-mille')).statusCode).toBe(400)
    expect((await appeler(id, 'GET', '/annee/1990')).statusCode).toBe(400)
  })

  it('refuse une plage à l’envers ou trop longue', async () => {
    const id = await compte()
    expect((await appeler(id, 'GET', '/cumul?du=2027-03&au=2027-01')).statusCode).toBe(400)
    expect((await appeler(id, 'GET', '/cumul?du=2027-01&au=2030-01')).statusCode).toBe(400)
    expect((await appeler(id, 'GET', '/cumul')).statusCode).toBe(400)
  })
})

describe('correction du cumul en fin de mois (lot 35)', () => {
  // Janvier 2027 (27 déc. → 26 janv.) se termine à l'arrivée de la paie de février, le 27 janv. : cumul calculé 6 500 DH.
  async function janvierTermine() {
    const id = await compte()
    ctx.jour = '2027-02-01'
    await ok(id, 'POST', '/salaire/paies/2027-02/reception', { dateReelle: '2027-01-27', salaireRecu: 1_000_000 })
    return id
  }

  it('le solde réel remplace le cumul de janvier, l’écart reste visible, février part du solde réel', async () => {
    const id = await janvierTermine()
    expect((await appeler(id, 'PUT', '/mois/2027-01/cumul', { solde: 520_000 })).statusCode).toBe(204)
    const c = await lire<CumulDto>(id, '/cumul?du=2027-01&au=2027-02')
    expect(c.mois[0]).toMatchObject({ nature: 'reel', charges: 350_000, reste: 650_000, cumulCalcule: 650_000, ecart: -130_000, cumul: 520_000 })
    expect(c.mois[1]).toMatchObject({ report: 520_000, ecart: null })
    expect((await lire<BilanDto>(id, '/mois/2027-01/bilan')).cumul).toMatchObject({ cumul: 520_000, ecart: -130_000 })
    expect((await lire<AnneeDto>(id, '/annee/2027')).mois[1]).toMatchObject({ report: 520_000 })

    // Une nouvelle saisie remplace la précédente ; l'annulation rend le cumul calculé.
    await ok(id, 'PUT', '/mois/2027-01/cumul', { solde: 600_000 })
    expect((await lire<CumulDto>(id, '/cumul?du=2027-01&au=2027-01')).mois[0]).toMatchObject({ cumul: 600_000, ecart: -50_000 })
    expect((await appeler(id, 'DELETE', '/mois/2027-01/cumul')).statusCode).toBe(204)
    expect((await lire<CumulDto>(id, '/cumul?du=2027-01&au=2027-01')).mois[0]).toMatchObject({ cumul: 650_000, ecart: null })
    expect((await appeler(id, 'DELETE', '/mois/2027-01/cumul')).statusCode).toBe(404)
  })

  it('refuse un mois en cours, à venir, ou d’avant le suivi', async () => {
    const id = await janvierTermine()
    const refus = async (cle: string) => (await appeler(id, 'PUT', `/mois/${cle}/cumul`, { solde: 0 })).json().erreur.message
    expect(await refus('2027-02')).toBe('Février 2027 n’est pas terminé : son solde de fin se corrige après sa dernière journée.')
    expect(await refus('2027-05')).toMatch(/n’est pas terminé/)
    expect(await refus('2026-12')).toBe('Décembre 2026 précède le début de ton suivi : il n’a pas de cumul à corriger.')
    expect((await appeler(id, 'PUT', '/mois/2027-01/cumul', { solde: 12.5 })).statusCode).toBe(400)
  })

  it('un solde négatif (découvert) est accepté', async () => {
    const id = await janvierTermine()
    await ok(id, 'PUT', '/mois/2027-01/cumul', { solde: -20_000 })
    expect((await lire<CumulDto>(id, '/cumul?du=2027-01&au=2027-01')).mois[0]).toMatchObject({ cumul: -20_000, ecart: -670_000 })
  })
})
