import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import type { Depense } from './depenses'
import type { CompteEpargne, MouvementEpargne, Objectif } from './epargne'
import { capaciteDuMois, moyenneFlexible, REGLES_SCENARIOS_DEFAUT } from './objectifs'
import { creerCalendrier } from './periodes'
import type { SourceRevenu } from './revenus'
import type { PaieEnregistree, VersionContrat } from './salaire'
import { simuler } from './simulation'

// Même cadre que les objectifs : salaire 10 000 DH le 27 (finance le mois suivant), loyer 3 500 DH, aujourd'hui le 10 janv. 2027.
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-09'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }
const paieJanvier: PaieEnregistree = {
  moisFinance: m('2027-01'),
  dateReelle: d('2026-12-27'),
  datePrevue: d('2026-12-27'),
  lignes: [{ id: 'l1', type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null }],
}
const loyer: Charge = {
  id: 'loyer',
  libelle: 'Loyer',
  categorieId: 'logement',
  nature: 'fixe',
  montant: centimes(350_000),
  frequence: 'mensuelle',
  mois: [],
  jour: 5,
  debut: m('2026-09'),
  fin: null,
  essentielle: true,
}
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
const moto = objectif('moto', { montantCible: centimes(8_500_000), montantInitial: centimes(200_000), dateCible: m('2027-12'), priorite: 1 })
const permis = objectif('permis', { montantCible: centimes(300_000), dateCible: m('2027-03'), priorite: 2, versementMensuel: centimes(100_000) })
const comptes: CompteEpargne[] = [{ id: 'cih', libelle: 'CIH', solde: centimes(500_000), auLe: d('2027-01-01') }]
const mouvements: MouvementEpargne[] = [
  { id: 'm1', compteId: 'cih', objectifId: 'moto', type: 'versement', date: d('2026-12-20'), montant: centimes(50_000), libelle: '' },
  { id: 'm2', compteId: 'cih', objectifId: 'moto', type: 'versement', date: d('2027-01-05'), montant: centimes(100_000), libelle: '' },
]
const horsPlan = (id: string, date: string, montant: number): Depense => ({ id, date: d(date), montant: centimes(montant), categorieId: 'x', libelle: '', chargeId: null, echeance: null, ponctuelId: null })

function calendrier({ charges = [loyer], depenses = [] as Depense[] } = {}) {
  return creerCalendrier({
    mode: 'cyclePaie',
    contrats: [contrat],
    paies: [paieJanvier],
    sources: [cours],
    charges,
    depenses,
    objectifs: [moto, permis],
    mouvementsEpargne: mouvements,
    aujourdhui: d('2027-01-10'),
  })
}
const donnees = { objectifs: [moto, permis], comptes, mouvementsEpargne: mouvements }
const AUJOURDHUI = d('2027-01-10')

describe('règles des scénarios', () => {
  it('prudent : la moyenne réelle des dépenses flexibles remplace un budget plus bas ; jamais sans historique', () => {
    // 3 000 DH hors plan en novembre et en décembre ; octobre n'a aucune dépense notée et ne compte pas.
    const c = calendrier({ depenses: [horsPlan('n', '2026-11-10', 300_000), horsPlan('dd', '2026-12-10', 300_000)] })
    expect(moyenneFlexible(c, AUJOURDHUI)).toBe(300_000)
    expect(capaciteDuMois(c, m('2027-02'), REGLES_SCENARIOS_DEFAUT.prudent, { moyenneFlexible: centimes(300_000) })).toBe(350_000)
    expect(capaciteDuMois(c, m('2027-02'), REGLES_SCENARIOS_DEFAUT.realiste, { moyenneFlexible: centimes(300_000) })).toBe(750_000)
    expect(moyenneFlexible(calendrier(), AUJOURDHUI)).toBeNull()
  })

  it('les revenus retenus suivent la règle ; « garanti » l’est toujours', () => {
    const c = calendrier()
    expect(capaciteDuMois(c, m('2027-02'), { revenus: [], flexibleMoyenne: false })).toBe(650_000)
    expect(capaciteDuMois(c, m('2027-02'), { revenus: ['probable'], flexibleMoyenne: false })).toBe(750_000)
  })
})

describe('leviers', () => {
  const c = calendrier()
  it('prime : + montant dans son mois ; réduction : − charge à partir du mois suivant seulement', () => {
    const ajustements = { primes: [{ mois: m('2027-02'), montant: centimes(500_000) }], reductions: [{ chargeId: 'loyer', montant: centimes(100_000) }] }
    expect(capaciteDuMois(c, m('2027-02'), REGLES_SCENARIOS_DEFAUT.realiste, { ajustements })).toBe(1_350_000)
    expect(capaciteDuMois(c, m('2027-03'), REGLES_SCENARIOS_DEFAUT.realiste, { ajustements })).toBe(850_000)
    // Mois en cours : la réduction ne s'applique pas (le mois est déjà engagé).
    expect(capaciteDuMois(c, m('2027-01'), REGLES_SCENARIOS_DEFAUT.realiste, { ajustements })).toBe(550_000)
    // Une réduction ne baisse jamais une charge sous zéro.
    expect(capaciteDuMois(c, m('2027-03'), REGLES_SCENARIOS_DEFAUT.realiste, { ajustements: { reductions: [{ chargeId: 'loyer', montant: centimes(900_000) }] } })).toBe(1_100_000)
  })

  it('prime affectée à la moto : la date avance, la base ne bouge pas', () => {
    const s = simuler(c, donnees, AUJOURDHUI, { ajustements: { primes: [{ mois: m('2027-02'), montant: centimes(3_000_000) }] } })
    const motoSimule = s.objectifs.find((o) => o.id === 'moto')!
    expect(motoSimule.base?.realiste).toBe('2027-12')
    expect(motoSimule.simule?.realiste).toBe('2027-08')
    expect(motoSimule.gainMois?.realiste).toBe(4)
    expect(motoSimule.risqueBase).toBe('probable')
    expect(motoSimule.risque).toBe('sur')
  })

  it('versement et date cible remplacés : effort et risque recalculés', () => {
    const s = simuler(c, donnees, AUJOURDHUI, { ajustements: { datesCibles: { moto: m('2027-06') }, versements: { permis: null } } })
    const motoSimule = s.objectifs.find((o) => o.id === 'moto')!
    // Juin 2027 : 6 mois depuis janvier ; 8 250 000 restants au début du mois.
    expect(motoSimule).toMatchObject({ dateCible: '2027-06', effortMensuel: 1_375_000, risque: 'horsPortee' })
    expect(s.objectifs.find((o) => o.id === 'permis')!.versementMensuel).toBeNull()
  })
})

describe('projection de l’épargne', () => {
  it('épargne = solde + capacités cumulées ; réservé = objectifs ; réel passé depuis la première date connue', () => {
    const s = simuler(calendrier(), donnees, AUJOURDHUI, { horizon: 6 })
    expect(s.epargneActuelle).toBe(600_000)
    expect(s.series.realiste.slice(0, 2)).toEqual([
      { mois: '2027-01', capacite: 550_000, epargne: 1_150_000, reserve: 900_000 },
      { mois: '2027-02', capacite: 750_000, epargne: 1_900_000, reserve: 1_650_000 },
    ])
    expect(s.series.prudent).toHaveLength(6)
    expect(s.horizonLong).toBe(false)
    // Premier mouvement le 20 déc. : seul décembre (27 nov. → 26 déc.) a un réel.
    expect(s.reel).toEqual([{ mois: '2026-12', epargne: 500_000 }])
    expect(s.alertes).toEqual([])
  })

  it('alertes : versements au-delà de la capacité, épargne négative ; horizon long signalé', () => {
    const trop = simuler(calendrier(), donnees, AUJOURDHUI, { ajustements: { versements: { moto: centimes(1_000_000) } }, horizon: 36 })
    expect(trop.alertes[0]).toEqual({ type: 'versements', mois: '2027-02', demande: 1_100_000, capacite: 750_000 })
    expect(trop.horizonLong).toBe(true)
    expect(trop.series.realiste).toHaveLength(36)

    // Loyer 15 000 DH : janvier vide l'épargne ; février (+1 000 DH de cours) la fait passer sous zéro.
    const cher = simuler(calendrier({ charges: [{ ...loyer, montant: centimes(1_500_000) }] }), donnees, AUJOURDHUI, { horizon: 6 })
    expect(cher.alertes).toContainEqual({ type: 'negatif', mois: '2027-02', epargne: -400_000 })
  })

  it('propriété : une simulation ne modifie jamais les données réelles', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5_000_000 }), fc.integer({ min: 0, max: 500_000 }), (prime, reduction) => {
        const copie = structuredClone(donnees)
        simuler(calendrier(), donnees, AUJOURDHUI, {
          ajustements: { primes: [{ mois: m('2027-03'), montant: centimes(prime) }], reductions: [{ chargeId: 'loyer', montant: centimes(reduction) }], versements: { moto: centimes(prime) } },
        })
        expect(donnees).toEqual(copie)
      }),
      { numRuns: 15 },
    )
  })
})
