import type { PaieDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { apercuContrat, dateProposee, fenetreMois, lireMontant, paieAConfirmer, statutPaie, totauxPaies, totauxReception, versionPour, versSaisie } from './saisie'

const paie = (modif: Record<string, unknown>): PaieDto =>
  ({
    mois: '2027-02',
    versionId: 'v1',
    statut: 'prevue',
    datePrevue: '2027-01-27',
    dateReelle: null,
    debutMois: '2027-01-27',
    sourceDebut: 'prevue',
    joursDeRetard: 0,
    lignes: [],
    totalPrevu: 1_000_000,
    totalRecu: null,
    ecart: null,
    ...modif,
  }) as unknown as PaieDto

describe('saisie du salaire', () => {
  it('lit les montants et explique les erreurs', () => {
    expect(lireMontant('10 000')).toEqual({ valeur: 1_000_000 })
    expect(lireMontant('0')).toEqual({ erreur: 'Entre un montant supérieur à 0.' })
    expect(lireMontant('0', 0)).toEqual({ valeur: 0 })
    expect(lireMontant('abc')).toHaveProperty('erreur')
    expect(versSaisie(1_000_050)).toBe('10000,50')
  })

  it('montre l’effet du contrat avant de l’enregistrer', () => {
    expect(apercuContrat({ moisEffet: '2027-02', jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }, '2026-10-07')).toBe(
      'Février 2027 irait du 27 janv. 2027 au 26 févr. 2027 (31 jours).',
    )
    expect(apercuContrat({ moisEffet: '', jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }, '2026-10-07')).toBeNull()
  })

  it('dit le statut en mots', () => {
    expect(statutPaie(paie({ statut: 'enRetard', joursDeRetard: 1 }), '2027-01-28').texte).toBe('Attendue depuis hier')
    expect(statutPaie(paie({ statut: 'enRetard', joursDeRetard: 3 }), '2027-01-30', { court: true }).texte).toBe('En retard · 3 j')
    expect(statutPaie(paie({}), '2027-01-27')).toEqual({ texte: 'Prévue aujourd’hui', ton: 'info' })
    expect(statutPaie(paie({ statut: 'recue', dateReelle: '2027-01-26' }), '2027-01-27').texte).toBe('Reçue le 26 janv.')
  })

  it('propose la date prévue, jamais une date future', () => {
    expect(dateProposee(paie({}), '2027-01-29')).toBe('2027-01-27')
    expect(dateProposee(paie({}), '2027-01-20')).toBe('2027-01-20')
  })

  it('affiche douze mois autour du mois courant', () => {
    expect(fenetreMois('2027-02', 0)).toEqual({ du: '2026-11', au: '2027-10' })
    expect(fenetreMois('2027-02', 6)).toEqual({ du: '2027-05', au: '2028-04' })
  })

  it('totalise et trouve la prochaine paie à confirmer', () => {
    const liste = [
      paie({ mois: '2027-01', statut: 'recue', totalRecu: 980_000, ecart: -20_000 }),
      paie({ mois: '2027-02', statut: 'enRetard' }),
      paie({ mois: '2027-03' }),
    ]
    expect(totauxPaies(liste)).toEqual({ prevu: 3_000_000, recu: 980_000, ecart: -20_000 })
    expect(paieAConfirmer(liste)?.mois).toBe('2027-02')
    expect(totauxReception(1_100_000, ['10000', '800', 'x'])).toEqual({ recu: 1_080_000, ecart: -20_000 })
  })

  it('trouve la version en vigueur', () => {
    const versions = [{ moisEffet: '2027-03' }, { moisEffet: '2026-11' }]
    expect(versionPour(versions, '2027-02')).toEqual({ moisEffet: '2026-11' })
    expect(versionPour(versions, '2027-05')).toEqual({ moisEffet: '2027-03' })
    expect(versionPour(versions, '2026-01')).toEqual({ moisEffet: '2026-11' })
  })
})
