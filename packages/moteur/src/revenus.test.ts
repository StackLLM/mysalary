import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import { lireCleMois as m, lireDate as d } from './dates'
import { creerCalendrier } from './periodes'
import { dateDeVersement, equivalentMensuel, moisDeVersement, totauxParCertitude, type SourceRevenu } from './revenus'
import type { PaieEnregistree, VersionContrat } from './salaire'

const source = (modif: Partial<SourceRevenu> = {}): SourceRevenu => ({
  id: 's1',
  libelle: 'Prime',
  type: 'prime',
  montant: centimes(100_000),
  frequence: 'mensuelle',
  mois: [],
  versement: 'dateSeparee',
  jour: 15,
  certitude: 'probable',
  debut: m('2027-01'),
  fin: null,
  ...modif,
})

const contrat: VersionContrat = {
  id: 'v1',
  moisEffet: m('2026-11'),
  montantNet: centimes(1_000_000),
  jourHabituel: 27,
  regleJourNonOuvre: 'aucune',
  financeMoisSuivant: true,
}

describe('fréquences', () => {
  const du = m('2026-12')
  const au = m('2028-01')

  it('mensuelle, du début à la fin incluse', () => {
    expect(moisDeVersement(source({ fin: m('2027-03') }), du, au)).toEqual(['2027-01', '2027-02', '2027-03'])
  })

  it('trimestrielle et annuelle à partir du début', () => {
    expect(moisDeVersement(source({ frequence: 'trimestrielle' }), du, au)).toEqual(['2027-01', '2027-04', '2027-07', '2027-10', '2028-01'])
    expect(moisDeVersement(source({ frequence: 'annuelle', debut: m('2027-06') }), du, au)).toEqual(['2027-06'])
  })

  it('ponctuelle : une seule fois', () => {
    expect(moisDeVersement(source({ frequence: 'unique', debut: m('2027-09') }), du, au)).toEqual(['2027-09'])
  })

  it('mois choisis : chaque année', () => {
    expect(moisDeVersement(source({ frequence: 'moisChoisis', mois: [6, 12], debut: m('2026-01') }), du, au)).toEqual(['2026-12', '2027-06', '2027-12'])
  })

  it('31 → dernier jour du mois', () => {
    expect(dateDeVersement({ jour: 31 }, m('2027-02'))).toBe('2027-02-28')
  })

  it('équivalent mensuel', () => {
    expect(equivalentMensuel(source({ frequence: 'trimestrielle', montant: centimes(300_000) }))).toBe(100_000)
    expect(equivalentMensuel(source({ frequence: 'moisChoisis', mois: [6, 12], montant: centimes(600_000) }))).toBe(100_000)
    expect(equivalentMensuel(source({ frequence: 'annuelle', montant: centimes(100_000) }))).toBe(8_333)
    expect(equivalentMensuel(source({ frequence: 'unique' }))).toBe(0)
  })

  it('totaux par certitude et par scénario (R5)', () => {
    const t = totauxParCertitude([
      { certitude: 'garanti', montant: 100 },
      { certitude: 'probable', montant: 20 },
      { certitude: 'incertain', montant: 3 },
    ])
    expect(t).toMatchObject({ prudent: 100, realiste: 120, ambitieux: 123 })
  })
})

describe('primes avec la paie', () => {
  const prime = source({ versement: 'avecPaie', jour: null, frequence: 'moisChoisis', mois: [6], debut: m('2027-01') })

  it('la prime de juin arrive avec la paie du 27 juin, qui finance juillet', () => {
    const cal = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [], sources: [prime], aujourdhui: d('2027-01-10') })
    expect(cal.paies.paie(m('2027-07'))!.lignes.map((l) => [l.libelle, l.montantPrevu, l.sourceId])).toEqual([
      ['Salaire', 1_000_000, null],
      ['Prime', 100_000, 's1'],
    ])
    expect(cal.paies.paie(m('2027-06'))!.totalPrevu).toBe(1_000_000)
    expect(cal.revenusPrevus(m('2027-06'), m('2027-06'))).toMatchObject([
      { moisVersement: '2027-06', datePrevue: '2027-06-27', moisBudget: '2027-07', statut: 'prevu', montantPrevu: 100_000 },
    ])
  })

  it('une paie reçue garde la prime figée, même si la source change ensuite (R27)', () => {
    const recue: PaieEnregistree = {
      moisFinance: m('2027-07'),
      dateReelle: d('2027-06-25'),
      datePrevue: d('2027-06-27'),
      lignes: [
        { id: 'l1', type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null },
        { id: 'l2', type: 'prime', libelle: 'Prime', certitude: 'probable', montantPrevu: centimes(100_000), montantRecu: centimes(80_000), sourceId: 's1' },
      ],
    }
    const changee = { ...prime, montant: centimes(200_000) }
    const cal = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [recue], sources: [changee], aujourdhui: d('2027-07-01') })
    expect(cal.paies.paie(m('2027-07'))!.totalPrevu).toBe(1_100_000)
    expect(cal.revenusPrevus(m('2027-06'), m('2027-06'))).toMatchObject([
      { statut: 'recu', dateReelle: '2027-06-25', montantPrevu: 100_000, montantRecu: 80_000, ecart: -20_000 },
    ])
  })

  it('une source créée après la réception n’apparaît pas dans la paie reçue', () => {
    const recue: PaieEnregistree = { moisFinance: m('2027-07'), dateReelle: d('2027-06-27'), datePrevue: null, lignes: [] }
    const cal = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [recue], sources: [prime], aujourdhui: d('2027-07-01') })
    expect(cal.revenusPrevus(m('2027-06'), m('2027-06'))).toEqual([])
  })

  it('sans contrat, une prime avec la paie ne peut pas être placée', () => {
    const cal = creerCalendrier({ mode: 'cyclePaie', contrats: [], paies: [], sources: [prime], aujourdhui: d('2027-01-10') })
    expect(cal.revenusPrevus(m('2027-06'), m('2027-06'))).toEqual([])
  })
})

describe('revenus versés à part', () => {
  it('comptent dans le mois budgétaire qui contient leur date', () => {
    const fin = source({ jour: 28, frequence: 'unique', debut: m('2027-01') })
    const debut = source({ id: 's2', jour: 5, frequence: 'unique', debut: m('2027-01') })
    const cal = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [], sources: [fin, debut], aujourdhui: d('2027-01-10') })
    // Le 28 janvier est après la paie du 27 : il compte dans février.
    expect(cal.revenusPrevus(m('2027-01'), m('2027-01')).map((r) => [r.datePrevue, r.moisBudget, r.statut])).toEqual([
      ['2027-01-05', '2027-01', 'enRetard'],
      ['2027-01-28', '2027-02', 'prevu'],
    ])
  })

  it('un revenu reçu lié marque le versement comme reçu, avec l’écart (R3, R4)', () => {
    const cal = creerCalendrier({
      mode: 'cyclePaie',
      contrats: [contrat],
      paies: [],
      sources: [source({ frequence: 'unique' })],
      revenusRecus: [{ id: 'r1', sourceId: 's1', moisOccurrence: m('2027-01'), date: d('2027-01-16'), montant: centimes(120_000), libelle: 'Prime' }],
      aujourdhui: d('2027-01-20'),
    })
    expect(cal.revenusPrevus(m('2027-01'), m('2027-01'))).toMatchObject([
      { statut: 'recu', dateReelle: '2027-01-16', montantPrevu: 100_000, montantRecu: 120_000, ecart: 20_000, revenuRecuId: 'r1' },
    ])
  })
})
