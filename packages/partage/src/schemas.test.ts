import { describe, expect, it } from 'vitest'
import { schemaConnexion, schemaInscription, schemaModificationReglages } from './index'

describe('schémas', () => {
  it('inscription : nettoie le prénom et l’e-mail (minuscules), met MAD par défaut', () => {
    expect(schemaInscription.parse({ prenom: '  Oussama ', email: ' Oussama@Exemple.TEST ', motDePasse: 'mot-de-passe', accepteConditions: true })).toEqual({
      prenom: 'Oussama',
      email: 'oussama@exemple.test',
      motDePasse: 'mot-de-passe',
      devise: 'MAD',
      accepteConditions: true,
    })
  })
  it('inscription : refuse un prénom vide, un e-mail invalide, un mot de passe court et un champ inconnu', () => {
    const base = { prenom: 'A', email: 'a@exemple.test', motDePasse: 'mot-de-passe', accepteConditions: true }
    for (const mauvais of [{ ...base, accepteConditions: false }, { ...base, prenom: '  ' }, { ...base, email: 'pas-un-email' }, { ...base, motDePasse: '1234567' }, { ...base, role: 'admin' }]) {
      expect(schemaInscription.safeParse(mauvais).success, JSON.stringify(mauvais)).toBe(false)
    }
  })
  it('mot de passe : les plus courants et les répétitions sont refusés, en majuscules aussi ; un mot de passe ordinaire passe', () => {
    const base = { prenom: 'A', email: 'a@exemple.test', accepteConditions: true }
    for (const courant of ['password123', 'AZERTYUIOP', '12345678', 'motdepasse', 'Maroc123', 'zzzzzzzzzz']) {
      const r = schemaInscription.safeParse({ ...base, motDePasse: courant })
      expect(r.success, courant).toBe(false)
      expect(r.error?.issues[0]?.message).toBe('Ce mot de passe est trop courant : choisis-en un autre.')
    }
    expect(schemaInscription.safeParse({ ...base, motDePasse: 'cheval-agrafe-bleu' }).success).toBe(true)
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
