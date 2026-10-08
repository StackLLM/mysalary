import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

/** Contrat de l'utilisateur : 10 000 DH le 27, sans décalage week-end, la paie finance le mois suivant. */
const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }

async function compteAvecContrat(prenom = 'A') {
  const compte = await creerCompte(ctx.app, prenom)
  const reponse = await ctx.app.inject({ method: 'POST', url: url('/salaire/contrats'), headers: pour(compte.id), payload: CONTRAT })
  expect(reponse.statusCode).toBe(201)
  return { compte, contrat: reponse.json() }
}

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

describe('contrat de salaire', () => {
  it('crée une version avec les valeurs par défaut', async () => {
    const { contrat } = await compteAvecContrat()
    expect(contrat).toMatchObject({ ...CONTRAT, financeMoisSuivant: true })
  })

  it('refuse deux versions pour le même mois', async () => {
    const { compte } = await compteAvecContrat()
    const doublon = await appeler(compte.id, 'POST', '/salaire/contrats', CONTRAT)
    expect(doublon.statusCode).toBe(409)
    expect(doublon.json().erreur.champs).toHaveProperty('moisEffet')
  })

  it('une hausse ne touche que les mois à partir de sa date d’effet', async () => {
    const { compte } = await compteAvecContrat()
    await appeler(compte.id, 'POST', '/salaire/contrats', { ...CONTRAT, moisEffet: '2027-03', montantNet: 1_100_000 })
    ctx.jour = '2027-01-10'
    const { paies } = (await appeler(compte.id, 'GET', '/salaire/paies?du=2027-02&au=2027-03')).json()
    expect(paies.map((p: { totalPrevu: number }) => p.totalPrevu)).toEqual([1_000_000, 1_100_000])
  })
})

describe('paies et mois budgétaires', () => {
  it('« Février 2027 » commence le jour de la paie du 27 janvier', async () => {
    const { compte } = await compteAvecContrat()
    ctx.jour = '2027-02-10'
    const mois = (await appeler(compte.id, 'GET', '/mois/courant')).json()
    expect(mois).toMatchObject({ cle: '2027-02', debut: '2027-01-27', fin: '2027-02-26', nbJours: 31, joursRestants: 17, statut: 'enCours' })
    expect(mois.paie).toMatchObject({ statut: 'enRetard', datePrevue: '2027-01-27' })
    expect(mois.semaines).toHaveLength(5)
  })

  it('confirme une paie avec une prime, puis annule la confirmation', async () => {
    const { compte } = await compteAvecContrat()
    ctx.jour = '2027-01-28'

    expect((await appeler(compte.id, 'PUT', '/salaire/paies/2027-02/primes', { primes: [{ libelle: 'Prime', certitude: 'probable', montantPrevu: 100_000 }] })).statusCode).toBe(204)
    const prevue = (await appeler(compte.id, 'GET', '/mois/2027-02')).json().paie
    expect(prevue.totalPrevu).toBe(1_100_000)
    const prime = prevue.lignes.find((l: { type: string }) => l.type === 'prime')

    const reception = await appeler(compte.id, 'POST', '/salaire/paies/2027-02/reception', {
      dateReelle: '2027-01-27',
      salaireRecu: 1_000_000,
      primes: [{ id: prime.id, libelle: 'Prime', montantRecu: 80_000 }, { libelle: 'Heures sup', montantRecu: 20_000 }],
    })
    expect(reception.statusCode).toBe(204)

    const recue = (await appeler(compte.id, 'GET', '/mois/2027-02')).json()
    expect(recue).toMatchObject({ debut: '2027-01-27', sourceDebut: 'reelle' })
    expect(recue.paie).toMatchObject({ statut: 'recue', dateReelle: '2027-01-27', totalPrevu: 1_100_000, totalRecu: 1_100_000, ecart: 0 })
    expect(recue.paie.lignes.map((l: { libelle: string; montantPrevu: number | null; montantRecu: number }) => [l.libelle, l.montantPrevu, l.montantRecu])).toEqual([
      ['Salaire', 1_000_000, 1_000_000],
      ['Prime', 100_000, 80_000],
      ['Heures sup', null, 20_000],
    ])

    expect((await appeler(compte.id, 'DELETE', '/salaire/paies/2027-02/reception')).statusCode).toBe(204)
    const annulee = (await appeler(compte.id, 'GET', '/mois/2027-02')).json().paie
    expect(annulee).toMatchObject({ statut: 'enRetard', dateReelle: null, totalPrevu: 1_100_000 })
    expect(annulee.lignes.map((l: { libelle: string }) => l.libelle)).toEqual(['Salaire', 'Prime'])
  })

  it('une paie reçue en avance redécoupe les mois voisins', async () => {
    const { compte } = await compteAvecContrat()
    ctx.jour = '2027-01-26'
    await appeler(compte.id, 'POST', '/salaire/paies/2027-02/reception', { dateReelle: '2027-01-25', salaireRecu: 1_000_000 })
    const janvier = (await appeler(compte.id, 'GET', '/mois/2027-01')).json()
    expect(janvier).toMatchObject({ fin: '2027-01-24', statut: 'passe' })
    expect((await appeler(compte.id, 'GET', '/mois/courant')).json().cle).toBe('2027-02')
  })

  it('refuse une date incohérente avec un message qui propose l’autre mois', async () => {
    const { compte } = await compteAvecContrat()
    ctx.jour = '2027-02-10'
    const reponse = await appeler(compte.id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2027-01-28', salaireRecu: 1_000_000 })
    expect(reponse.statusCode).toBe(422)
    expect(reponse.json().erreur).toMatchObject({ code: 'REGLE_METIER', champs: { dateReelle: 'Avant le 27 janv. 2027.' } })
    expect(reponse.json().erreur.message).toContain('Choisis plutôt février 2027')

    const futur = await appeler(compte.id, 'POST', '/salaire/paies/2027-03/reception', { dateReelle: '2027-02-11', salaireRecu: 1 })
    expect(futur.statusCode).toBe(422)
  })

  it('refuse de modifier les primes d’une paie déjà reçue', async () => {
    const { compte } = await compteAvecContrat()
    ctx.jour = '2027-01-28'
    await appeler(compte.id, 'POST', '/salaire/paies/2027-02/reception', { dateReelle: '2027-01-27', salaireRecu: 1_000_000 })
    const reponse = await appeler(compte.id, 'PUT', '/salaire/paies/2027-02/primes', { primes: [] })
    expect(reponse.statusCode).toBe(422)
  })

  it('limite la plage des paies demandées', async () => {
    const { compte } = await compteAvecContrat()
    expect((await appeler(compte.id, 'GET', '/salaire/paies?du=2027-01&au=2030-01')).statusCode).toBe(400)
    expect((await appeler(compte.id, 'GET', '/salaire/paies?du=2027-01')).statusCode).toBe(400)
  })

  it('sans contrat : mois civil, signalé', async () => {
    const compte = await creerCompte(ctx.app, 'B')
    ctx.jour = '2027-02-10'
    expect((await appeler(compte.id, 'GET', '/mois/courant')).json()).toMatchObject({ cle: '2027-02', debut: '2027-02-01', sansContrat: true, paie: null })
  })
})

describe('isolation du salaire', () => {
  it('B ne voit ni ne modifie le contrat et les paies de A', async () => {
    const { compte: a, contrat } = await compteAvecContrat('A')
    const b = await creerCompte(ctx.app, 'B')
    ctx.jour = '2027-01-28'
    await appeler(a.id, 'POST', '/salaire/paies/2027-02/reception', { dateReelle: '2027-01-27', salaireRecu: 1_000_000 })

    expect((await appeler(b.id, 'GET', '/salaire/contrats')).json()).toEqual([])
    expect((await appeler(b.id, 'GET', '/salaire/paies?du=2027-01&au=2027-03')).json().paies).toEqual([])
    expect((await appeler(b.id, 'PUT', `/salaire/contrats/${contrat.id}`, { montantNet: 1 })).statusCode).toBe(404)
    expect((await appeler(b.id, 'DELETE', `/salaire/contrats/${contrat.id}`)).statusCode).toBe(404)
    expect((await appeler(b.id, 'DELETE', '/salaire/paies/2027-02/reception')).statusCode).toBe(404)

    // B peut avoir sa propre version pour le même mois.
    expect((await appeler(b.id, 'POST', '/salaire/contrats', CONTRAT)).statusCode).toBe(201)
    expect((await appeler(a.id, 'GET', '/mois/2027-02')).json().paie.statut).toBe('recue')
  })
})
