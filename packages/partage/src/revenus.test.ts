import { describe, expect, it } from 'vitest'
import { schemaRevenuRecu, schemaSource } from './revenus'

const base = { libelle: 'Prime', type: 'prime', montant: 100_000, frequence: 'mensuelle', versement: 'avecPaie', certitude: 'probable', debut: '2027-01' }

describe('schémas des revenus', () => {
  it('nettoie une source : pas de jour avec la paie, mois triés seulement pour « mois choisis »', () => {
    expect(schemaSource.parse({ ...base, jour: 15, mois: [6] })).toMatchObject({ jour: null, mois: [], fin: null })
    expect(schemaSource.parse({ ...base, frequence: 'moisChoisis', mois: [12, 6, 6] }).mois).toEqual([6, 12])
  })

  it('exige les mois, le jour et une fin cohérente', () => {
    const erreurs = (v: object) => schemaSource.safeParse(v).error?.issues.map((i) => i.path.join('.'))
    expect(erreurs({ ...base, frequence: 'moisChoisis' })).toEqual(['mois'])
    expect(erreurs({ ...base, versement: 'dateSeparee' })).toEqual(['jour'])
    expect(erreurs({ ...base, fin: '2026-12' })).toEqual(['fin'])
  })

  it('un revenu reçu est lié à un versement prévu, ou libre avec un libellé', () => {
    expect(schemaRevenuRecu.safeParse({ date: '2027-01-15', montant: 1, sourceId: 's1', moisOccurrence: '2027-01' }).success).toBe(true)
    expect(schemaRevenuRecu.safeParse({ date: '2027-01-15', montant: 1, libelle: 'Cadeau' }).success).toBe(true)
    expect(schemaRevenuRecu.safeParse({ date: '2027-01-15', montant: 1 }).success).toBe(false)
    expect(schemaRevenuRecu.safeParse({ date: '2027-01-15', montant: 1, sourceId: 's1' }).success).toBe(false)
  })
})
