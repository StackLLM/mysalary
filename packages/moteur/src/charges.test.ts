import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import { lireCleMois as m, lireDate as d } from './dates'
import { echeancier, equivalentMensuelCharge, etatDette, plafondPaiement, type Charge, type Dette, type PaiementDette } from './charges'
import { creerCalendrier } from './periodes'
import type { VersionContrat } from './salaire'

const contrat: VersionContrat = {
  id: 'v1',
  moisEffet: m('2026-11'),
  montantNet: centimes(1_000_000),
  jourHabituel: 27,
  regleJourNonOuvre: 'aucune',
  financeMoisSuivant: true,
}

const charge = (modif: Partial<Charge> = {}): Charge => ({
  id: 'c1',
  libelle: 'Téléphone',
  categorieId: 'telecom',
  nature: 'fixe',
  montant: centimes(10_000),
  frequence: 'mensuelle',
  mois: [],
  jour: 5,
  debut: m('2027-01'),
  fin: null,
  essentielle: true,
  ...modif,
})

const dette: Dette = {
  id: 'd1',
  libelle: 'Prêt Mohamed',
  creancier: 'Mohamed',
  montantTotal: centimes(850_000),
  mensualite: centimes(200_000),
  premiereEcheance: d('2027-01-31'),
}

const paiement = (montant: number, date = '2027-01-30', id = `p${montant}`): PaiementDette => ({ id, detteId: 'd1', date: d(date), montant: centimes(montant) })

describe('échéancier d’une dette', () => {
  it('la mensualité chaque mois, la dernière échéance = le reste', () => {
    expect(echeancier(dette).map((e) => [e.date, e.montant])).toEqual([
      ['2027-01-31', 200_000],
      ['2027-02-28', 200_000],
      ['2027-03-31', 200_000],
      ['2027-04-30', 200_000],
      ['2027-05-31', 50_000],
    ])
  })

  it('la somme des échéances vaut toujours le total', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000_000 }), fc.integer({ min: 1, max: 1_000_000 }), (total, mensualite) => {
        fc.pre(total / mensualite < 600)
        const liste = echeancier({ montantTotal: centimes(total), mensualite: centimes(mensualite), premiereEcheance: d('2027-01-15') })
        expect(liste.reduce((s, e) => s + e.montant, 0)).toBe(total)
      }),
    )
  })

  it('un paiement partiel : échéance partielle, reste attendu, somme attendue = reste dû', () => {
    const etat = etatDette(dette, [paiement(300_000)], d('2027-02-01'))
    expect(etat).toMatchObject({ paye: 300_000, restant: 550_000, soldee: false, finPrevue: '2027-05-31' })
    expect(etat.echeances.map((e) => [e.statut, e.attendu])).toEqual([
      ['payee', 0],
      ['partielle', 100_000],
      ['prevue', 200_000],
      ['prevue', 200_000],
      ['prevue', 50_000],
    ])
    expect(etat.prochaine?.numero).toBe(2)
    expect(etat.echeances.reduce((s, e) => s + e.attendu, 0)).toBe(etat.restant)
  })

  it('une échéance passée sans paiement est en retard', () => {
    expect(etatDette(dette, [], d('2027-02-01')).echeances[0]!.statut).toBe('enRetard')
  })

  it('soldée : plus rien d’attendu (R9)', () => {
    const etat = etatDette(dette, [paiement(850_000)], d('2027-02-01'))
    expect(etat).toMatchObject({ restant: 0, soldee: true, prochaine: null, finPrevue: null })
  })

  it('plafonne un nouveau paiement au reste dû', () => {
    expect(plafondPaiement(dette, [paiement(300_000)])).toBe(550_000)
    expect(plafondPaiement(dette, [paiement(300_000, '2027-01-30', 'x')], 'x')).toBe(850_000)
  })
})

describe('charges d’un mois budgétaire', () => {
  const calendrier = (aujourdhui: string, modif: Parameters<typeof creerCalendrier>[0] extends infer T ? Partial<T> : never = {}) =>
    creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [], aujourdhui: d(aujourdhui), ...modif })

  it('une charge fixe compte dans le mois budgétaire qui contient sa date', () => {
    const cal = calendrier('2027-01-10', { charges: [charge(), charge({ id: 'c2', libelle: 'Loyer', jour: 28 })] })
    // « Février » = 27 janv. → 26 févr. : téléphone du 5 févr. et loyer du 28 janv.
    expect(cal.chargesDuMois(m('2027-02')).lignes.map((l) => [l.libelle, l.date])).toEqual([
      ['Loyer', '2027-01-28'],
      ['Téléphone', '2027-02-05'],
    ])
  })

  it('les enveloppes valent par mois budgétaire, sans date', () => {
    const nourriture = charge({ id: 'e1', libelle: 'Nourriture', nature: 'enveloppe', jour: null, montant: centimes(150_000), debut: m('2027-02'), fin: m('2027-03') })
    const cal = calendrier('2027-01-10', { charges: [nourriture] })
    expect(cal.chargesDuMois(m('2027-01')).totaux.enveloppe).toBe(0)
    expect(cal.chargesDuMois(m('2027-02')).lignes).toMatchObject([{ origine: 'enveloppe', date: null, montant: 150_000 }])
    expect(cal.chargesDuMois(m('2027-04')).totaux.total).toBe(0)
  })

  it('additionne fixes, enveloppes, ponctuels et échéances', () => {
    const cal = calendrier('2027-01-10', {
      charges: [charge(), charge({ id: 'e1', libelle: 'Nourriture', nature: 'enveloppe', jour: null, montant: centimes(150_000) })],
      ponctuels: [{ id: 'p1', libelle: 'Assurance', categorieId: 'assurance', montant: centimes(55_000), date: d('2027-02-15'), certitude: 'garanti' }],
      dettes: [{ ...dette, premiereEcheance: d('2027-02-10') }],
    })
    expect(cal.chargesDuMois(m('2027-02')).totaux).toEqual({ fixe: 10_000, enveloppe: 150_000, ponctuel: 55_000, dette: 200_000, total: 415_000 })
  })

  it('une dette remboursée en avance ne pèse plus sur les mois à venir (R9)', () => {
    const cal = calendrier('2027-01-10', { dettes: [{ ...dette, premiereEcheance: d('2027-02-10') }], paiementsDettes: [paiement(850_000, '2027-01-05')] })
    expect(cal.chargesDuMois(m('2027-03')).totaux.dette).toBe(0)
  })

  it('31 → dernier jour du mois, et les fréquences des revenus s’appliquent', () => {
    expect(equivalentMensuelCharge(charge({ frequence: 'annuelle', montant: centimes(120_000) }))).toBe(10_000)
    expect(equivalentMensuelCharge(charge({ nature: 'enveloppe', montant: centimes(150_000) }))).toBe(150_000)
    const cal = calendrier('2027-01-10', { charges: [charge({ jour: 31, frequence: 'moisChoisis', mois: [2] })] })
    expect(cal.chargesDuMois(m('2027-03')).lignes.map((l) => l.date)).toEqual(['2027-02-28'])
  })
})
