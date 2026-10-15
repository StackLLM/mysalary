import type { AujourdhuiDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

// Salaire 10 000 DH le 27, qui finance le mois suivant : « janvier 2027 » va du dim. 27 déc. au mar. 26 janv.
const appeler = (id: string, method: 'GET' | 'POST', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function ok(id: string, chemin: string, payload: object) {
  const r = await appeler(id, 'POST', chemin, payload)
  expect(r.statusCode, r.body).toBeLessThan(300)
  return r.statusCode === 204 ? null : r.json()
}
const lire = async (id: string) => {
  const r = await appeler(id, 'GET', '/aujourdhui')
  expect(r.statusCode, r.body).toBe(200)
  return r.json() as AujourdhuiDto
}

describe('page Aujourd’hui (lot 16)', () => {
  it('compte sans salaire : état vide', async () => {
    const { id } = await creerCompte(ctx.app, 'Vide')
    ctx.jour = '2027-01-11'
    expect(await lire(id)).toMatchObject({ aujourdhui: '2027-01-11', sansContrat: true, semainePassee: null })
  })

  it('reste à dépenser, semaine en cours et passée (le lundi), 7 prochains jours, actions attendues', async () => {
    const { id } = await creerCompte(ctx.app, 'A')
    await ok(id, '/salaire/contrats', { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' })
    const categories = (await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
    const cat = (l: string) => categories.find((c) => c.libelle === l)!.id
    await ok(id, '/charges', { libelle: 'Loyer', categorieId: cat('Logement'), nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-11' })
    await ok(id, '/charges', { libelle: 'Internet', categorieId: cat('Télécom & internet'), nature: 'fixe', montant: 25_000, jour: 15, debut: '2026-11' })
    const courses = (await ok(id, '/charges', { libelle: 'Courses', categorieId: cat('Alimentation'), nature: 'enveloppe', montant: 310_000, unite: 'semaine', semaines: [{ debut: '2027-01-04', montant: 70_000 }, { debut: '2027-01-11', montant: 70_000 }], debut: '2027-01' })).id
    ctx.jour = '2027-01-11'
    await ok(id, '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
    await ok(id, '/depenses', { date: '2027-01-06', montant: 30_000, categorieId: cat('Alimentation'), chargeId: courses })

    const a = await lire(id)
    expect(a.sansContrat).toBe(false)
    expect(a.indicateurs.resteADepenser).toMatchObject({ nature: 'reel', joursRestants: 16 })
    expect(a.indicateurs.resteSemaine).toMatchObject({ numero: 4, disponible: 70_000, depense: 0 })
    // Lundi 11 janv. : la semaine du 4 au 10 vient de finir (700 DH de courses, 300 DH dépensés).
    expect(a.semainePassee).toMatchObject({ debut: '2027-01-04', fin: '2027-01-10', budget: 70_000, depense: 30_000 })
    expect(a.prochainsJours.map((e) => [e.date, e.libelle, e.statut])).toEqual([['2027-01-15', 'Internet', 'prevu']])
    // Le loyer du 5 n'est pas payé : il est à faire.
    expect(a.alertes.map((x) => x.titre)).toContain('« Loyer » pas encore payé')
    expect(a.recommandations.length).toBeLessThanOrEqual(3)
    // Tableau de bord : postes du plus lourd au plus léger, grosses dépenses du mois, épargne et objectifs.
    expect(a.tableau.postes.map((p) => [p.libelle, p.prevu, p.reel])).toEqual([
      ['Loyer', 350_000, 0],
      ['Courses', 310_000, 30_000],
      ['Internet', 25_000, 0],
    ])
    expect(a.tableau.grossesDepenses.map((d) => [d.date, d.montant])).toEqual([['2027-01-06', 30_000]])
    expect(a.epargne).toMatchObject({ declare: false, solde: 0 })
    expect(a.objectifs).toBeNull()
    await ok(id, '/objectifs', { libelle: 'Moto', type: 'moto', montantCible: 8_300_000, montantInitial: 900_000, dateCible: '2027-02' })
    expect((await lire(id)).objectifs).toEqual({ enCours: 1, cible: 8_300_000, epargne: 900_000, progression: 900_000 / 8_300_000, aRisque: ['Moto'] })

    ctx.jour = '2027-01-12'
    expect((await lire(id)).semainePassee).toBeNull()
  })
})
