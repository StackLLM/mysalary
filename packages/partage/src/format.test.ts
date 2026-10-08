import { describe, expect, it } from 'vitest'
import { formaterMontant } from './format'

const n = (s: string) => s.replace(/ | /g, ' ')

describe('formaterMontant', () => {
  it('formate les milliers et la devise', () => {
    expect(n(formaterMontant(1_000_000))).toBe('10 000 DH')
    expect(n(formaterMontant(1_234_567_800))).toBe('12 345 678 DH')
  })
  it('affiche les centimes seulement s’ils existent', () => {
    expect(n(formaterMontant(1_005))).toBe('10,05 DH')
    expect(n(formaterMontant(0))).toBe('0 DH')
  })
  it('utilise le vrai signe moins', () => {
    expect(formaterMontant(-120_000)).toMatch(/^−/)
  })
  it('refuse un montant non entier', () => {
    expect(() => formaterMontant(10.5)).toThrow(RangeError)
  })
})
