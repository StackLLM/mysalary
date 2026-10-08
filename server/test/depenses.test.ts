import type { RattachementsDto, SuiviDepensesDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

// Paie le 27 qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv.
const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function creer(id: string, chemin: string, saisie: object) {
  const r = await appeler(id, 'POST', chemin, saisie)
  expect(r.statusCode, r.body).toBe(201)
  return r.json().id as string
}

/** Compte avec un salaire, un loyer le 5, une enveloppe Courses et un ponctuel. */
async function compte(prenom = 'A') {
  const c = await creerCompte(ctx.app, prenom)
  await appeler(c.id, 'POST', '/salaire/contrats', CONTRAT)
  const categories = (await appeler(c.id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  const cat = (libelle: string) => categories.find((x) => x.libelle === libelle)!.id
  const loyer = await creer(c.id, '/charges', { libelle: 'Loyer', categorieId: cat('Logement'), nature: 'fixe', montant: 350_000, jour: 5, debut: '2027-01' })
  const courses = await creer(c.id, '/charges', { libelle: 'Courses', categorieId: cat('Alimentation'), nature: 'enveloppe', montant: 250_000, debut: '2027-01' })
  const assurance = await creer(c.id, '/ponctuels', { libelle: 'Assurance', categorieId: cat('Assurances'), montant: 240_000, date: '2027-01-15' })
  return { id: c.id, cat, loyer, courses, assurance }
}

const suivi = async (id: string, mois = '2027-01') => (await appeler(id, 'GET', `/depenses?mois=${mois}`)).json() as SuiviDepensesDto

describe('dépenses réelles', () => {
  it('rattache au plan : loyer payé, enveloppe consommée, ponctuel payé, hors plan', async () => {
    ctx.jour = '2027-01-20'
    const { id, cat, loyer, courses, assurance } = await compte()
    await creer(id, '/depenses', { date: '2027-01-04', montant: 350_000, categorieId: cat('Logement'), chargeId: loyer, echeance: '2027-01-05' })
    await creer(id, '/depenses', { date: '2027-01-10', montant: 40_000, categorieId: cat('Alimentation'), chargeId: courses, libelle: 'Marché' })
    await creer(id, '/depenses', { date: '2027-01-15', montant: 240_000, categorieId: cat('Assurances'), ponctuelId: assurance })
    await creer(id, '/depenses', { date: '2027-01-16', montant: 15_000, categorieId: cat('Loisirs'), note: 'Cinéma' })

    const s = await suivi(id)
    expect(s.mois).toMatchObject({ cle: '2027-01', debut: '2026-12-27', fin: '2027-01-26', statut: 'enCours' })
    expect(s.depenses.map((d) => [d.montant, d.imputation])).toEqual([
      [15_000, 'horsPlan'],
      [240_000, 'ponctuel'],
      [40_000, 'enveloppe'],
      [350_000, 'fixe'],
    ])
    expect(s.depenses[0]).toMatchObject({ note: 'Cinéma', libelle: '' })
    expect(s.lignes.map((l) => [l.libelle, l.statut])).toEqual([
      ['Loyer', 'payee'],
      ['Assurance', 'payee'],
    ])
    expect(s.enveloppes[0]).toMatchObject({ budget: 250_000, depense: 40_000, reste: 210_000 })
    expect(s.totaux).toEqual({ fixe: 350_000, enveloppe: 40_000, ponctuel: 240_000, horsPlan: 15_000, dette: 0, total: 645_000 })
    expect(s.restePrevu.total).toBe(210_000)

    // Le prévu n'a pas bougé.
    const resume = (await appeler(id, 'GET', '/charges/resume')).json()
    expect(resume.duMois.totaux.total).toBe(840_000)
  })

  it('refuse une date future, une échéance inexistante, une enveloppe ou un ponctuel d’un autre compte', async () => {
    ctx.jour = '2027-01-20'
    const a = await compte('A')
    const b = await compte('B')
    const base = { montant: 10_000, categorieId: a.cat('Logement') }

    const futur = await appeler(a.id, 'POST', '/depenses', { ...base, date: '2027-01-21' })
    expect(futur.statusCode).toBe(422)
    expect(futur.json().erreur.champs).toEqual({ date: 'Date future.' })

    const mauvaiseEcheance = await appeler(a.id, 'POST', '/depenses', { ...base, date: '2027-01-04', chargeId: a.loyer, echeance: '2027-01-06' })
    expect(mauvaiseEcheance.statusCode).toBe(422)
    expect(mauvaiseEcheance.json().erreur.message).toBe('« Loyer » n’a pas d’échéance le 6 janv. 2027.')
    expect((await appeler(a.id, 'POST', '/depenses', { ...base, date: '2027-01-04', chargeId: a.loyer })).json().erreur.champs).toEqual({ echeance: 'Échéance manquante.' })

    expect((await appeler(a.id, 'POST', '/depenses', { ...base, date: '2027-01-04', chargeId: b.courses })).statusCode).toBe(422)
    expect((await appeler(a.id, 'POST', '/depenses', { ...base, date: '2027-01-04', ponctuelId: b.assurance })).statusCode).toBe(422)
    expect((await appeler(a.id, 'POST', '/depenses', { ...base, categorieId: b.cat('Logement'), date: '2027-01-04' })).statusCode).toBe(422)
    expect((await appeler(a.id, 'POST', '/depenses', { ...base, date: '2027-01-04', chargeId: a.courses, ponctuelId: a.assurance })).statusCode).toBe(400)
  })

  it('isole les comptes : lecture, modification, suppression', async () => {
    ctx.jour = '2027-01-20'
    const a = await compte('A')
    const b = await compte('B')
    const dep = await creer(a.id, '/depenses', { date: '2027-01-10', montant: 10_000, categorieId: a.cat('Loisirs') })
    expect((await suivi(b.id)).depenses).toEqual([])
    expect((await appeler(b.id, 'PUT', `/depenses/${dep}`, { date: '2027-01-10', montant: 1, categorieId: b.cat('Loisirs') })).statusCode).toBe(404)
    expect((await appeler(b.id, 'DELETE', `/depenses/${dep}`)).statusCode).toBe(404)

    expect((await appeler(a.id, 'PUT', `/depenses/${dep}`, { date: '2027-01-11', montant: 12_000, categorieId: a.cat('Loisirs') })).statusCode).toBe(204)
    expect((await suivi(a.id)).depenses[0]).toMatchObject({ date: '2027-01-11', montant: 12_000 })
    expect((await appeler(a.id, 'DELETE', `/depenses/${dep}`)).statusCode).toBe(204)
    expect((await suivi(a.id)).depenses).toEqual([])
  })

  it('une enveloppe ne garde pas d’échéance ; supprimer la charge laisse la dépense, hors plan', async () => {
    ctx.jour = '2027-01-20'
    const { id, cat, loyer, courses } = await compte()
    await creer(id, '/depenses', { date: '2027-01-10', montant: 40_000, categorieId: cat('Alimentation'), chargeId: courses, echeance: '2027-01-05' })
    await creer(id, '/depenses', { date: '2027-01-04', montant: 350_000, categorieId: cat('Logement'), chargeId: loyer, echeance: '2027-01-05' })
    expect((await suivi(id)).depenses.find((d) => d.montant === 40_000)?.echeance).toBeNull()

    expect((await appeler(id, 'DELETE', `/charges/${loyer}`)).statusCode).toBe(204)
    const s = await suivi(id)
    expect(s.depenses.find((d) => d.montant === 350_000)).toMatchObject({ chargeId: null, imputation: 'horsPlan' })
    expect(s.totaux.horsPlan).toBe(350_000)
  })

  it('une catégorie utilisée par une dépense n’est pas supprimable', async () => {
    ctx.jour = '2027-01-20'
    const { id, cat } = await compte()
    await creer(id, '/depenses', { date: '2027-01-10', montant: 10_000, categorieId: cat('Sport') })
    expect((await appeler(id, 'DELETE', `/categories/${cat('Sport')}`)).statusCode).toBe(422)
    const sport = ((await appeler(id, 'GET', '/categories')).json() as { libelle: string; depenses: number; utilisee: boolean }[]).find((c) => c.libelle === 'Sport')
    expect(sport).toMatchObject({ depenses: 1, utilisee: true })
  })

  it('compte les paiements de dettes du mois dans le réel', async () => {
    ctx.jour = '2027-01-20'
    const { id } = await compte()
    const dette = await creer(id, '/dettes', { libelle: 'Prêt', montantTotal: 300_000, mensualite: 100_000, premiereEcheance: '2027-01-10' })
    await creer(id, `/dettes/${dette}/paiements`, { date: '2027-01-10', montant: 100_000 })
    const s = await suivi(id)
    expect(s.paiementsDettes).toEqual([expect.objectContaining({ libelle: 'Prêt', montant: 100_000, date: '2027-01-10' })])
    expect(s.totaux).toMatchObject({ dette: 100_000, total: 100_000 })
  })

  it('propose les lignes à rattacher, y compris un paiement en avance', async () => {
    ctx.jour = '2027-01-26'
    const { id } = await compte()
    const r = (await appeler(id, 'GET', '/depenses/rattachements?date=2027-01-26')).json() as RattachementsDto
    expect(r.mois).toBe('2027-01')
    expect(r.lignes.map((l) => `${l.libelle} ${l.date}`)).toEqual(['Loyer 2027-01-05', 'Assurance 2027-01-15', 'Loyer 2027-02-05'])
    expect(r.enveloppes.map((e) => e.libelle)).toEqual(['Courses'])
    expect((await appeler(id, 'GET', '/depenses/rattachements?date=hier')).statusCode).toBe(400)
  })

  it('sans mois demandé, renvoie le mois en cours', async () => {
    ctx.jour = '2027-01-28'
    const { id } = await compte()
    expect(((await appeler(id, 'GET', '/depenses')).json() as SuiviDepensesDto).mois.cle).toBe('2027-02')
  })
})
