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
    // Décembre (réel) : 10 000 − (3 500 + 1 800) − 1 000 d'épargne versée (confirmée) = 3 700 DH.
    expect(decembre).toMatchObject({ nature: 'reel', premier: true, report: 0, revenus: 1_000_000, charges: 530_000, apresCharges: 470_000, epargne: 100_000, epargneConfirmee: 100_000, epargneAConfirmer: 0, reste: 370_000, cumul: 370_000, cumulApresPrevu: 370_000, dontReel: null })
    // Janvier (en cours) : 10 000 − (4 000 sortis + 1 500 de courses encore prévues) = 4 500 DH. Le versement prévu de 1 000 DH
    // n'est pas confirmé : il n'est pas retiré, il reste « à confirmer ».
    expect(janvier).toMatchObject({
      nature: 'enCours',
      premier: false,
      report: 370_000,
      revenus: 1_000_000,
      charges: 550_000,
      epargne: 100_000,
      epargneConfirmee: 0,
      epargneAConfirmer: 100_000,
      reste: 450_000,
      cumul: 820_000,
      cumulApresPrevu: 720_000,
      dontReel: { revenus: 1_000_000, charges: 400_000, epargne: 0 },
    })
    // Février (prévu, réaliste) : 10 000 + 1 000 de cours probables − 5 500 = 5 500 DH ; 1 000 DH d'épargne à confirmer.
    expect(fevrier).toMatchObject({ nature: 'prevu', report: 820_000, revenus: 1_100_000, charges: 550_000, epargne: 100_000, epargneConfirmee: 0, epargneAConfirmer: 100_000, reste: 550_000, cumul: 1_370_000, cumulApresPrevu: 1_170_000 })
  })

  it('l’épargne n’est retirée du cumul qu’une fois versée : revenus − charges − épargne confirmée', () => {
    const [, janvier] = cumulDesMois(calendrier(depenses), m('2026-12'), m('2027-01'), { aujourdhui: AUJOURDHUI })
    expect(janvier!.report! + janvier!.revenus - janvier!.charges - janvier!.epargneConfirmee).toBe(janvier!.cumul)
    // Le versement de janvier fait (1 000 DH le 8) : il est retiré, et il n'est plus « à confirmer ».
    const fait: MouvementEpargne = { ...versement, id: 'v2', date: d('2027-01-08') }
    const apres = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [paie('2026-12', '2026-11-27'), paie('2027-01', '2026-12-27')], sources: [cours], charges: [charge('Loyer', 'fixe', 350_000), charge('Courses', 'enveloppe', 200_000)], depenses, objectifs: [moto], mouvementsEpargne: [versement, fait], aujourdhui: AUJOURDHUI })
    const [, janvierFait] = cumulDesMois(apres, m('2026-12'), m('2027-01'), { aujourdhui: AUJOURDHUI })
    expect(janvierFait).toMatchObject({ epargneConfirmee: 100_000, epargneAConfirmer: 0, reste: 350_000, cumul: 720_000 })
  })

  it('la règle du scénario décide des revenus futurs retenus', () => {
    const [fevrier] = cumulDesMois(calendrier(depenses), m('2027-02'), m('2027-02'), { aujourdhui: AUJOURDHUI, regle: REGLES_SCENARIOS_DEFAUT.prudent })
    expect(fevrier).toMatchObject({ revenus: 1_000_000, report: 820_000, cumul: 1_270_000, cumulApresPrevu: 1_070_000 })
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
      ['2027-01', 'enCours', 200_000, 650_000],
    ])
    // Un solde à découvert est permis.
    expect(cumulDesMois(c, m('2027-01'), m('2027-01'), { aujourdhui: AUJOURDHUI, depart: { mois: m('2027-01'), solde: centimes(-500_000) } })[0]!.cumul).toBe(-50_000)
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
      epargne: 100_000,
      epargneAConfirmer: 200_000,
      reste: 1_370_000,
      cumulFin: 1_370_000,
      plusBas: { cle: '2026-12', cumul: 370_000 },
      negatifs: [],
      natures: { reel: 1, enCours: 1, prevu: 1 },
    })
    const decouvert = cumulDesMois(calendrier(depenses), m('2027-01'), m('2027-02'), { aujourdhui: AUJOURDHUI, depart: { mois: m('2027-01'), solde: centimes(-500_000) } })
    expect(resumeCumul(decouvert)).toMatchObject({ cumulFin: 500_000, plusBas: { cle: '2027-01', cumul: -50_000 }, negatifs: ['2027-01'] })
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

describe('correction du cumul en fin de mois (lot 35)', () => {
  const corrige = (corrections: { mois: string; solde: number }[]) =>
    creerCalendrier({
      mode: 'cyclePaie',
      contrats: [contrat],
      paies: [paie('2026-12', '2026-11-27'), paie('2027-01', '2026-12-27')],
      sources: [cours],
      charges: [charge('Loyer', 'fixe', 350_000), charge('Courses', 'enveloppe', 200_000)],
      depenses,
      objectifs: [moto],
      mouvementsEpargne: [versement],
      correctionsCumul: corrections.map((c) => ({ mois: m(c.mois), solde: centimes(c.solde) })),
      aujourdhui: AUJOURDHUI,
    })

  it('le solde déclaré remplace le cumul du mois terminé ; l’écart reste à part, le reste du mois ne change pas', () => {
    // Décembre calculé : 3 700 DH. Le compte affiche 3 000 DH : 700 DH de sorties non saisies.
    const [decembre, janvier, fevrier] = cumulDesMois(corrige([{ mois: '2026-12', solde: 300_000 }]), m('2026-12'), m('2027-02'), { aujourdhui: AUJOURDHUI })
    expect(decembre).toMatchObject({ nature: 'reel', charges: 530_000, reste: 370_000, cumulCalcule: 370_000, ecart: -70_000, cumul: 300_000, cumulApresPrevu: 300_000 })
    // Les mois suivants partent du solde déclaré, et les projections aussi.
    expect(janvier).toMatchObject({ report: 300_000, cumulCalcule: 750_000, ecart: null, cumul: 750_000, cumulApresPrevu: 650_000 })
    expect(fevrier).toMatchObject({ report: 750_000, cumul: 1_300_000, cumulApresPrevu: 1_100_000 })
  })

  it('un écart positif (revenu non saisi) est gardé tel quel', () => {
    const [decembre] = cumulDesMois(corrige([{ mois: '2026-12', solde: 400_000 }]), m('2026-12'), m('2026-12'), { aujourdhui: AUJOURDHUI })
    expect(decembre).toMatchObject({ cumulCalcule: 370_000, ecart: 30_000, cumul: 400_000 })
  })

  it('le mois en cours et les mois à venir ne se corrigent pas : leur fin n’est pas encore connue', () => {
    const [, janvier, fevrier] = cumulDesMois(corrige([{ mois: '2027-01', solde: 0 }, { mois: '2027-02', solde: 0 }]), m('2026-12'), m('2027-02'), { aujourdhui: AUJOURDHUI })
    expect(janvier).toMatchObject({ ecart: null, cumul: 820_000 })
    expect(fevrier).toMatchObject({ ecart: null, cumul: 1_370_000 })
  })

  it('sans correction, le cumul calculé est le cumul', () => {
    const [decembre] = cumulDesMois(calendrier(depenses), m('2026-12'), m('2026-12'), { aujourdhui: AUJOURDHUI })
    expect(decembre).toMatchObject({ cumulCalcule: 370_000, ecart: null, cumul: 370_000 })
  })
})

describe('versement mensuel « pas ce mois-ci » (lot 36)', () => {
  const avecSaut = (mois: string) =>
    creerCalendrier({
      mode: 'cyclePaie',
      contrats: [contrat],
      paies: [paie('2026-12', '2026-11-27'), paie('2027-01', '2026-12-27')],
      sources: [cours],
      charges: [charge('Loyer', 'fixe', 350_000), charge('Courses', 'enveloppe', 200_000)],
      depenses,
      objectifs: [moto],
      mouvementsEpargne: [versement],
      versementsSautes: [{ objectifId: 'moto', mois: m(mois) }],
      aujourdhui: AUJOURDHUI,
    })

  it('le versement sauté n’est plus attendu : ni à confirmer, ni retiré des projections', () => {
    const c = avecSaut('2027-01')
    expect(c.epargneDuMois(m('2027-01'))).toMatchObject({ prevue: 0, lignes: [{ objectifId: 'moto', prevu: null, prevuSaute: 100_000, reel: 0 }] })
    const [, janvier, fevrier] = cumulDesMois(c, m('2026-12'), m('2027-02'), { aujourdhui: AUJOURDHUI })
    // Sans saut : 1 000 DH à confirmer en janvier, cumul après prévu 7 200 DH.
    expect(janvier).toMatchObject({ epargne: 0, epargneAConfirmer: 0, cumul: 820_000, cumulApresPrevu: 820_000 })
    // Le mois suivant n'est pas touché.
    expect(fevrier).toMatchObject({ epargneAConfirmer: 100_000 })
  })

  it('un autre mois ne change rien', () => {
    const ligne = avecSaut('2027-03').epargneDuMois(m('2027-01')).lignes[0]
    expect(ligne).toMatchObject({ prevu: 100_000, prevuSaute: null })
  })
})
