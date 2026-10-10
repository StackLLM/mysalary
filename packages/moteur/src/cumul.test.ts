import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge } from './charges'
import { evenementsDuMois, grilleDesJours } from './annee'
import { cumulDesMois, debutCumul, resumeCumul } from './cumul'
import { lireCleMois as m, lireDate as d } from './dates'
import type { Depense } from './depenses'
import type { MouvementEpargne, Objectif } from './epargne'
import { REGLES_SCENARIOS_DEFAUT } from './objectifs'
import { creerCalendrier } from './periodes'
import type { SourceRevenu } from './revenus'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Salaire 10 000 DH le 27, qui finance le mois suivant. « Décembre » : 27 nov. → 26 déc. ; « janvier » : 27 déc. → 26 janv.
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }
const paie = (mois: string, date: string): PaieEnregistree => ({
  moisFinance: m(mois),
  dateReelle: d(date),
  datePrevue: d(date),
  lignes: [{ id: mois, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null }],
})
const charge = (id: string, nature: Charge['nature'], montant: number): Charge => ({
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
})
const depense = (id: string, date: string, montant: number, chargeId: string, echeance: string | null = null): Depense => ({
  id,
  date: d(date),
  montant: centimes(montant),
  categorieId: chargeId,
  libelle: '',
  chargeId,
  echeance: echeance ? d(echeance) : null,
  ponctuelId: null,
})
const cours: SourceRevenu = {
  id: 'cours',
  libelle: 'Cours',
  type: 'variable',
  montant: centimes(100_000),
  frequence: 'mensuelle',
  mois: [],
  versement: 'dateSeparee',
  jour: 10,
  certitude: 'probable',
  debut: m('2027-02'),
  fin: null,
}
const moto: Objectif = {
  id: 'moto',
  libelle: 'Moto',
  type: 'moto',
  montantCible: centimes(10_000_000),
  montantInitial: centimes(0),
  dateCible: null,
  priorite: 1,
  versementMensuel: centimes(100_000),
  statut: 'actif',
  realiseLe: null,
  creeLe: d('2026-11-01'),
}
const versement: MouvementEpargne = { id: 'v', compteId: 'cih', objectifId: 'moto', type: 'versement', date: d('2026-12-20'), montant: centimes(100_000), libelle: '' }
const AUJOURDHUI = d('2027-01-10')

const calendrier = (depenses: Depense[] = []) =>
  creerCalendrier({
    mode: 'cyclePaie',
    contrats: [contrat],
    paies: [paie('2026-12', '2026-11-27'), paie('2027-01', '2026-12-27')],
    sources: [cours],
    charges: [charge('Loyer', 'fixe', 350_000), charge('Courses', 'enveloppe', 200_000)],
    depenses,
    objectifs: [moto],
    mouvementsEpargne: [versement],
    aujourdhui: AUJOURDHUI,
  })
const depenses = [
  depense('d1', '2026-12-05', 350_000, 'Loyer', '2026-12-05'),
  depense('d2', '2026-12-10', 180_000, 'Courses'),
  depense('d3', '2027-01-05', 350_000, 'Loyer', '2027-01-05'),
  depense('d4', '2027-01-06', 50_000, 'Courses'),
]

describe('cumul de mois en mois (lot 13)', () => {
  it('le reste de chaque mois s’ajoute au suivant : réel, puis réel + prévu restant, puis prévu', () => {
    const [decembre, janvier, fevrier] = cumulDesMois(calendrier(depenses), m('2026-12'), m('2027-02'), { aujourdhui: AUJOURDHUI })
    // Décembre (réel) : 10 000 − (3 500 + 1 800) − 1 000 d'épargne versée = 3 700 DH.
    expect(decembre).toMatchObject({ nature: 'reel', premier: true, report: 0, revenus: 1_000_000, charges: 530_000, apresCharges: 470_000, epargne: 100_000, reste: 370_000, cumul: 370_000, dontReel: null })
    // Janvier (en cours) : 10 000 − (4 000 sortis + 1 500 de courses encore prévues) − 1 000 de versement prévu = 3 500 DH.
    expect(janvier).toMatchObject({
      nature: 'enCours',
      premier: false,
      report: 370_000,
      revenus: 1_000_000,
      charges: 550_000,
      epargne: 100_000,
      reste: 350_000,
      cumul: 720_000,
      dontReel: { revenus: 1_000_000, charges: 400_000, epargne: 0 },
    })
    // Février (prévu, réaliste) : 10 000 + 1 000 de cours probables − 5 500 − 1 000 = 4 500 DH.
    expect(fevrier).toMatchObject({ nature: 'prevu', report: 720_000, revenus: 1_100_000, charges: 550_000, epargne: 100_000, reste: 450_000, cumul: 1_170_000 })
  })

  it('la règle du scénario décide des revenus futurs retenus', () => {
    const [fevrier] = cumulDesMois(calendrier(depenses), m('2027-02'), m('2027-02'), { aujourdhui: AUJOURDHUI, regle: REGLES_SCENARIOS_DEFAUT.prudent })
    expect(fevrier).toMatchObject({ revenus: 1_000_000, report: 720_000, cumul: 1_070_000 })
  })

  it('point de départ : solde déclaré, sinon le mois de la première donnée réelle ; rien avant', () => {
    const c = calendrier(depenses)
    expect(debutCumul(c, AUJOURDHUI)).toBe('2026-12')
    const [novembre, decembre] = cumulDesMois(c, m('2026-11'), m('2026-12'), { aujourdhui: AUJOURDHUI })
    expect(novembre).toMatchObject({ nature: 'avant', report: null, cumul: null })
    expect(decembre!.report).toBe(0)

    const avecDepart = cumulDesMois(c, m('2026-12'), m('2027-01'), { aujourdhui: AUJOURDHUI, depart: { mois: m('2027-01'), solde: centimes(200_000) } })
    expect(avecDepart.map((x) => [x.cle, x.nature, x.report, x.cumul])).toEqual([
      ['2026-12', 'avant', null, null],
      ['2027-01', 'enCours', 200_000, 550_000],
    ])
    // Un solde à découvert est permis.
    expect(cumulDesMois(c, m('2027-01'), m('2027-01'), { aujourdhui: AUJOURDHUI, depart: { mois: m('2027-01'), solde: centimes(-500_000) } })[0]!.cumul).toBe(-150_000)
  })

  it('sans aucune donnée réelle : le cumul part du mois en cours, à zéro', () => {
    const vide = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [], charges: [charge('Loyer', 'fixe', 350_000)], aujourdhui: AUJOURDHUI })
    const [janvier, fevrier] = cumulDesMois(vide, m('2027-01'), m('2027-02'), { aujourdhui: AUJOURDHUI })
    expect(janvier).toMatchObject({ report: 0, revenus: 1_000_000, charges: 350_000, cumul: 650_000 })
    expect(fevrier).toMatchObject({ report: 650_000, cumul: 1_300_000 })
  })

  it('résumé d’une année : totaux des mois suivis, cumul de fin, mois le plus bas', () => {
    const mois = cumulDesMois(calendrier(depenses), m('2026-11'), m('2027-02'), { aujourdhui: AUJOURDHUI })
    expect(resumeCumul(mois)).toEqual({
      revenus: 3_100_000,
      charges: 1_630_000,
      epargne: 300_000,
      reste: 1_170_000,
      cumulFin: 1_170_000,
      plusBas: { cle: '2026-12', cumul: 370_000 },
      negatifs: [],
      natures: { reel: 1, enCours: 1, prevu: 1 },
    })
    const decouvert = cumulDesMois(calendrier(depenses), m('2027-01'), m('2027-02'), { aujourdhui: AUJOURDHUI, depart: { mois: m('2027-01'), solde: centimes(-500_000) } })
    expect(resumeCumul(decouvert)).toMatchObject({ cumulFin: 300_000, plusBas: { cle: '2027-01', cumul: -150_000 }, negatifs: ['2027-01'] })
    expect(resumeCumul(mois.slice(0, 1))).toMatchObject({ revenus: 0, cumulFin: null, plusBas: null })
  })
})

describe('calendrier de l’année (lot 14)', () => {
  it('revenus et charges datés du mois, réel s’il existe ; les enveloppes n’ont pas de date', () => {
    const evenements = evenementsDuMois(calendrier(depenses), m('2027-01'))
    expect(evenements.map((e) => [e.date, e.type, e.libelle, e.montant, e.statut])).toEqual([
      ['2026-12-27', 'revenu', 'Salaire', 1_000_000, 'confirme'],
      ['2027-01-05', 'charge', 'Loyer', 350_000, 'confirme'],
    ])
    expect(evenementsDuMois(calendrier(), m('2027-02')).map((e) => [e.date, e.libelle, e.statut])).toEqual([
      ['2027-01-27', 'Salaire', 'prevu'],
      ['2027-02-05', 'Loyer', 'prevu'],
      ['2027-02-10', 'Cours', 'prevu'],
    ])
  })

  it('grille des jours : semaines de 7 cases, vides hors période, début lundi ou dimanche', () => {
    // 27 déc. 2026 est un dimanche ; 26 janv. 2027 un mardi.
    const lundi = grilleDesJours(d('2026-12-27'), d('2027-01-26'))
    expect(lundi).toHaveLength(6)
    expect(lundi[0]).toEqual([null, null, null, null, null, null, '2026-12-27'])
    expect(lundi.at(-1)).toEqual(['2027-01-25', '2027-01-26', null, null, null, null, null])
    const dimanche = grilleDesJours(d('2026-12-27'), d('2027-01-26'), 7)
    expect(dimanche[0]![0]).toBe('2026-12-27')
    expect(dimanche.flat().filter(Boolean)).toHaveLength(31)
  })
})
