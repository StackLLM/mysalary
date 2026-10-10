import type { BilanDto, ChargeDto, SemainesDto } from '@mysalary/partage'
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

/** Courses : 3 100 DH sur les 31 jours de janvier, soit 100 DH par jour. */
async function compte(prenom = 'A') {
  const { id } = await creerCompte(ctx.app, prenom)
  await ok(id, 'POST', '/salaire/contrats', CONTRAT)
  const categories = (await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  const cat = (libelle: string) => categories.find((x) => x.libelle === libelle)!.id
  const courses = (await ok(id, 'POST', '/charges', { libelle: 'Courses', categorieId: cat('Alimentation'), nature: 'enveloppe', montant: 310_000, debut: '2027-01' })).id
  ctx.jour = '2027-01-06'
  await ok(id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
  await ok(id, 'POST', '/depenses', { date: '2026-12-30', montant: 110_000, categorieId: cat('Alimentation'), chargeId: courses })
  await ok(id, 'POST', '/depenses', { date: '2027-01-05', montant: 5_000, categorieId: cat('Loisirs') })
  return { id, cat, courses }
}

const semaines = async (id: string, cle = '2027-01') => {
  const r = await appeler(id, 'GET', `/mois/${cle}/semaines`)
  expect(r.statusCode, r.body).toBe(200)
  return r.json() as SemainesDto
}

describe('semaines du mois', () => {
  it('budget réparti, dépensé flexible, réponse en tête', async () => {
    const { id } = await compte()
    const s = await semaines(id)
    expect(s).toMatchObject({ aujourdhui: '2027-01-06', fige: false, debutSemaine: 1, report: false, courante: 3, budget: 310_000, depense: 115_000 })
    expect(s.semaines.map((x) => [x.debut, x.nbJours, x.budget, x.depense])).toEqual([
      ['2026-12-27', 1, 10_000, 0],
      ['2026-12-28', 7, 70_000, 110_000],
      ['2027-01-04', 7, 70_000, 5_000],
      ['2027-01-11', 7, 70_000, 0],
      ['2027-01-18', 7, 70_000, 0],
      ['2027-01-25', 2, 20_000, 0],
    ])
    // 11 jours écoulés : 1 100 DH de budget pour 1 150 DH dépensés.
    expect(s.reponse).toEqual({ type: 'retard', montant: 5_000 })
  })

  it('montant d’enveloppe saisi par semaine ou par jour : additionné, disponible dès le début de la semaine', async () => {
    const { id, cat, courses } = await compte()
    // 700 DH par semaine, saisis par l'utilisateur.
    await ok(id, 'PUT', `/charges/${courses}`, { libelle: 'Courses', categorieId: cat('Alimentation'), nature: 'enveloppe', montant: 70_000, unite: 'semaine', debut: '2027-01' })
    const transport = (await ok(id, 'POST', '/charges', { libelle: 'Transport', categorieId: cat('Transport'), nature: 'enveloppe', montant: 1_000, unite: 'jour', debut: '2027-01' })).id
    const charges = (await appeler(id, 'GET', '/charges')).json() as ChargeDto[]
    expect(charges.find((c) => c.id === courses)).toMatchObject({ montant: 70_000, unite: 'semaine', equivalentMensuel: 310_000 })
    expect(charges.find((c) => c.id === transport)).toMatchObject({ montant: 1_000, unite: 'jour', equivalentMensuel: 31_000 })

    const s = await semaines(id)
    // Courses : 700 DH par semaine complète (semaines coupées par le mois : leurs jours) ; transport : 10 DH par jour.
    expect(s.semaines.map((x) => x.budget)).toEqual([11_000, 77_000, 77_000, 77_000, 77_000, 22_000])
    expect(s.budget).toBe(341_000)
    // Semaine en cours, 3 jours écoulés : 700 DH de courses déjà là + 3 jours de transport.
    expect(s.semaines[2]).toMatchObject({ statut: 'enCours', ecart: 73_000 - 5_000 })
    const bilan = (await appeler(id, 'GET', '/mois/2027-01/bilan')).json() as BilanDto
    const jour = (date: string) => bilan.rythme.find((p) => p.date === date)!.prevu
    expect(jour('2027-01-04') - jour('2027-01-03')).toBe(71_000)
    expect(jour('2027-01-05') - jour('2027-01-04')).toBe(1_000)

    // Une charge fixe n'a pas d'unité : toujours « mois ». Unité inconnue refusée.
    const loyer = (await ok(id, 'POST', '/charges', { libelle: 'Loyer', categorieId: cat('Logement'), nature: 'fixe', montant: 350_000, jour: 5, debut: '2027-01', unite: 'semaine' })).id
    expect(((await appeler(id, 'GET', '/charges')).json() as ChargeDto[]).find((c) => c.id === loyer)).toMatchObject({ unite: 'mois' })
    expect((await appeler(id, 'POST', '/charges', { libelle: 'X', categorieId: cat('Loisirs'), nature: 'enveloppe', montant: 1_000, debut: '2027-01', unite: 'annee' })).statusCode).toBe(400)
  })

  it('suit le début de semaine et le report des réglages', async () => {
    const { id } = await compte()
    await ok(id, 'PUT', '/reglages', { debutSemaine: 7, reportHebdo: true })
    const s = await semaines(id)
    expect(s).toMatchObject({ debutSemaine: 7, report: true })
    // Dimanche → samedi : 27 déc.–2 janv. dépasse de 400 DH, reportés sur la semaine du 3 janv.
    expect(s.semaines.map((x) => [x.debut, x.report])).toEqual([
      ['2026-12-27', 0],
      ['2027-01-03', -40_000],
      ['2027-01-10', 0],
      ['2027-01-17', 0],
      ['2027-01-24', 0],
    ])
  })

  it('mois clôturé : semaines figées, même si le plan change', async () => {
    const { id, cat } = await compte()
    ctx.jour = '2027-01-28'
    await ok(id, 'POST', '/salaire/paies/2027-02/reception', { dateReelle: '2027-01-27', salaireRecu: 1_000_000 })
    await ok(id, 'POST', '/mois/2027-01/cloturer', { forcer: true })
    await ok(id, 'POST', '/charges', { libelle: 'Transport', categorieId: cat('Transport'), nature: 'enveloppe', montant: 62_000, debut: '2027-01' })

    const fige = await semaines(id)
    expect(fige).toMatchObject({ fige: true, budget: 310_000, reponse: { type: 'marge', montant: 195_000 } })

    await ok(id, 'POST', '/mois/2027-01/rouvrir', {})
    expect(await semaines(id)).toMatchObject({ fige: false, budget: 372_000 })
  })

  it('isole les comptes et refuse une clé invalide', async () => {
    const a = await compte('A')
    const b = await compte('B')
    await ok(a.id, 'POST', '/depenses', { date: '2027-01-06', montant: 50_000, categorieId: a.cat('Loisirs') })
    expect((await semaines(b.id)).depense).toBe(115_000)
    expect((await appeler(a.id, 'GET', '/mois/2027-13/semaines')).statusCode).toBe(400)
  })
})
