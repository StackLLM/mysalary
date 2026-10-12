import { describe, expect, it } from 'vitest'
import { schemaConnexion, schemaInscription, schemaModificationReglages } from './index'

describe('schémas', () => {
  it('inscription : nettoie le prénom et l’e-mail (minuscules), met MAD par défaut', () => {
    expect(schemaInscription.parse({ prenom: '  Oussama ', email: ' Oussama@Exemple.TEST ', motDePasse: 'mot-de-passe' })).toEqual({
      prenom: 'Oussama',
      email: 'oussama@exemple.test',
      motDePasse: 'mot-de-passe',
      devise: 'MAD',
    })
  })
  it('inscription : refuse un prénom vide, un e-mail invalide, un mot de passe court et un champ inconnu', () => {
    const base = { prenom: 'A', email: 'a@exemple.test', motDePasse: 'mot-de-passe' }
    for (const mauvais of [{ ...base, prenom: '  ' }, { ...base, email: 'pas-un-email' }, { ...base, motDePasse: '1234567' }, { ...base, role: 'admin' }]) {
      expect(schemaInscription.safeParse(mauvais).success, JSON.stringify(mauvais)).toBe(false)
    }
  })
  it('connexion : le mot de passe n’est jamais modifié (espaces gardés), seulement exigé', () => {
    expect(schemaConnexion.parse({ email: 'A@exemple.test', motDePasse: ' x ' })).toEqual({ email: 'a@exemple.test', motDePasse: ' x ' })
    expect(schemaConnexion.safeParse({ email: 'a@exemple.test', motDePasse: '' }).success).toBe(false)
  })
  it('refuse une modification de réglages vide', () => {
    expect(schemaModificationReglages.safeParse({}).success).toBe(false)
    expect(schemaModificationReglages.safeParse({ debutSemaine: 8 }).success).toBe(false)
    expect(schemaModificationReglages.safeParse({ reportHebdo: true }).success).toBe(true)
  })
})
