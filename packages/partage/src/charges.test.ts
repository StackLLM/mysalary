import { describe, expect, it } from 'vitest'
import { schemaCharge, schemaDette } from './charges'

const fixe = { libelle: 'Téléphone', categorieId: 'c', nature: 'fixe', montant: 10_000, jour: 5, debut: '2027-01' }

describe('schémas des charges', () => {
  it('une enveloppe est toujours mensuelle, sans jour', () => {
    expect(schemaCharge.parse({ ...fixe, nature: 'enveloppe', frequence: 'annuelle', mois: [3] })).toMatchObject({ frequence: 'mensuelle', jour: null, mois: [] })
  })

  it('une charge fixe exige un jour, et des mois pour « certains mois »', () => {
    const chemins = (v: object) => schemaCharge.safeParse(v).error?.issues.map((i) => i.path.join('.'))
    expect(chemins({ ...fixe, jour: null })).toEqual(['jour'])
    expect(chemins({ ...fixe, frequence: 'moisChoisis' })).toEqual(['mois'])
    expect(schemaCharge.parse({ ...fixe, frequence: 'moisChoisis', mois: [12, 6] }).mois).toEqual([6, 12])
  })

  it('une dette refuse une mensualité plus grande que le total', () => {
    const r = schemaDette.safeParse({ libelle: 'Prêt', montantTotal: 100, mensualite: 200, premiereEcheance: '2027-01-31' })
    expect(r.error?.issues[0]?.path).toEqual(['mensualite'])
    expect(schemaDette.parse({ libelle: 'Prêt', montantTotal: 100, mensualite: 50, premiereEcheance: '2027-01-31' }).creancier).toBe('')
  })
})
