import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import { lireCleMois as m, lireDate as d } from './dates'
import { creerCalendrierPaie, datePrevuePaie, type PaieEnregistree, type VersionContrat } from './salaire'

/** Contrat de l'utilisateur : 10 000 DH le 27, la paie finance le mois suivant. */
const contrat = (modif: Partial<VersionContrat> = {}): VersionContrat => ({
  id: 'v1',
  moisEffet: m('2026-11'),
  montantNet: centimes(1_000_000),
  jourHabituel: 27,
  regleJourNonOuvre: 'aucune',
  financeMoisSuivant: true,
  ...modif,
})

const recue = (mois: string, date: string, recu = 1_000_000, prevu = 1_000_000): PaieEnregistree => ({
  moisFinance: m(mois),
  dateReelle: d(date),
  datePrevue: null,
  lignes: [{ id: `l-${mois}`, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(prevu), montantRecu: centimes(recu), sourceId: null }],
})

describe('datePrevuePaie', () => {
  it('la paie du 27 janvier finance février', () => {
    expect(datePrevuePaie(m('2027-02'), contrat())).toBe('2027-01-27')
  })

  it('sans « mois suivant », la paie de février tombe en février', () => {
    expect(datePrevuePaie(m('2027-02'), contrat({ financeMoisSuivant: false }))).toBe('2027-02-27')
  })

  it('un jour absent du mois devient le dernier jour (31 → 28 février)', () => {
    expect(datePrevuePaie(m('2027-03'), contrat({ jourHabituel: 31 }))).toBe('2027-02-28')
    expect(datePrevuePaie(m('2028-03'), contrat({ jourHabituel: 31 }))).toBe('2028-02-29')
  })

  it('virement bancaire : un 27 qui tombe un dimanche arrive le lundi', () => {
    expect(datePrevuePaie(m('2026-10'), contrat({ regleJourNonOuvre: 'apres' }))).toBe('2026-09-28')
  })

  it('applique la règle du week-end (27/02/2027 est un samedi)', () => {
    expect(datePrevuePaie(m('2027-03'), contrat({ regleJourNonOuvre: 'aucune' }))).toBe('2027-02-27')
    expect(datePrevuePaie(m('2027-03'), contrat({ regleJourNonOuvre: 'avant' }))).toBe('2027-02-26')
    expect(datePrevuePaie(m('2027-03'), contrat({ regleJourNonOuvre: 'apres' }))).toBe('2027-03-01')
  })
})

describe('paies calculées', () => {
  const aujourdhui = d('2027-01-10')

  it('une paie future est prévue, avec la ligne de salaire du contrat', () => {
    const cal = creerCalendrierPaie({ contrats: [contrat()], paies: [], aujourdhui })
    const fevrier = cal.paie(m('2027-02'))!
    expect(fevrier).toMatchObject({ statut: 'prevue', datePrevue: '2027-01-27', debutMois: '2027-01-27', sourceDebut: 'prevue', totalPrevu: 1_000_000, totalRecu: null })
    expect(fevrier.lignes).toEqual([
      { id: null, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: 1_000_000, montantRecu: null, sourceId: null },
    ])
  })

  it("aucune paie avant le premier contrat", () => {
    const cal = creerCalendrierPaie({ contrats: [contrat()], paies: [], aujourdhui })
    expect(cal.paie(m('2026-10'))).toBeNull()
    expect(cal.paies(m('2026-09'), m('2026-12')).map((p) => p.mois)).toEqual(['2026-11', '2026-12'])
  })

  it('chaque version s’applique à partir de son mois (R27)', () => {
    const hausse = contrat({ id: 'v2', moisEffet: m('2027-03'), montantNet: centimes(1_100_000) })
    const cal = creerCalendrierPaie({ contrats: [hausse, contrat()], paies: [], aujourdhui })
    expect(cal.paie(m('2027-02'))!.totalPrevu).toBe(1_000_000)
    expect(cal.paie(m('2027-03'))).toMatchObject({ versionId: 'v2', totalPrevu: 1_100_000 })
  })

  it('une paie reçue garde ses montants même si le contrat change ensuite (R27)', () => {
    const hausse = contrat({ montantNet: centimes(1_200_000) })
    const cal = creerCalendrierPaie({ contrats: [hausse], paies: [recue('2027-01', '2026-12-27')], aujourdhui })
    expect(cal.paie(m('2027-01'))).toMatchObject({ statut: 'recue', totalPrevu: 1_000_000, totalRecu: 1_000_000, ecart: 0 })
  })

  it('calcule l’écart entre reçu et prévu', () => {
    const cal = creerCalendrierPaie({ contrats: [contrat()], paies: [recue('2027-01', '2026-12-27', 980_000)], aujourdhui })
    expect(cal.paie(m('2027-01'))!.ecart).toBe(-20_000)
  })

  it('les primes prévues s’ajoutent au salaire, sans montant reçu', () => {
    const primes: PaieEnregistree = {
      moisFinance: m('2027-02'),
      dateReelle: null,
      datePrevue: null,
      lignes: [{ id: 'p1', type: 'prime', libelle: 'Prime annuelle', certitude: 'probable', montantPrevu: centimes(500_000), montantRecu: null, sourceId: null }],
    }
    const cal = creerCalendrierPaie({ contrats: [contrat()], paies: [primes], aujourdhui })
    const fevrier = cal.paie(m('2027-02'))!
    expect(fevrier.lignes.map((l) => l.libelle)).toEqual(['Salaire', 'Prime annuelle'])
    expect(fevrier.totalPrevu).toBe(1_500_000)
  })
})

describe('paie en retard', () => {
  it('une seule paie en retard prolonge le mois en cours jusqu’à aujourd’hui', () => {
    const cal = creerCalendrierPaie({ contrats: [contrat()], paies: [recue('2027-01', '2026-12-27')], aujourdhui: d('2027-01-29') })
    const fevrier = cal.paie(m('2027-02'))!
    expect(fevrier).toMatchObject({ statut: 'enRetard', joursDeRetard: 2, debutMois: '2027-01-30', sourceDebut: 'attendue' })
  })

  it('le jour même, la paie est encore « prévue » et ouvre le mois', () => {
    const cal = creerCalendrierPaie({ contrats: [contrat()], paies: [recue('2027-01', '2026-12-27')], aujourdhui: d('2027-01-27') })
    expect(cal.paie(m('2027-02'))).toMatchObject({ statut: 'prevue', debutMois: '2027-01-27', sourceDebut: 'prevue' })
  })

  it('la première paie du contrat, non confirmée, garde sa date prévue', () => {
    const cal = creerCalendrierPaie({ contrats: [contrat({ moisEffet: m('2026-10') })], paies: [], aujourdhui: d('2026-10-07') })
    expect(cal.paie(m('2026-10'))).toMatchObject({ statut: 'enRetard', debutMois: '2026-09-27', sourceDebut: 'prevue' })
  })

  it('plusieurs paies en retard : les dates prévues sont gardées', () => {
    const cal = creerCalendrierPaie({ contrats: [contrat()], paies: [recue('2027-01', '2026-12-27')], aujourdhui: d('2027-03-02') })
    expect(cal.paie(m('2027-02'))).toMatchObject({ statut: 'enRetard', debutMois: '2027-01-27', sourceDebut: 'prevue' })
    expect(cal.paie(m('2027-03'))).toMatchObject({ statut: 'enRetard', joursDeRetard: 3, debutMois: '2027-02-27' })
  })
})

describe('verifierReception', () => {
  const cal = creerCalendrierPaie({
    contrats: [contrat()],
    paies: [recue('2027-01', '2026-12-27')],
    aujourdhui: d('2027-02-10'),
  })

  it('accepte une paie en avance ou en retard entre ses voisines', () => {
    expect(cal.verifierReception(m('2027-02'), d('2027-01-25'))).toBeNull()
    expect(cal.verifierReception(m('2027-02'), d('2027-02-02'))).toBeNull()
  })

  it('refuse une date future', () => {
    expect(cal.verifierReception(m('2027-03'), d('2027-02-11'))).toEqual({ code: 'futur' })
  })

  it('refuse une date qui ne tombe pas après la paie précédente', () => {
    expect(cal.verifierReception(m('2027-02'), d('2026-12-27'))).toEqual({ code: 'avantPrecedente', mois: '2027-01', date: '2026-12-27' })
  })

  it('refuse une date qui tombe le jour de la paie suivante ou après (R29)', () => {
    // Paie de janvier reçue très en retard : elle doit financer février, pas janvier.
    const tardif = creerCalendrierPaie({ contrats: [contrat()], paies: [], aujourdhui: d('2027-02-10') })
    expect(tardif.verifierReception(m('2027-01'), d('2027-01-28'))).toEqual({ code: 'apresSuivante', mois: '2027-02', date: '2027-01-27' })
  })

  it('refuse un mois sans contrat', () => {
    expect(cal.verifierReception(m('2026-10'), d('2026-09-27'))).toEqual({ code: 'sansContrat' })
  })
})
