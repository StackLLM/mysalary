import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }
const PRIME_JUIN = { libelle: 'Prime de juin', type: 'prime', montant: 100_000, frequence: 'moisChoisis', mois: [6], versement: 'avecPaie', certitude: 'probable', debut: '2027-01' }
const FREELANCE = { libelle: 'Freelance', type: 'variable', montant: 200_000, frequence: 'mensuelle', versement: 'dateSeparee', jour: 10, certitude: 'incertain', debut: '2027-01' }

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function compte(prenom = 'A') {
  const c = await creerCompte(ctx.app, prenom)
  expect((await appeler(c.id, 'POST', '/salaire/contrats', CONTRAT)).statusCode).toBe(201)
  return c
}

async function creerSource(id: string, saisie: object) {
  const reponse = await appeler(id, 'POST', '/revenus/sources', saisie)
  expect(reponse.statusCode).toBe(201)
  return reponse.json().id as string
}

describe('sources de revenus', () => {
  it('liste la source avec son équivalent mensuel et son prochain versement', async () => {
    const c = await compte()
    ctx.jour = '2027-01-05'
    await creerSource(c.id, PRIME_JUIN)
    const [source] = (await appeler(c.id, 'GET', '/revenus/sources')).json()
    expect(source).toMatchObject({ libelle: 'Prime de juin', mois: [6], jour: null, equivalentMensuel: 8_333, active: true, prochainVersement: { date: '2027-06-27', moisVersement: '2027-06' } })
  })

  it('refuse une source incomplète, champ par champ', async () => {
    const c = await compte()
    const reponse = await appeler(c.id, 'POST', '/revenus/sources', { ...FREELANCE, jour: undefined })
    expect(reponse.statusCode).toBe(400)
    expect(reponse.json().erreur.champs).toHaveProperty('jour')
  })

  it('une prime avec la paie s’ajoute à la paie, puis se fige à la réception', async () => {
    const c = await compte()
    ctx.jour = '2027-06-28'
    const id = await creerSource(c.id, PRIME_JUIN)
    const juillet = (await appeler(c.id, 'GET', '/mois/2027-07')).json().paie
    expect(juillet.totalPrevu).toBe(1_100_000)
    const prime = juillet.lignes.find((l: { sourceId: string | null }) => l.sourceId === id)

    await appeler(c.id, 'POST', '/salaire/paies/2027-07/reception', {
      dateReelle: '2027-06-27',
      salaireRecu: 1_000_000,
      primes: [{ sourceId: prime.sourceId, libelle: prime.libelle, montantRecu: 90_000 }],
    })
    // La source change ensuite : la paie reçue ne bouge pas (R27).
    await appeler(c.id, 'PUT', `/revenus/sources/${id}`, { ...PRIME_JUIN, montant: 500_000 })
    const recue = (await appeler(c.id, 'GET', '/mois/2027-07')).json().paie
    expect(recue).toMatchObject({ statut: 'recue', totalPrevu: 1_100_000, totalRecu: 1_090_000, ecart: -10_000 })

    const { revenus } = (await appeler(c.id, 'GET', '/revenus/prevus?du=2027-06&au=2027-06')).json()
    expect(revenus).toMatchObject([{ statut: 'recu', montantPrevu: 100_000, montantRecu: 90_000, moisBudget: '2027-07' }])

    // Annuler la réception : la prime redevient calculée depuis la source (nouveau montant).
    await appeler(c.id, 'DELETE', '/salaire/paies/2027-07/reception')
    expect((await appeler(c.id, 'GET', '/mois/2027-07')).json().paie.totalPrevu).toBe(1_500_000)
  })
})

describe('revenus reçus', () => {
  it('lie un revenu reçu à un versement prévu, avec l’écart', async () => {
    const c = await compte()
    ctx.jour = '2027-01-20'
    const id = await creerSource(c.id, FREELANCE)
    const recu = await appeler(c.id, 'POST', '/revenus/recus', { sourceId: id, moisOccurrence: '2027-01', date: '2027-01-12', montant: 150_000 })
    expect(recu.statusCode).toBe(201)
    expect(recu.json()).toMatchObject({ libelle: 'Freelance', montant: 150_000 })

    const { revenus } = (await appeler(c.id, 'GET', '/revenus/prevus?du=2027-01&au=2027-02')).json()
    expect(revenus.map((r: { statut: string; ecart: number | null }) => [r.statut, r.ecart])).toEqual([
      ['recu', -50_000],
      ['prevu', null],
    ])

    const doublon = await appeler(c.id, 'POST', '/revenus/recus', { sourceId: id, moisOccurrence: '2027-01', date: '2027-01-13', montant: 1 })
    expect(doublon.statusCode).toBe(409)
  })

  it('refuse un revenu futur, un mois sans versement, une prime versée avec la paie', async () => {
    const c = await compte()
    ctx.jour = '2027-01-20'
    const freelance = await creerSource(c.id, FREELANCE)
    const prime = await creerSource(c.id, PRIME_JUIN)
    expect((await appeler(c.id, 'POST', '/revenus/recus', { libelle: 'Cadeau', date: '2027-01-21', montant: 1 })).statusCode).toBe(422)
    expect((await appeler(c.id, 'POST', '/revenus/recus', { sourceId: freelance, moisOccurrence: '2026-12', date: '2027-01-10', montant: 1 })).statusCode).toBe(422)
    const avecPaie = await appeler(c.id, 'POST', '/revenus/recus', { sourceId: prime, moisOccurrence: '2027-06', date: '2027-01-10', montant: 1 })
    expect(avecPaie.statusCode).toBe(422)
    expect(avecPaie.json().erreur.message).toContain('versée avec la paie')
  })

  it('supprimer une source garde ses revenus reçus, devenus libres', async () => {
    const c = await compte()
    ctx.jour = '2027-01-20'
    const id = await creerSource(c.id, FREELANCE)
    await appeler(c.id, 'POST', '/revenus/recus', { sourceId: id, moisOccurrence: '2027-01', date: '2027-01-12', montant: 150_000 })
    expect((await appeler(c.id, 'DELETE', `/revenus/sources/${id}`)).statusCode).toBe(204)
    expect((await appeler(c.id, 'GET', '/revenus/recus')).json()).toMatchObject([{ libelle: 'Freelance', montant: 150_000, sourceId: null, moisOccurrence: null }])
  })

  it('résume le mois en cours et les 12 prochains mois par certitude', async () => {
    const c = await compte()
    ctx.jour = '2027-01-20'
    const id = await creerSource(c.id, FREELANCE)
    await creerSource(c.id, PRIME_JUIN)
    await appeler(c.id, 'POST', '/revenus/recus', { sourceId: id, moisOccurrence: '2027-01', date: '2027-01-12', montant: 150_000 })
    await appeler(c.id, 'POST', '/revenus/recus', { libelle: 'Cadeau', date: '2027-01-15', montant: 30_000 })

    const resume = (await appeler(c.id, 'GET', '/revenus/resume')).json()
    expect(resume.moisCourant).toBe('2027-01')
    expect(resume.moisEnCours).toMatchObject({ prevu: { incertain: 200_000 }, recu: 180_000 })
    expect(resume.douzeMois.totaux).toMatchObject({ probable: 100_000, incertain: 2_400_000, realiste: 100_000, ambitieux: 2_500_000 })
    expect(resume.prochains[0]).toMatchObject({ libelle: 'Freelance', datePrevue: '2027-02-10' })
  })
})

describe('isolation des revenus', () => {
  it('B ne voit ni ne touche les revenus de A', async () => {
    const a = await compte('A')
    const b = await compte('B')
    ctx.jour = '2027-01-20'
    const id = await creerSource(a.id, FREELANCE)
    const recu = (await appeler(a.id, 'POST', '/revenus/recus', { sourceId: id, moisOccurrence: '2027-01', date: '2027-01-12', montant: 1 })).json()

    expect((await appeler(b.id, 'GET', '/revenus/sources')).json()).toEqual([])
    expect((await appeler(b.id, 'GET', '/revenus/recus')).json()).toEqual([])
    expect((await appeler(b.id, 'PUT', `/revenus/sources/${id}`, FREELANCE)).statusCode).toBe(404)
    expect((await appeler(b.id, 'DELETE', `/revenus/recus/${recu.id}`)).statusCode).toBe(404)
    expect((await appeler(b.id, 'POST', '/revenus/recus', { sourceId: id, moisOccurrence: '2027-02', date: '2027-01-12', montant: 1 })).statusCode).toBe(404)
  })
})
