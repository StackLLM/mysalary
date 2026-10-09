import type { ObjectifsDto, Reglages, ScenarioDto, SimulationDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

// Salaire 10 000 DH le 27, qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv. Aujourd'hui : 10 janv.
const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function ok(id: string, method: 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) {
  const r = await appeler(id, method, chemin, payload)
  expect(r.statusCode, r.body).toBeLessThan(300)
  return r.statusCode === 204 ? null : r.json()
}
const lire = async <T,>(id: string, chemin: string) => (await appeler(id, 'GET', chemin)).json() as T

/** Loyer 3 500 DH, courses 2 000 DH, cours probables 1 000 DH dès février ; moto (85 000 DH) et permis (3 000 DH). */
async function compte(prenom = 'A') {
  const { id } = await creerCompte(ctx.app, prenom)
  await ok(id, 'POST', '/salaire/contrats', CONTRAT)
  const categories = (await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  const cat = (l: string) => categories.find((c) => c.libelle === l)!.id
  await ok(id, 'POST', '/charges', { libelle: 'Loyer', categorieId: cat('Logement'), nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-11', essentielle: true })
  const courses = (await ok(id, 'POST', '/charges', { libelle: 'Courses', categorieId: cat('Alimentation'), nature: 'enveloppe', montant: 200_000, debut: '2026-11' })).id as string
  await ok(id, 'POST', '/revenus/sources', { libelle: 'Cours', type: 'variable', montant: 100_000, frequence: 'mensuelle', versement: 'dateSeparee', jour: 10, certitude: 'probable', debut: '2027-02' })
  ctx.jour = '2027-01-10'
  await ok(id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
  const cih = (await ok(id, 'POST', '/epargne/comptes', { libelle: 'CIH', solde: 500_000, auLe: '2027-01-01' })).id as string
  const moto = (await ok(id, 'POST', '/objectifs', { libelle: 'Moto', type: 'moto', montantCible: 8_500_000, montantInitial: 200_000, dateCible: '2027-12' })).id as string
  const permis = (await ok(id, 'POST', '/objectifs', { libelle: 'Permis', montantCible: 300_000, dateCible: '2027-03', versementMensuel: 100_000 })).id as string
  return { id, cih, moto, permis, courses }
}

const simuler = async (id: string, corps: object = {}) => (await ok(id, 'POST', '/simulations/executer', corps)) as SimulationDto

describe('simulation', () => {
  it('projection sans levier : trois scénarios sur 12 mois, rien n’est écrit', async () => {
    const { id } = await compte()
    const avant = await lire<ObjectifsDto>(id, '/objectifs')
    const s = await simuler(id)
    expect(s).toMatchObject({ aujourdhui: '2027-01-10', moisCourant: '2027-01', horizon: 12, horizonLong: false, epargneActuelle: 500_000 })
    expect(s.series.realiste).toHaveLength(12)
    // Février : 10 000 + 1 000 (cours probables) − 3 500 − 2 000.
    expect(s.series.realiste[1]!.capacite).toBe(550_000)
    expect(s.series.prudent[1]!.capacite).toBe(450_000)
    expect(await lire<ObjectifsDto>(id, '/objectifs')).toEqual(avant)
  })

  it('leviers : la prime avance la moto, la base reste la même ; horizon long signalé', async () => {
    const { id, moto } = await compte()
    const s = await simuler(id, { ajustements: { primes: [{ mois: '2027-02', montant: 2_000_000 }] }, horizon: 36 })
    const o = s.objectifs.find((x) => x.id === moto)!
    expect(o.gainMois!.realiste).toBeGreaterThan(0)
    expect(o.base!.realiste! > o.simule!.realiste!).toBe(true)
    expect(s.horizonLong).toBe(true)
    expect((await appeler(id, 'POST', '/simulations/executer', { horizon: 18 })).statusCode).toBe(400)
  })

  it('règles des scénarios : enregistrées dans les Réglages, utilisées par les projections', async () => {
    const { id } = await compte()
    expect((await lire<Reglages>(id, '/reglages')).reglesScenarios.realiste.revenus).toEqual(['garanti', 'probable'])
    await ok(id, 'PUT', '/reglages', {
      reglesScenarios: {
        prudent: { revenus: [], flexibleMoyenne: true },
        realiste: { revenus: [], flexibleMoyenne: false },
        ambitieux: { revenus: ['probable', 'incertain'], flexibleMoyenne: false },
      },
    })
    expect((await lire<Reglages>(id, '/reglages')).reglesScenarios.realiste.revenus).toEqual(['garanti'])
    expect((await simuler(id)).series.realiste[1]!.capacite).toBe(450_000)
  })
})

describe('appliquer au plan', () => {
  it('versement, date, prime, réduction : le plan change, avec un résumé', async () => {
    const { id, moto, permis, courses } = await compte()
    const r = await ok(id, 'POST', '/simulations/appliquer', {
      ajustements: {
        versements: { [moto]: 400_000 },
        datesCibles: { [permis]: '2027-04' },
        primes: [{ mois: '2027-03', montant: 300_000 }],
        reductions: [{ chargeId: courses, montant: 50_000 }],
      },
    })
    expect((r.changements as string[]).map((t) => t.replace(/\s+/g, ' '))).toEqual([
      '« Moto » : versement mensuel 4 000 DH.',
      '« Permis » : date souhaitée avril 2027.',
      'Prime probable de 3 000 DH prévue le 27 févr. 2027 (Autres revenus).',
      '« Courses » : 1 500 DH au lieu de 2 000 DH à partir de février 2027.',
    ])
    const o = await lire<ObjectifsDto>(id, '/objectifs')
    expect(o.objectifs.find((x) => x.id === moto)!.versementMensuel).toBe(400_000)
    expect(o.objectifs.find((x) => x.id === permis)!.dateCible).toBe('2027-04')
    const charges = await lire<{ libelle: string; montant: number; debut: string; fin: string | null }[]>(id, '/charges')
    expect(charges.filter((c) => c.libelle === 'Courses').map((c) => [c.montant, c.debut, c.fin])).toEqual([
      [200_000, '2026-11', '2027-01'],
      [150_000, '2027-02', null],
    ])
    const sources = await lire<{ libelle: string; frequence: string; certitude: string; debut: string }[]>(id, '/revenus/sources')
    expect(sources.find((s) => s.libelle === 'Prime (simulation)')).toMatchObject({ frequence: 'unique', certitude: 'probable', debut: '2027-02' })
  })

  it('refuse sans levier, une prime passée, un objectif d’un autre compte', async () => {
    const a = await compte('A')
    const b = await compte('B')
    expect((await appeler(a.id, 'POST', '/simulations/appliquer', { ajustements: {} })).statusCode).toBe(422)
    expect((await appeler(a.id, 'POST', '/simulations/appliquer', { ajustements: { primes: [{ mois: '2026-12', montant: 1_000 }] } })).statusCode).toBe(422)
    expect((await appeler(b.id, 'POST', '/simulations/appliquer', { ajustements: { versements: { [a.moto]: 1_000 } } })).statusCode).toBe(404)
  })
})

describe('scénarios enregistrés', () => {
  it('créer, lister, modifier, supprimer ; isolés par compte', async () => {
    const { id, moto } = await compte('A')
    const autre = await compte('B')
    const { id: s } = await ok(id, 'POST', '/scenarios', { nom: 'Prime de mars', ajustements: { versements: { [moto]: 300_000 } }, horizon: 24 })
    expect(await lire<ScenarioDto[]>(id, '/scenarios')).toMatchObject([{ id: s, nom: 'Prime de mars', horizon: 24, ajustements: { versements: { [moto]: 300_000 }, primes: [] } }])
    await ok(id, 'PUT', `/scenarios/${s}`, { nom: 'Plan B', ajustements: {}, horizon: 12 })
    expect((await lire<ScenarioDto[]>(id, '/scenarios'))[0]!.nom).toBe('Plan B')
    expect(await lire<ScenarioDto[]>(autre.id, '/scenarios')).toEqual([])
    expect((await appeler(autre.id, 'DELETE', `/scenarios/${s}`)).statusCode).toBe(404)
    await ok(id, 'DELETE', `/scenarios/${s}`)
    expect(await lire<ScenarioDto[]>(id, '/scenarios')).toEqual([])
  })
})
