import { describe, expect, it } from 'vitest'
import { schemaCreationUtilisateur, schemaModificationReglages } from './index'

describe('schémas', () => {
  it('nettoie le prénom et met MAD par défaut', () => {
    expect(schemaCreationUtilisateur.parse({ prenom: '  Oussama ' })).toEqual({
      prenom: 'Oussama',
      devise: 'MAD',
    })
  })
  it('refuse un prénom vide et un champ inconnu', () => {
    expect(schemaCreationUtilisateur.safeParse({ prenom: '  ' }).success).toBe(false)
    expect(schemaCreationUtilisateur.safeParse({ prenom: 'A', role: 'admin' }).success).toBe(false)
  })
  it('refuse une modification de réglages vide', () => {
    expect(schemaModificationReglages.safeParse({}).success).toBe(false)
    expect(schemaModificationReglages.safeParse({ debutSemaine: 8 }).success).toBe(false)
    expect(schemaModificationReglages.safeParse({ reportHebdo: true }).success).toBe(true)
  })
})
