import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import type { Objectif } from './epargne'
import { creerCalendrier } from './periodes'
import { cumulDisponible, scenariosCumul } from './planEpargne'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Salaire 10 000 DH le 27 (finance le mois suivant), loyer 3 500 DH : 6 500 DH d'épargne possible par mois.
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
const calendrier = (objectifs: Objectif[]) =>
  creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [paie], charges: [loyer], objectifs, mouvementsEpargne: [], aujourdhui: AUJOURDHUI })
const scenarios = (o: Objectif, cumul: number) => {
  const objectifs = [o]
  return scenariosCumul(calendrier(objectifs), { objectifs, comptes: [], mouvementsEpargne: [] }, o.id, AUJOURDHUI, centimes(cumul))
}

describe('plan d’épargne d’un objectif, avec et sans le cumul', () => {
  it('sans cumul : restant, montant par mois pour la date cible, date estimée et retard', () => {
    // 30 000 DH, 5 000 DH déjà épargnés, pour mars : janvier, février, mars.
    const s = scenarios(objectif(), 700_000)!
    expect(s.sans).toEqual({ depart: 500_000, restant: 2_500_000, mensuel: 833_334, moisRestants: 3, date: '2027-04', ecart: 1 })
  })

  it('avec cumul : le cumul s’ajoute au départ, le montant par mois baisse, la date cible est tenue', () => {
    const s = scenarios(objectif(), 700_000)!
    expect(s.cumul).toBe(700_000)
    expect(s.avec).toEqual({ depart: 1_200_000, restant: 1_800_000, mensuel: 600_000, moisRestants: 3, date: '2027-03', ecart: 0 })
    // Cohérence : à 6 500 DH par mois, le montant par mois nécessaire tient dans la capacité seulement avec le cumul.
    expect(s.sans.mensuel!).toBeGreaterThan(650_000)
    expect(s.avec.mensuel!).toBeLessThanOrEqual(650_000)
  })

  it('cumul qui couvre la cible : rien à mettre de côté, objectif atteint ce mois-ci, en avance', () => {
    const s = scenarios(objectif(), 3_000_000)!
    expect(s.avec).toMatchObject({ restant: 0, mensuel: null, date: '2027-01', ecart: -2 })
  })

  it('sans date cible : pas de montant par mois ni d’écart, mais une date estimée', () => {
    const s = scenarios(objectif({ dateCible: null }), 0)!
    expect(s.sans).toMatchObject({ mensuel: null, moisRestants: null, ecart: null, date: '2027-04' })
    expect(s.avec).toEqual(s.sans)
  })

  it('objectif en pause ou inconnu : pas de scénario', () => {
    expect(scenarios(objectif({ statut: 'pause' }), 0)).toBeNull()
  })

  it('cumul disponible : ce qui reste sur le compte courant au début du mois, jamais négatif', () => {
    const cal = calendrier([objectif()])
    expect(cumulDisponible(cal, AUJOURDHUI, { depart: { mois: m('2027-01'), solde: centimes(700_000) } })).toEqual({ montant: 700_000, mois: '2027-01' })
    expect(cumulDisponible(cal, AUJOURDHUI, { depart: { mois: m('2027-01'), solde: centimes(-50_000) } }).montant).toBe(0)
    expect(cumulDisponible(cal, AUJOURDHUI).montant).toBe(0)
  })
})
