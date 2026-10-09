import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import { bilanDuMois } from './bilan'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import { cibleFondsSecurite, epargneObjectif, etatEpargne, type CompteEpargne, type MouvementEpargne, type Objectif } from './epargne'
import { capaciteDuMois, CERTITUDES_SCENARIO, repartirCapacite, suiviDesObjectifs, trajectoireObjectif } from './objectifs'
import { creerCalendrier } from './periodes'
import type { SourceRevenu } from './revenus'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Salaire 10 000 DH le 27, qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv.
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }
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
  debut: m('2026-11'),
  fin: null,
  essentielle: true,
}
const source = (id: string, montant: number, certitude: SourceRevenu['certitude']): SourceRevenu => ({
  id,
  libelle: id,
  type: 'variable',
  montant: centimes(montant),
  frequence: 'mensuelle',
  mois: [],
  versement: 'dateSeparee',
  jour: 10,
  certitude,
  debut: m('2027-02'),
  fin: null,
})

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
const moto = objectif('moto', { type: 'moto', montantCible: centimes(8_500_000), montantInitial: centimes(200_000), dateCible: m('2027-12'), priorite: 1 })
const permis = objectif('permis', { montantCible: centimes(300_000), dateCible: m('2027-03'), priorite: 2, versementMensuel: centimes(100_000) })

const comptes: CompteEpargne[] = [{ id: 'cih', libelle: 'Compte épargne', solde: centimes(500_000), auLe: d('2027-01-01') }]
const mouvement = (id: string, montant: number, date: string, modif: Partial<MouvementEpargne> = {}): MouvementEpargne => ({
  id,
  compteId: 'cih',
  objectifId: null,
  type: montant >= 0 ? 'versement' : 'retrait',
  date: d(date),
  montant: centimes(montant),
  libelle: '',
  ...modif,
})
// Le versement du 20 décembre est déjà dans le solde déclaré le 1er janvier ; celui du 5 janvier s'y ajoute.
const mouvements = [mouvement('m1', 50_000, '2026-12-20', { objectifId: 'moto' }), mouvement('m2', 100_000, '2027-01-05', { objectifId: 'moto' })]

function calendrier(objectifs: Objectif[] = [moto, permis], liste = mouvements) {
  return creerCalendrier({
    mode: 'cyclePaie',
    contrats: [contrat],
    paies: [paieJanvier],
    // Cours particuliers probables (+1 000 DH), freelance incertain (+2 000 DH), à partir de février.
    sources: [source('cours', 100_000, 'probable'), source('freelance', 200_000, 'incertain')],
    charges: [loyer],
    objectifs,
    mouvementsEpargne: liste,
    aujourdhui: d('2027-01-10'),
  })
}

describe('épargne : solde, réservé, disponible (R12–R14)', () => {
  it('solde déclaré + mouvements après la déclaration ; réservé au-delà du solde → alerte', () => {
    const e = etatEpargne({ comptes, mouvementsEpargne: mouvements, objectifs: [moto, { ...permis, montantInitial: centimes(300_000) }] })
    expect(e.comptes[0]!.soldeActuel).toBe(600_000)
    // Moto : 2 000 + 500 + 1 000 DH ; permis : 3 000 DH.
    expect(epargneObjectif(moto, mouvements)).toBe(350_000)
    expect(e).toMatchObject({ solde: 600_000, reserve: 650_000, disponible: 0, depassement: 50_000 })
  })

  it('un objectif réalisé ou abandonné ne réserve plus ; l’achat ne compte pas dans l’épargné', () => {
    const achat = mouvement('a1', -350_000, '2027-01-08', { objectifId: 'moto', type: 'achat' })
    const e = etatEpargne({ comptes, mouvementsEpargne: [...mouvements, achat], objectifs: [{ ...moto, statut: 'realise' }, { ...permis, statut: 'abandonne' }] })
    expect(e).toMatchObject({ solde: 250_000, reserve: 0, disponible: 250_000 })
    expect(epargneObjectif(moto, [...mouvements, achat])).toBe(350_000)
  })

  it('fonds de sécurité : 3 à 6 mois de charges essentielles', () => {
    expect(cibleFondsSecurite(centimes(400_000))).toEqual({ min: 1_200_000, max: 2_400_000, base: 400_000 })
  })
})

describe('répartition de la capacité (R18)', () => {
  const liste = [
    { id: 'a', priorite: 1, versementMensuel: null, restant: centimes(1_000_000) },
    { id: 'b', priorite: 2, versementMensuel: centimes(100_000), restant: centimes(300_000) },
  ]

  it('versement mensuel choisi d’abord, puis cascade par priorité', () => {
    expect(Object.fromEntries(repartirCapacite(centimes(550_000), liste))).toEqual({ a: 450_000, b: 100_000 })
    expect(Object.fromEntries(repartirCapacite(centimes(60_000), liste))).toEqual({ a: 0, b: 60_000 })
    expect(Object.fromEntries(repartirCapacite(centimes(-10_000), liste))).toEqual({ a: 0, b: 0 })
  })

  it('propriété : jamais plus que la capacité, jamais plus que le restant', () => {
    const objectifs = fc.array(
      fc.record({ priorite: fc.integer({ min: 1, max: 5 }), versementMensuel: fc.option(fc.integer({ min: 1, max: 500_000 })), restant: fc.integer({ min: 0, max: 2_000_000 }) }),
      { maxLength: 6 },
    )
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: 5_000_000 }), objectifs, (capacite, os) => {
        const liste = os.map((o, i) => ({ id: String(i), priorite: o.priorite, versementMensuel: o.versementMensuel === null ? null : centimes(o.versementMensuel), restant: centimes(o.restant) }))
        const parts = repartirCapacite(centimes(capacite), liste)
        const total = [...parts.values()].reduce((s, v) => s + v, 0)
        expect(total).toBeLessThanOrEqual(Math.max(0, capacite))
        for (const o of liste) expect(parts.get(o.id)!).toBeLessThanOrEqual(o.restant)
      }),
    )
  })
})

describe('capacité par scénario (Plan.md § 7.3)', () => {
  const c = calendrier()
  it('mois en cours : reçu − charges − épargne déjà versée ; mois futur : revenus retenus − charges', () => {
    expect(capaciteDuMois(c, m('2027-01'), CERTITUDES_SCENARIO.realiste)).toBe(550_000)
    expect(capaciteDuMois(c, m('2027-02'), CERTITUDES_SCENARIO.prudent)).toBe(650_000)
    expect(capaciteDuMois(c, m('2027-02'), CERTITUDES_SCENARIO.realiste)).toBe(750_000)
    expect(capaciteDuMois(c, m('2027-02'), CERTITUDES_SCENARIO.ambitieux)).toBe(950_000)
  })
})

describe('objectifs : effort, date estimée, risque (R16, R17)', () => {
  const suivi = suiviDesObjectifs(calendrier(), { objectifs: [moto, permis], comptes, mouvementsEpargne: mouvements }, d('2027-01-10'))
  const parId = (id: string) => suivi.objectifs.find((o) => o.id === id)!

  it('épargné, restant, progression ; effort depuis le début du mois (8 250 000 restants au 27 déc. ÷ 12 mois)', () => {
    expect(parId('moto')).toMatchObject({ epargne: 350_000, restant: 8_150_000, atteint: false, moisRestants: 12, effortMensuel: 687_500, effortHebdo: 158_654 })
    expect(parId('moto').progression).toBeCloseTo(350_000 / 8_500_000)
  })

  it('date estimée par scénario et risque', () => {
    expect(parId('moto').estimations).toEqual({ prudent: '2028-02', realiste: '2027-12', ambitieux: '2027-10' })
    expect(parId('moto').risque).toBe('probable')
    expect(parId('permis').estimations).toEqual({ prudent: '2027-03', realiste: '2027-03', ambitieux: '2027-03' })
    expect(parId('permis').risque).toBe('sur')
    // Janvier : 5 500 DH de capacité, 1 000 DH au permis d'abord, le reste à la moto.
    expect(parId('moto').versementPrevuCeMois).toBe(450_000)
    expect(suivi.capacite).toEqual({ prudent: 550_000, realiste: 550_000, ambitieux: 550_000 })
  })

  it('mois en cours : le versement mensuel déjà fait n’est pas projeté une deuxième fois', () => {
    const liste = [...mouvements, mouvement('m3', 100_000, '2027-01-06', { objectifId: 'permis' })]
    const s = suiviDesObjectifs(calendrier([moto, permis], liste), { objectifs: [moto, permis], comptes, mouvementsEpargne: liste }, d('2027-01-10'))
    // Capacité de janvier : 5 500 − 1 000 DH déjà versés au permis ; tout va à la moto (priorité 1).
    expect(s.objectifs.map((o) => [o.libelle, o.versementPrevuCeMois])).toEqual([
      ['moto', 450_000],
      ['permis', 0],
    ])
    expect(s.objectifs[1]!.estimations?.realiste).toBe('2027-03')
  })

  it('objectif déjà atteint, sans date, en pause', () => {
    const atteint = objectif('atteint', { montantInitial: centimes(100_000), dateCible: m('2027-06') })
    const sansDate = objectif('libre', { priorite: 3 })
    const enPause = objectif('pause', { statut: 'pause', priorite: 4, montantInitial: centimes(20_000) })
    const s = suiviDesObjectifs(calendrier([atteint, sansDate, enPause]), { objectifs: [atteint, sansDate, enPause], comptes, mouvementsEpargne: [] }, d('2027-01-10'))
    expect(s.objectifs[0]).toMatchObject({ atteint: true, effortMensuel: null, risque: 'sur', estimations: { realiste: '2027-01' } })
    expect(s.objectifs[1]).toMatchObject({ moisRestants: null, effortMensuel: null, risque: null, estimations: { realiste: '2027-01' } })
    expect(s.objectifs[2]).toMatchObject({ estimations: null, risque: null, epargne: 20_000 })
    expect(s.epargne.reserve).toBe(120_000)
  })

  it('date souhaitée passée : effort = tout le restant, marquée dépassée', () => {
    const tard = objectif('tard', { dateCible: m('2026-12') })
    const s = suiviDesObjectifs(calendrier([tard]), { objectifs: [tard], comptes, mouvementsEpargne: [] }, d('2027-01-10'))
    expect(s.objectifs[0]).toMatchObject({ dateDepassee: true, moisRestants: 0, effortMensuel: 100_000, risque: 'horsPortee' })
  })
})

describe('épargne dans le bilan et la trajectoire', () => {
  it('bilan : versement prévu et réel par objectif, hors des charges et des lignes à confirmer (R11)', () => {
    const b = bilanDuMois(calendrier(), m('2027-01'))
    expect(b.lignes.filter((l) => l.famille === 'epargne').map((l) => [l.libelle, l.prevu, l.reel, l.statut])).toEqual([
      ['moto', null, 100_000, 'confirme'],
      ['permis', 100_000, 0, 'enCours'],
    ])
    expect(b.epargne).toEqual({ prevue: 100_000, reelle: 100_000 })
    expect(b.totaux.chargesPrevues).toBe(350_000)
    expect(b.totaux.sortiesReelles).toBe(0)
    expect(b.aConfirmer.map((l) => l.libelle)).toEqual(['Loyer'])
  })

  it('trajectoire : réel à la fin des mois passés, jonction aujourd’hui, projeté jusqu’à la date', () => {
    const points = trajectoireObjectif(calendrier(), moto, { objectifs: [moto, permis], comptes, mouvementsEpargne: mouvements }, d('2027-01-10'))
    expect(points.slice(0, 3)).toEqual([
      { mois: '2026-12', reel: 250_000, projete: null, aujourdhui: false },
      { mois: '2027-01', reel: 350_000, projete: 350_000, aujourdhui: true },
      { mois: '2027-01', reel: null, projete: 800_000, aujourdhui: false },
    ])
    expect(points.at(-1)).toEqual({ mois: '2027-12', reel: null, projete: 8_500_000, aujourdhui: false })
  })
})
