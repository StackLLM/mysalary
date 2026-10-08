import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import { ajouterJours, dateCivile, ecartJours, jourSemaine, lireCleMois as m, lireDate as d } from './dates'
import { creerCalendrier, repartirSurSemaines, semainesDe } from './periodes'
import type { PaieEnregistree, VersionContrat } from './salaire'

const contrat: VersionContrat = {
  id: 'v1',
  moisEffet: m('2026-11'),
  montantNet: centimes(1_000_000),
  jourHabituel: 27,
  regleJourNonOuvre: 'aucune',
  financeMoisSuivant: true,
}

const recue = (mois: string, date: string): PaieEnregistree => ({
  moisFinance: m(mois),
  dateReelle: d(date),
  datePrevue: null,
  lignes: [],
})

const calendrier = (aujourdhui: string, paies: PaieEnregistree[] = [], modif: Partial<VersionContrat> = {}) =>
  creerCalendrier({ mode: 'cyclePaie', contrats: [{ ...contrat, ...modif }], paies, aujourdhui: d(aujourdhui) })

describe('mois budgétaire en cycle de paie', () => {
  it('« Février 2027 » va du 27 janvier au 26 février (décision 3, R30)', () => {
    expect(calendrier('2027-02-10').mois(m('2027-02'))).toEqual({
      cle: '2027-02',
      debut: '2027-01-27',
      fin: '2027-02-26',
      nbJours: 31,
      statut: 'enCours',
      sourceDebut: 'prevue',
      sourceFin: 'prevue',
    })
  })

  it('le jour de paie appartient au nouveau mois', () => {
    const cal = calendrier('2027-01-27')
    expect(cal.moisContenant(d('2027-01-26')).cle).toBe('2027-01')
    expect(cal.moisContenant(d('2027-01-27')).cle).toBe('2027-02')
    expect(cal.moisCourant().cle).toBe('2027-02')
  })

  it('une paie reçue en avance redécoupe les deux mois voisins', () => {
    const cal = calendrier('2027-01-26', [recue('2027-02', '2027-01-25')])
    expect(cal.mois(m('2027-01'))).toMatchObject({ fin: '2027-01-24', sourceFin: 'reelle' })
    expect(cal.mois(m('2027-02'))).toMatchObject({ debut: '2027-01-25', sourceDebut: 'reelle', nbJours: 33 })
    expect(cal.moisCourant().cle).toBe('2027-02')
  })

  it('une paie en retard prolonge le mois en cours', () => {
    const cal = calendrier('2027-01-29', [recue('2027-01', '2026-12-27')])
    expect(cal.mois(m('2027-01'))).toMatchObject({ debut: '2026-12-27', fin: '2027-01-29', statut: 'enCours', sourceFin: 'attendue' })
    expect(cal.moisCourant().cle).toBe('2027-01')
  })

  it('les mois n’ont pas tous la même durée (week-end avancé)', () => {
    const cal = calendrier('2027-02-10', [], { regleJourNonOuvre: 'avant' })
    // 27/02/2027 est un samedi : la paie de mars arrive le vendredi 26.
    expect(cal.mois(m('2027-02'))).toMatchObject({ debut: '2027-01-27', fin: '2027-02-25', nbJours: 30 })
  })

  it('donne le statut passé, en cours, à venir', () => {
    const cal = calendrier('2027-02-10')
    expect(cal.mois(m('2027-01')).statut).toBe('passe')
    expect(cal.mois(m('2027-02')).statut).toBe('enCours')
    expect(cal.mois(m('2027-03')).statut).toBe('aVenir')
  })

  it('les mois se suivent sans trou ni chevauchement, sur plusieurs années', () => {
    const cal = calendrier('2027-06-15', [], { regleJourNonOuvre: 'avant', jourHabituel: 31 })
    let precedent = cal.mois(m('2026-11'))
    for (let i = 0; i < 60; i++) {
      const suivant = cal.mois(m(`${2026 + Math.floor((11 + i) / 12)}-${String(((11 + i) % 12) + 1).padStart(2, '0')}`))
      expect(ajouterJours(precedent.fin, 1)).toBe(suivant.debut)
      expect(suivant.nbJours).toBeGreaterThanOrEqual(27)
      precedent = suivant
    }
  })
})

describe('autres modes', () => {
  it('mode calendaire : du 1er au dernier jour', () => {
    const cal = creerCalendrier({ mode: 'calendaire', contrats: [contrat], paies: [], aujourdhui: d('2027-02-10') })
    expect(cal.mois(m('2027-02'))).toMatchObject({ debut: '2027-02-01', fin: '2027-02-28', nbJours: 28, sourceDebut: 'calendaire' })
    expect(cal.moisContenant(d('2027-01-27')).cle).toBe('2027-01')
  })

  it('cycle de paie sans contrat : mois civils, signalés', () => {
    const cal = creerCalendrier({ mode: 'cyclePaie', contrats: [], paies: [], aujourdhui: d('2027-02-10') })
    expect(cal.sansContrat).toBe(true)
    expect(cal.mode).toBe('calendaire')
    expect(cal.moisCourant()).toMatchObject({ cle: '2027-02', debut: '2027-02-01' })
  })
})

describe('semaines', () => {
  it('découpe « Février 2027 » en semaines du lundi, partielles aux bords', () => {
    const semaines = semainesDe({ debut: d('2027-01-27'), fin: d('2027-02-26') })
    expect(semaines.map((s) => [s.debut, s.fin, s.nbJours, s.partielle])).toEqual([
      ['2027-01-27', '2027-01-31', 5, true],
      ['2027-02-01', '2027-02-07', 7, false],
      ['2027-02-08', '2027-02-14', 7, false],
      ['2027-02-15', '2027-02-21', 7, false],
      ['2027-02-22', '2027-02-26', 5, true],
    ])
  })

  it('respecte le jour de début choisi (dimanche)', () => {
    const semaines = semainesDe({ debut: d('2027-01-27'), fin: d('2027-02-26') }, 7)
    expect(semaines[0]).toMatchObject({ debut: '2027-01-27', fin: '2027-01-30', nbJours: 4 })
    expect(jourSemaine(semaines[1]!.debut)).toBe(7)
  })

  it('couvre toujours la période jour pour jour', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3650 }), fc.integer({ min: 0, max: 40 }), fc.integer({ min: 1, max: 7 }), (decalage, duree, debutSemaine) => {
        const debut = ajouterJours(dateCivile(2026, 1, 1), decalage)
        const fin = ajouterJours(debut, duree)
        const semaines = semainesDe({ debut, fin }, debutSemaine)
        expect(semaines[0]!.debut).toBe(debut)
        expect(semaines.at(-1)!.fin).toBe(fin)
        expect(semaines.reduce((t, s) => t + s.nbJours, 0)).toBe(ecartJours(debut, fin) + 1)
        for (const s of semaines.slice(1, -1)) expect(s.nbJours).toBe(7)
      }),
    )
  })

  it('répartit un budget au prorata des jours, sans perdre un centime', () => {
    const semaines = semainesDe({ debut: d('2027-01-27'), fin: d('2027-02-26') })
    const parts = repartirSurSemaines(centimes(310_000), semaines)
    expect(parts).toEqual([50_000, 70_000, 70_000, 70_000, 50_000])
    const impair = repartirSurSemaines(centimes(100_001), semaines)
    expect(impair.reduce((t, p) => t + p, 0)).toBe(100_001)
  })
})
