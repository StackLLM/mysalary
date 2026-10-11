import type { CalendrierMoisDto } from '@mysalary/partage'
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

const calendrier = async (id: string, cle = '2027-01') => {
  const r = await appeler(id, 'GET', `/mois/${cle}/calendrier`)
  expect(r.statusCode, r.body).toBe(200)
  return r.json() as CalendrierMoisDto
}

describe('calendrier du mois', () => {
  it('événements typés avec leur ligne, solde réel puis projeté, ponctuel daté ajouté', async () => {
    const { id, cat } = await compte()
    const c = await calendrier(id)
    expect(c).toMatchObject({ aujourdhui: '2027-01-10', debutSemaine: 1, mois: { cle: '2027-01', debut: '2026-12-27', fin: '2027-01-26' } })
    expect(c.evenements.map((e) => [e.date, e.type, e.libelle, e.statut, e.passeNonConfirme])).toEqual([
      ['2026-12-27', 'paie', 'Salaire', 'confirme', false],
      ['2027-01-05', 'charge', 'Loyer', 'confirme', false],
      ['2027-01-08', 'charge', 'Internet', 'enRetard', true],
    ])
    expect(c.evenements[2]!.ligne.cible).toMatchObject({ type: 'charge', date: '2027-01-08' })
    const jour = (date: string) => c.jours.find((j) => j.date === date)!
    expect(jour('2027-01-10')).toMatchObject({ solde: 650_000, projete: false })
    expect(jour('2027-01-11')).toMatchObject({ solde: 620_000, projete: true })

    // Un ponctuel daté s'ajoute au calendrier à sa date.
    await ok(id, 'POST', '/ponctuels', { libelle: 'Permis', categorieId: cat('Autre'), montant: 100_000, date: '2027-01-20', certitude: 'garanti' })
    const apres = await calendrier(id)
    expect(apres.evenements.find((e) => e.libelle === 'Permis')).toMatchObject({ date: '2027-01-20', type: 'ponctuel', sens: 'sortie', montant: 100_000, statut: 'prevu' })
    expect(apres.jours.at(-1)!.solde).toBe(520_000)
  })

  it('mois futur, clé invalide, comptes isolés', async () => {
    const a = await compte('A')
    const b = await compte('B')
    await ok(a.id, 'POST', '/ponctuels', { libelle: 'Permis', categorieId: a.cat('Autre'), montant: 100_000, date: '2027-01-20', certitude: 'garanti' })
    expect((await calendrier(b.id)).evenements.some((e) => e.libelle === 'Permis')).toBe(false)
    expect((await calendrier(a.id, '2027-03')).jours.every((j) => j.projete)).toBe(true)
    expect((await appeler(a.id, 'GET', '/mois/2027-13/calendrier')).statusCode).toBe(400)
  })
})
