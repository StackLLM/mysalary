import { describe, expect, it } from 'vitest'
import { deMois, formaterDate, formaterMois } from './format'
import { schemaContrat, schemaPlageMois, schemaReception } from './salaire'

describe('schémas du salaire', () => {
  it('complète le contrat avec les valeurs par défaut', () => {
    expect(schemaContrat.parse({ moisEffet: '2027-02', montantNet: 1_000_000, jourHabituel: 27 })).toEqual({
      moisEffet: '2027-02',
      montantNet: 1_000_000,
      jourHabituel: 27,
      regleJourNonOuvre: 'apres',
      financeMoisSuivant: true,
    })
  })

  it('refuse un salaire nul, un jour hors limites, un mois mal écrit', () => {
    expect(schemaContrat.safeParse({ moisEffet: '2027-02', montantNet: 0, jourHabituel: 27 }).success).toBe(false)
    expect(schemaContrat.safeParse({ moisEffet: '2027-02', montantNet: 1, jourHabituel: 32 }).success).toBe(false)
    expect(schemaContrat.safeParse({ moisEffet: '2027-13', montantNet: 1, jourHabituel: 27 }).success).toBe(false)
    expect(schemaContrat.safeParse({ moisEffet: '2027-02', montantNet: 10.5, jourHabituel: 27 }).success).toBe(false)
  })

  it('refuse une date de réception impossible', () => {
    expect(schemaReception.safeParse({ dateReelle: '2027-02-30', salaireRecu: 1 }).success).toBe(false)
    expect(schemaReception.parse({ dateReelle: '2027-01-27', salaireRecu: 0 })).toEqual({ dateReelle: '2027-01-27', salaireRecu: 0, primes: [] })
  })

  it('refuse une plage inversée', () => {
    expect(schemaPlageMois.safeParse({ du: '2027-03', au: '2027-01' }).success).toBe(false)
  })
})

describe('formats de date', () => {
  it('écrit les mois et les dates en français, sans fuseau', () => {
    expect(formaterMois('2027-02')).toBe('février 2027')
    expect(formaterMois('2027-02', { annee: false, majuscule: true })).toBe('Février')
    expect(formaterDate('2027-01-27', 'court')).toBe('27 janv.')
    expect(formaterDate('2027-01-27')).toBe('27 janv. 2027')
    expect(formaterDate('2027-01-27', 'long')).toBe('mercredi 27 janvier 2027')
    expect(deMois('2027-02')).toBe('de février 2027')
    expect(deMois('2026-10', { annee: false })).toBe('d’octobre')
    expect(deMois('2027-08')).toBe('d’août 2027')
  })
})
