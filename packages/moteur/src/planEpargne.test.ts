import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import type { MouvementEpargne, Objectif } from './epargne'
import { suiviDesObjectifs } from './objectifs'
import { creerCalendrier } from './periodes'
import { simulationCumul } from './planEpargne'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Salaire 10 000 DH le 27 (finance le mois suivant), loyer 3 500 DH : il reste 6 500 DH par mois.
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }
const paie: PaieEnregistree = {
  moisFinance: m('2027-01'),
  dateReelle: d('2026-12-27'),
  datePrevue: d('2026-12-27'),
  lignes: [{ id: 'l1', type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null }],
}
const loyer: Charge = { id: 'loyer', libelle: 'Loyer', categorieId: 'logement', nature: 'fixe', montant: centimes(350_000), frequence: 'mensuelle', mois: [], jour: 5, debut: m('2026-11'), fin: null, essentielle: true }
const objectif = (modif: Partial<Objectif> = {}): Objectif => ({
  id: 'moto',
  libelle: 'Moto',
  type: 'moto',
  montantCible: centimes(3_000_000),
  montantInitial: centimes(500_000),
  dateCible: m('2027-03'),
  priorite: 1,
  versementMensuel: null,
  statut: 'actif',
  realiseLe: null,
  creeLe: d('2026-12-01'),
  ...modif,
})
const AUJOURDHUI = d('2027-01-10')
const DEPART = { mois: m('2027-01'), solde: centimes(700_000) }

function simuler(o: Objectif, { depart = null as typeof DEPART | null, mouvements = [] as MouvementEpargne[] } = {}) {
  const calendrier = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [paie], charges: [loyer], objectifs: [o], mouvementsEpargne: mouvements, aujourdhui: AUJOURDHUI })
  const donnees = { objectifs: [o], comptes: [], mouvementsEpargne: mouvements }
  return { simulation: simulationCumul(calendrier, donnees, o.id, AUJOURDHUI, { depart }), suivi: suiviDesObjectifs(calendrier, donnees, AUJOURDHUI) }
}
const resume = (s: ReturnType<typeof simuler>['simulation']) => s!.mois.slice(0, 4).map((x) => [x.cle, x.cumul, x.epargne, x.manque, x.atteint])

describe('simulation d’un objectif avec le cumul de fin de mois', () => {
  it('épargne actuelle + cumul de chaque fin de mois ; atteint au mois souhaité', () => {
    // Compte courant à 7 000 DH début janvier : 13 500, 20 000, 26 500 DH en fin de mois.
    const { simulation } = simuler(objectif(), { depart: DEPART })
    expect(resume(simulation)).toEqual([
      ['2027-01', 1_350_000, 1_850_000, 1_150_000, false],
      ['2027-02', 2_000_000, 2_500_000, 500_000, false],
      ['2027-03', 2_650_000, 3_150_000, 0, true],
      ['2027-04', 3_300_000, 3_800_000, 0, true],
    ])
    expect(simulation).toMatchObject({ dateAtteinte: '2027-03', ecart: 0, ajoutParMois: null, moisSouhaite: { cle: '2027-03', atteint: true } })
    expect(simulation!.mois[0]!.nature).toBe('enCours')
    expect(simulation!.mois[1]!.nature).toBe('prevu')
  })

  it('pas atteint au mois souhaité : ce qui manque, la date réelle et le retard', () => {
    const { simulation } = simuler(objectif())
    expect(simulation!.moisSouhaite).toMatchObject({ cle: '2027-03', epargne: 2_450_000, manque: 550_000, atteint: false })
    expect(simulation).toMatchObject({ dateAtteinte: '2027-04', ecart: 1, ajoutParMois: 183_334 })
  })

  it('cohérence : dégager l’ajout proposé chaque mois suffit pour tenir le mois souhaité', () => {
    const { simulation } = simuler(objectif())
    // 1 833,34 DH de loyer en moins chaque mois : la cible est atteinte en mars.
    const moinsDeLoyer = { ...loyer, montant: centimes(350_000 - simulation!.ajoutParMois!) }
    const o = objectif()
    const calendrier = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [paie], charges: [moinsDeLoyer], objectifs: [o], mouvementsEpargne: [], aujourdhui: AUJOURDHUI })
    const apres = simulationCumul(calendrier, { objectifs: [o], comptes: [], mouvementsEpargne: [] }, o.id, AUJOURDHUI)!
    expect(apres).toMatchObject({ dateAtteinte: '2027-03', ecart: 0, ajoutParMois: null })
  })

  it('cohérence : même date que la projection réaliste de la page Objectifs quand le compte part de 0', () => {
    const { simulation, suivi } = simuler(objectif())
    expect(simulation!.dateAtteinte).toBe(suivi.objectifs[0]!.estimations!.realiste)
  })

  it('un versement mensuel ne change rien au total : il quitte le compte pour l’objectif, sans double compte', () => {
    const sans = simuler(objectif(), { depart: DEPART }).simulation!
    const avec = simuler(objectif({ versementMensuel: centimes(200_000) }), { depart: DEPART }).simulation!
    expect(avec.mois.map((x) => x.epargne)).toEqual(sans.mois.map((x) => x.epargne))
    expect(avec.mois[0]).toMatchObject({ versements: 200_000, cumul: 1_150_000 })
    expect(avec.mois[1]).toMatchObject({ versements: 400_000, cumul: 1_600_000 })
  })

  it('un versement déjà fait ce mois-ci compte une seule fois', () => {
    const fait: MouvementEpargne = { id: 'v', compteId: 'c', objectifId: 'moto', type: 'versement', date: d('2027-01-05'), montant: centimes(200_000), libelle: '' }
    const s = simuler(objectif({ versementMensuel: centimes(200_000) }), { depart: DEPART, mouvements: [fait] }).simulation!
    expect(s.mois[0]).toMatchObject({ versements: 0, epargne: 1_850_000 })
  })

  it('cumul négatif : il ne retire rien à l’épargne', () => {
    const s = simuler(objectif(), { depart: { mois: m('2027-01'), solde: centimes(-2_000_000) } }).simulation!
    expect(s.mois[0]).toMatchObject({ cumul: -1_350_000, epargne: 500_000 })
  })

  it('sans date souhaitée : 12 mois simulés, pas d’écart ; objectif en pause : pas de simulation', () => {
    const s = simuler(objectif({ dateCible: null })).simulation!
    expect(s).toMatchObject({ moisSouhaite: null, ecart: null, dateAtteinte: '2027-04' })
    expect(s.mois).toHaveLength(12)
    expect(simuler(objectif({ statut: 'pause' })).simulation).toBeNull()
  })
})
