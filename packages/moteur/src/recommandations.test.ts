import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import type { Depense } from './depenses'
import type { CompteEpargne, Objectif } from './epargne'
import { indicateurs, partVariable } from './indicateurs'
import { creerCalendrier } from './periodes'
import { alertes, recommandations } from './recommandations'
import type { SourceRevenu } from './revenus'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Salaire 10 000 DH le 27, qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv. Aujourd'hui : dimanche 10 janv.
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }
const paieJanvier: PaieEnregistree = {
  moisFinance: m('2027-01'),
  dateReelle: d('2026-12-27'),
  datePrevue: d('2026-12-27'),
  lignes: [{ id: 'l1', type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null }],
}
const charge = (id: string, nature: Charge['nature'], montant: number, modif: Partial<Charge> = {}): Charge => ({
  id,
  libelle: id,
  categorieId: id,
  nature,
  montant: centimes(montant),
  frequence: 'mensuelle',
  mois: [],
  jour: nature === 'fixe' ? 5 : null,
  debut: m('2026-11'),
  fin: null,
  essentielle: false,
  ...modif,
})
const loyer = charge('Loyer', 'fixe', 350_000, { essentielle: true })
const internet = charge('Internet', 'fixe', 30_000, { jour: 8 })
// Courses : 2 000 DH consommés par semaine, avec un montant mis pour chaque semaine ; loisirs : consommés librement.
const courses = charge('Courses', 'enveloppe', 200_000, {
  essentielle: true,
  unite: 'semaine',
  semaines: [
    { debut: d('2026-12-27'), montant: centimes(10_000) },
    { debut: d('2026-12-28'), montant: centimes(50_000) },
    { debut: d('2027-01-04'), montant: centimes(50_000) },
    { debut: d('2027-01-11'), montant: centimes(50_000) },
    { debut: d('2027-01-18'), montant: centimes(40_000) },
  ],
})
const loisirs = charge('Loisirs', 'enveloppe', 150_000)
const source = (id: string, modif: Partial<SourceRevenu>): SourceRevenu => ({
  id,
  libelle: id,
  type: 'variable',
  montant: centimes(100_000),
  frequence: 'mensuelle',
  mois: [],
  versement: 'dateSeparee',
  jour: 10,
  certitude: 'probable',
  debut: m('2027-02'),
  fin: null,
  ...modif,
})
const cours = source('Cours', {})
const prime = source('Prime', { type: 'prime', montant: centimes(500_000), frequence: 'unique', debut: m('2027-03'), fin: m('2027-03') })
const depense = (id: string, date: string, montant: number, modif: Partial<Depense> = {}): Depense => ({
  id,
  date: d(date),
  montant: centimes(montant),
  categorieId: 'x',
  libelle: '',
  chargeId: null,
  echeance: null,
  ponctuelId: null,
  ...modif,
})
const depensesJanvier = [depense('d1', '2027-01-05', 350_000, { chargeId: 'Loyer', echeance: d('2027-01-05') }), depense('d2', '2027-01-06', 230_000, { chargeId: 'Courses' })]
const objectif = (id: string, modif: Partial<Objectif>): Objectif => ({
  id,
  libelle: id,
  type: 'autre',
  montantCible: centimes(100_000),
  montantInitial: centimes(0),
  dateCible: null,
  priorite: 1,
  versementMensuel: null,
  statut: 'actif',
  realiseLe: null,
  creeLe: d('2026-12-01'),
  ...modif,
})
const moto = objectif('Moto', { type: 'moto', montantCible: centimes(8_500_000), montantInitial: centimes(200_000), dateCible: m('2027-12') })
const permis = objectif('Permis', { montantCible: centimes(300_000), dateCible: m('2027-06'), priorite: 2, versementMensuel: centimes(100_000) })
const comptes: CompteEpargne[] = [{ id: 'cih', libelle: 'CIH', solde: centimes(1_000_000), auLe: d('2027-01-01') }]

const AUJOURDHUI = d('2027-01-10')

function cadre({ aujourdhui = AUJOURDHUI, paies = [paieJanvier], depenses = depensesJanvier, objectifs = [moto, permis], sources = [cours, prime] } = {}) {
  const calendrier = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies, sources, charges: [loyer, internet, courses, loisirs], depenses, objectifs, aujourdhui })
  return { calendrier, donnees: { objectifs, comptes, mouvementsEpargne: [] } }
}

const types = <T extends { type: string }>(liste: T[]) => liste.map((x) => x.type)
const trouver = <T extends { type: string }, K extends T['type']>(liste: T[], type: K) => liste.find((x) => x.type === type) as Extract<T, { type: K }> | undefined

describe('KPI (Plan.md § 8)', () => {
  it('reste à dépenser : reçu − sorties − charges datées à payer − épargne prévue restante, et par jour', () => {
    const { calendrier, donnees } = cadre()
    const k = indicateurs(calendrier, donnees, m('2027-01'), { aujourdhui: AUJOURDHUI })
    // 10 000 − (3 500 + 2 300) − 300 (internet, pas payé) − 1 000 (permis) = 2 900 DH, sur 17 jours (10 → 26 janv.).
    expect(k.resteADepenser).toEqual({ montant: 290_000, nature: 'reel', revenus: 1_000_000, sorties: 580_000, engagements: 30_000, epargneRestante: 100_000, joursRestants: 17, parJour: 17_058 })
  })

  it('avant la paie du mois : la paie prévue compte, marquée « prévu »', () => {
    const { calendrier, donnees } = cadre({ paies: [], depenses: [] })
    const k = indicateurs(calendrier, donnees, m('2027-01'), { aujourdhui: AUJOURDHUI })
    expect(k.resteADepenser).toMatchObject({ nature: 'prevu', revenus: 1_000_000, sorties: 0 })
  })

  it('taux d’épargne et de charges : réel et prévu séparés ; écart au plan à date', () => {
    const { calendrier, donnees } = cadre()
    const k = indicateurs(calendrier, donnees, m('2027-01'), { aujourdhui: AUJOURDHUI })
    expect(k.tauxEpargne).toMatchObject({ reel: 0, prevu: 0.1 })
    // Charges prévues : 3 500 + 300 + 2 000 + 1 500 = 7 300 DH.
    expect(k.tauxCharges).toMatchObject({ reel: 0.58, prevu: 0.73 })
    expect(k.ecart).toMatchObject({ base: 'aDate', reel: 580_000 })
    expect(k.ecart!.montant).toBe(k.ecart!.reel - k.ecart!.prevu)
    // Semaine du 4 au 10 janv. : 2 300 DH dépensés pour les 500 DH mis sur cette semaine.
    expect(k.resteSemaine).toMatchObject({ numero: 3, disponible: 50_000, depense: 230_000, joursRestants: 1, parJour: 0 })
    expect(k.resteSemaine!.reste).toBeLessThan(0)
  })

  it('mois terminé : écart sur le mois entier ; mois à venir : pas d’écart ni de reste ; sans revenu, un taux est vide', () => {
    const paieFevrier = { ...paieJanvier, moisFinance: m('2027-02'), dateReelle: d('2027-01-27'), datePrevue: d('2027-01-27') }
    const { calendrier, donnees } = cadre({ aujourdhui: d('2027-02-01'), paies: [paieJanvier, paieFevrier] })
    const janvier = indicateurs(calendrier, donnees, m('2027-01'), { aujourdhui: d('2027-02-01') })
    expect(janvier.ecart).toEqual({ montant: -150_000, pourcentage: -150_000 / 730_000, prevu: 730_000, reel: 580_000, base: 'mois' })
    expect(janvier.resteADepenser).toBeNull()
    const mars = indicateurs(calendrier, donnees, m('2027-03'), { aujourdhui: d('2027-02-01') })
    expect(mars.ecart).toBeNull()
    expect(mars.tauxCharges.reel).toBeNull()
  })

  it('part variable : primes et variables ÷ revenus des 12 prochains mois ; objectif prioritaire', () => {
    const { calendrier, donnees } = cadre()
    // 12 salaires (120 000) + cours de février à décembre (11 000) + prime de mars (5 000).
    expect(partVariable(calendrier, m('2027-01'))).toEqual({ part: 16_000 / 136_000, variable: 1_600_000, total: 13_600_000, du: '2027-01', au: '2027-12' })
    const k = indicateurs(calendrier, donnees, m('2027-01'), { aujourdhui: AUJOURDHUI })
    expect(k.objectif).toMatchObject({ id: 'Moto', progression: 200_000 / 8_500_000, dateCible: '2027-12' })
    expect(k.objectif!.retardMois).toBeGreaterThan(0)
  })
})

describe('alertes (cloche)', () => {
  it('échéance en retard, enveloppe dépassée, semaine dépassée ; rien pour un mois clôturé', () => {
    const { calendrier, donnees } = cadre()
    const liste = alertes(calendrier, donnees, { aujourdhui: AUJOURDHUI })
    expect(types(liste)).toEqual(['echeanceEnRetard', 'enveloppeDepassee', 'semaineDepassee'])
    expect(trouver(liste, 'echeanceEnRetard')).toMatchObject({ origine: 'fixe', libelle: 'Internet', date: '2027-01-08', reste: 30_000 })
    expect(trouver(liste, 'enveloppeDepassee')).toMatchObject({ libelle: 'Courses', depassement: 30_000 })
    // Reste flexible du mois : 3 500 − 2 300 = 1 200 DH sur 17 jours.
    expect(trouver(liste, 'semaineDepassee')).toMatchObject({ joursRestants: 0, budgetMoisRestant: 120_000, parJourMois: 7_058, joursRestantsMois: 17 })
    expect(alertes(calendrier, donnees, { aujourdhui: AUJOURDHUI, moisClos: [m('2027-01')] })).toEqual([])
  })

  it('paie en retard, paie prévue aujourd’hui, revenu en retard', () => {
    const enRetard = cadre({ aujourdhui: d('2026-12-29'), paies: [], depenses: [] })
    expect(alertes(enRetard.calendrier, enRetard.donnees, { aujourdhui: d('2026-12-29') })).toContainEqual(
      expect.objectContaining({ type: 'paieEnRetard', mois: '2027-01', datePrevue: '2026-12-27', joursDeRetard: 2, montant: 1_000_000 }),
    )
    const jour = cadre({ aujourdhui: d('2026-12-27'), paies: [], depenses: [] })
    expect(types(alertes(jour.calendrier, jour.donnees, { aujourdhui: d('2026-12-27') }))).toContain('paieAujourdhui')
    const revenu = cadre({ aujourdhui: d('2027-02-15'), paies: [paieJanvier, { ...paieJanvier, moisFinance: m('2027-02'), dateReelle: d('2027-01-27'), datePrevue: d('2027-01-27') }], depenses: [] })
    expect(alertes(revenu.calendrier, revenu.donnees, { aujourdhui: d('2027-02-15') })).toContainEqual(
      expect.objectContaining({ type: 'revenuEnRetard', libelle: 'Cours', datePrevue: '2027-02-10', montant: 100_000 }),
    )
  })

  it('objectifs au-delà de l’épargne déclarée (R14)', () => {
    const { calendrier, donnees } = cadre({ objectifs: [{ ...moto, montantInitial: centimes(1_200_000) }] })
    expect(trouver(alertes(calendrier, donnees, { aujourdhui: AUJOURDHUI }), 'reserveDepasse')).toEqual({ cle: 'reserve', type: 'reserveDepasse', depassement: 200_000 })
  })
})

describe('recommandations (Plan.md § 7.5)', () => {
  const tout = () => {
    const { calendrier, donnees } = cadre()
    return recommandations(calendrier, donnees, { aujourdhui: AUJOURDHUI, essentielMensuel: centimes(550_000) })
  }

  it('effort pour tenir la date : restant réel ÷ mois restants, confiance élevée', () => {
    const effort = trouver(tout(), 'effort')
    // Moto : 83 000 DH à réunir de janvier à décembre (12 mois).
    expect(effort).toMatchObject({ objectifId: 'Moto', effortMensuel: 691_667, effortHebdo: 159_616, risque: 'horsPortee', confiance: 'elevee', dateDepassee: false })
  })

  it('leviers chiffrés pour le premier objectif à risque : réduire Loisirs, la prime de mars, l’épargne disponible', () => {
    const liste = tout()
    // Loisirs (1 500 DH, non essentielle) − 10 % arrondi à 100 DH = 200 DH par mois : la moto passe de novembre à octobre 2028.
    expect(trouver(liste, 'reduction')).toMatchObject({ objectifId: 'Moto', charge: 'Loisirs', budget: 150_000, montant: 20_000, avant: '2028-11', apres: '2028-10', gainMois: 1, confiance: 'moyenne' })
    // Prime probable, retenue par le réaliste : sans elle, la moto arriverait un mois plus tard.
    expect(trouver(liste, 'prime')).toMatchObject({ source: 'Prime', montant: 500_000, certitude: 'probable', date: '2027-03-10', avant: '2028-12', apres: '2028-11', gainMois: 1, confiance: 'moyenne' })
    // Épargne : 10 000 DH déclarés, 2 000 réservés à la moto → 8 000 DH disponibles, deux mois gagnés.
    expect(trouver(liste, 'disponible')).toMatchObject({ montant: 800_000, avant: '2028-11', apres: '2028-09', gainMois: 2 })
    expect(types(liste)).toEqual(['effort', 'reduction', 'prime', 'disponible', 'fondsSecurite'])
  })

  it('fonds de sécurité : 3 mois de charges essentielles, sauf s’il existe déjà', () => {
    expect(trouver(tout(), 'fondsSecurite')).toMatchObject({ essentielMensuel: 550_000, cible: 1_650_000, confiance: 'elevee' })
    const { calendrier, donnees } = cadre({ objectifs: [objectif('Fonds', { type: 'securite' })] })
    expect(types(recommandations(calendrier, donnees, { aujourdhui: AUJOURDHUI, essentielMensuel: centimes(550_000) }))).not.toContain('fondsSecurite')
  })

  it('fin de mois : estimation négative → montant à économiser par jour', () => {
    const { calendrier, donnees } = cadre({ depenses: [...depensesJanvier, depense('d3', '2027-01-09', 600_000)] })
    const fin = trouver(recommandations(calendrier, donnees, { aujourdhui: AUJOURDHUI }), 'finDeMois')!
    // Reçu 10 000 ; sorti 11 800 ; encore prévu : internet 300 + loisirs 1 500 → −3 600 DH.
    expect(fin).toEqual({ cle: 'finDeMois:2027-01', type: 'finDeMois', confiance: 'moyenne', mois: '2027-01', manque: 360_000, fin: '2027-01-26', joursRestants: 17, parJour: 21_177 })
  })

  it('calme : rien pour un objectif sûr, ni sans objectif', () => {
    const { calendrier, donnees } = cadre({ objectifs: [objectif('Petit', { montantCible: centimes(100_000), dateCible: m('2027-12') })] })
    const liste = recommandations(calendrier, donnees, { aujourdhui: AUJOURDHUI })
    expect(liste).toEqual([])
    const vide = cadre({ objectifs: [] })
    expect(recommandations(vide.calendrier, vide.donnees, { aujourdhui: AUJOURDHUI })).toEqual([])
  })

  it('une recommandation ne modifie jamais les données', () => {
    const { calendrier, donnees } = cadre()
    const copie = structuredClone(donnees)
    recommandations(calendrier, donnees, { aujourdhui: AUJOURDHUI })
    alertes(calendrier, donnees, { aujourdhui: AUJOURDHUI })
    expect(donnees).toEqual(copie)
  })
})

