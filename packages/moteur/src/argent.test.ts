import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { additionner, centimes, depuisSaisie, repartir } from './argent'

describe('depuisSaisie', () => {
  it('lit les formats usuels', () => {
    expect(depuisSaisie('10 000')).toBe(1_000_000)
    expect(depuisSaisie('10 000,5')).toBe(1_000_050)
    expect(depuisSaisie('0.1')).toBe(10)
    expect(depuisSaisie(10000.05)).toBe(1_000_005)
    expect(depuisSaisie('-35')).toBe(-3_500)
  })
  it('refuse une saisie illisible ou trop précise', () => {
    expect(() => depuisSaisie('abc')).toThrow(RangeError)
    expect(() => depuisSaisie('1,234')).toThrow(RangeError)
    expect(() => depuisSaisie('')).toThrow(RangeError)
  })
})

describe('additionner', () => {
  it('évite les erreurs de virgule flottante', () => {
    // 0,10 + 0,20 = 0,30 exactement
    expect(additionner(depuisSaisie('0,10'), depuisSaisie('0,20'))).toBe(30)
  })
  it('refuse un montant non entier', () => {
    expect(() => centimes(1.5)).toThrow(RangeError)
  })
})

describe('repartir', () => {
  it('répartit 1 000 DH sur 3 parts égales sans perte', () => {
    const parts = repartir(centimes(100_000), [1, 1, 1])
    expect(parts).toEqual([33_334, 33_333, 33_333])
  })
  it('suit les poids (semaine partielle de 3 jours sur 31)', () => {
    const parts = repartir(centimes(310_000), [3, 7, 7, 7, 7])
    expect(parts).toEqual([30_000, 70_000, 70_000, 70_000, 70_000])
  })
  it('la somme des parts vaut toujours le total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10_000_000, max: 10_000_000 }),
        fc.array(fc.integer({ min: 0, max: 1_000 }), { minLength: 1, maxLength: 12 }).filter((p) => p.some((x) => x > 0)),
        (total, poids) => {
          const parts = repartir(centimes(total), poids)
          expect(parts.reduce((s, p) => s + p, 0)).toBe(total)
          parts.forEach((p) => expect(Number.isSafeInteger(p)).toBe(true))
        },
      ),
    )
  })
})
