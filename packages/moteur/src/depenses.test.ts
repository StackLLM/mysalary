import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge, PaiementDette, Ponctuel } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import { couvrir, echeanceDeCharge, type Depense } from './depenses'
import { creerCalendrier } from './periodes'
import type { VersionContrat } from './salaire'

// Paie le 27 qui finance le mois suivant : le mois budgétaire « janvier 2027 » va du 27 déc. au 26 janv.
const contrat: VersionContrat = {
  id: 'v1',
  moisEffet: m('2026-11'),
  montantNet: centimes(1_000_000),
  jourHabituel: 27,
  regleJourNonOuvre: 'aucune',
  financeMoisSuivant: true,
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
  debut: m('2027-01'),
  fin: null,
  essentielle: true,
}
const courses: Charge = { ...loyer, id: 'courses', libelle: 'Courses', categorieId: 'alimentation', nature: 'enveloppe', montant: centimes(250_000), jour: null }
const assurance: Ponctuel = { id: 'assurance', libelle: 'Assurance auto', categorieId: 'assurances', montant: centimes(240_000), date: d('2027-01-15'), certitude: 'garanti' }

let n = 0
const depense = (montant: number, date: string, lien: Partial<Depense> = {}): Depense => ({
  id: `dep${++n}`,
  date: d(date),
  montant: centimes(montant),
  categorieId: 'divers',
  libelle: '',
  chargeId: null,
  echeance: null,
  ponctuelId: null,
  ...lien,
})
const pourLoyer = (echeance: string) => ({ chargeId: 'loyer', echeance: d(echeance) })

function calendrier(depenses: Depense[], { aujourdhui = '2027-01-20', paiementsDettes = [] as PaiementDette[] } = {}) {
  return creerCalendrier({
    mode: 'cyclePaie',
    contrats: [contrat],
    paies: [],
    aujourdhui: d(aujourdhui),
    charges: [loyer, courses],
    ponctuels: [assurance],
    dettes: [{ id: 'd1', libelle: 'Prêt', creancier: '', montantTotal: centimes(500_000), mensualite: centimes(100_000), premiereEcheance: d('2027-01-10') }],
    paiementsDettes,
    depenses,
  })
}

describe('échéances couvertes par des dépenses', () => {
  it('payée, en partie payée, en retard, prévue', () => {
    const ligne = (depenses: Depense[], aujourdhui?: string) => calendrier(depenses, { aujourdhui }).suiviDuMois(m('2027-01')).lignes.find((l) => l.id === 'loyer')
    expect(ligne([depense(350_000, '2027-01-04', pourLoyer('2027-01-05'))])).toMatchObject({ date: '2027-01-05', statut: 'payee', paye: 350_000, reste: 0 })
    expect(ligne([depense(100_000, '2027-01-04', pourLoyer('2027-01-05'))])).toMatchObject({ statut: 'partielle', paye: 100_000, reste: 250_000 })
    expect(ligne([])).toMatchObject({ statut: 'enRetard', reste: 350_000 })
    expect(ligne([], '2027-01-02')).toMatchObject({ statut: 'prevue' })
  })

  it('le prévu n’est jamais modifié par le réel', () => {
    const cal = calendrier([depense(500_000, '2027-01-04', pourLoyer('2027-01-05'))])
    expect(cal.chargesDuMois(m('2027-01')).totaux.fixe).toBe(350_000)
    expect(cal.suiviDuMois(m('2027-01')).totaux.fixe).toBe(500_000)
  })

  it('paiement en avance : l’argent sort ce mois-ci, l’échéance du mois suivant est payée', () => {
    const cal = calendrier([depense(350_000, '2027-01-25', pourLoyer('2027-02-05'))])
    const janvier = cal.suiviDuMois(m('2027-01'))
    expect(janvier.totaux.fixe).toBe(350_000)
    expect(janvier.lignes.find((l) => l.id === 'loyer')?.statut).toBe('enRetard')
    expect(cal.suiviDuMois(m('2027-02')).lignes.find((l) => l.id === 'loyer')).toMatchObject({ date: '2027-02-05', statut: 'payee', moisBudget: '2027-02' })
  })

  it('une échéance qui ne tombe plus (jour modifié) couvre celle du même mois budgétaire', () => {
    const cal = calendrier([depense(350_000, '2027-01-03', pourLoyer('2027-01-03'))])
    expect(cal.suiviDuMois(m('2027-01')).lignes.find((l) => l.id === 'loyer')?.statut).toBe('payee')
  })

  it('ponctuel payé', () => {
    const cal = calendrier([depense(240_000, '2027-01-14', { ponctuelId: 'assurance' })])
    expect(cal.suiviDuMois(m('2027-01')).lignes.find((l) => l.id === 'assurance')).toMatchObject({ origine: 'ponctuel', statut: 'payee' })
  })
})

describe('réel d’un mois budgétaire', () => {
  it('compte une dépense dans le mois budgétaire de sa date', () => {
    const cal = calendrier([depense(10_000, '2026-12-28'), depense(20_000, '2027-01-26'), depense(40_000, '2027-01-27')])
    expect(cal.suiviDuMois(m('2027-01')).depenses.map((x) => x.montant)).toEqual([20_000, 10_000])
    expect(cal.suiviDuMois(m('2027-02')).depenses.map((x) => x.montant)).toEqual([40_000])
  })

  it('enveloppe consommée, dépassement visible', () => {
    const cal = calendrier([depense(40_000, '2027-01-10', { chargeId: 'courses' }), depense(230_000, '2027-01-18', { chargeId: 'courses' })])
    expect(cal.suiviDuMois(m('2027-01')).enveloppes).toEqual([
      { id: 'courses', libelle: 'Courses', categorieId: 'alimentation', budget: 250_000, depense: 270_000, reste: -20_000, unite: 'mois', rythme: null, ajustements: [] },
    ])
    expect(cal.suiviDuMois(m('2027-02')).enveloppes[0]).toMatchObject({ depense: 0, reste: 250_000 })
  })

  it('imputations et totaux, paiements de dettes compris', () => {
    const cal = calendrier(
      [
        depense(350_000, '2027-01-05', pourLoyer('2027-01-05')),
        depense(40_000, '2027-01-10', { chargeId: 'courses' }),
        depense(240_000, '2027-01-15', { ponctuelId: 'assurance' }),
        depense(15_000, '2027-01-16'),
        depense(5_000, '2027-01-17', { chargeId: 'supprimee', echeance: d('2027-01-05') }),
      ],
      { paiementsDettes: [{ id: 'p1', detteId: 'd1', date: d('2027-01-10'), montant: centimes(100_000) }] },
    )
    const suivi = cal.suiviDuMois(m('2027-01'))
    expect(suivi.depenses.map((x) => x.imputation)).toEqual(['horsPlan', 'horsPlan', 'ponctuel', 'enveloppe', 'fixe'])
    expect(suivi.totaux).toEqual({ fixe: 350_000, enveloppe: 40_000, ponctuel: 240_000, horsPlan: 20_000, dette: 100_000, total: 750_000 })
    expect(suivi.paiementsDettes).toHaveLength(1)
    // Encore prévu : rien sur le loyer et l'assurance, 2 100 DH de courses, 0 sur l'échéance du 10 janv. payée.
    expect(suivi.restePrevu).toEqual({ lignes: 0, enveloppes: 210_000, dettes: 0, total: 210_000 })
  })
})

describe('propositions de rattachement', () => {
  it('lignes pas encore payées du mois, échéances des 10 jours suivants, enveloppes', () => {
    const cal = calendrier([depense(240_000, '2027-01-14', { ponctuelId: 'assurance' })])
    const r = cal.rattachements(d('2027-01-26'))
    expect(r.mois).toBe('2027-01')
    expect(r.lignes.map((l) => `${l.id} ${l.date}`)).toEqual(['loyer 2027-01-05', 'loyer 2027-02-05'])
    expect(r.enveloppes.map((e) => e.id)).toEqual(['courses'])
    expect(cal.rattachements(d('2027-01-20')).lignes.map((l) => l.date)).toEqual(['2027-01-05'])
  })
})

describe('validité d’une échéance', () => {
  it('le bon jour d’un mois où la charge tombe', () => {
    expect(echeanceDeCharge(loyer, d('2027-03-05'))).toBe(true)
    expect(echeanceDeCharge(loyer, d('2027-03-06'))).toBe(false)
    expect(echeanceDeCharge(loyer, d('2026-12-05'))).toBe(false)
    expect(echeanceDeCharge(courses, d('2027-03-05'))).toBe(false)
  })
})

describe('couvrir', () => {
  it('ne couvre jamais plus que le prévu, ni plus que le payé', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 1_000_000 }), { minLength: 1, maxLength: 5 }), fc.integer({ min: 0, max: 6_000_000 }), (montants, paye) => {
        const lignes = couvrir(
          montants.map((x, i) => ({ date: d(`2027-01-0${i + 1}`), montant: centimes(x) })),
          centimes(paye),
          d('2027-01-03'),
        )
        const couvert = lignes.reduce((s, l) => s + l.paye, 0)
        expect(couvert).toBe(Math.min(paye, montants.reduce((s, x) => s + x, 0)))
        for (const l of lignes) expect(l.paye + l.reste).toBe(l.montant)
      }),
    )
  })
})
