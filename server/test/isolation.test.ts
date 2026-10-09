import { REGLAGES_PAR_DEFAUT } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

describe('compte courant et isolation des données', () => {
  it('refuse une route de compte sans en-tête', async () => {
    const reponse = await ctx.app.inject({ method: 'GET', url: url('/reglages') })
    expect(reponse.statusCode).toBe(401)
    expect(reponse.json().erreur.code).toBe('UTILISATEUR_REQUIS')
  })

  it('refuse un compte inconnu', async () => {
    const reponse = await ctx.app.inject({ method: 'GET', url: url('/reglages'), headers: pour('fantome') })
    expect(reponse.statusCode).toBe(401)
    expect(reponse.json().erreur.code).toBe('UTILISATEUR_INCONNU')
  })

  it('A ne lit ni ne modifie jamais les réglages de B', async () => {
    const a = await creerCompte(ctx.app, 'A')
    const b = await creerCompte(ctx.app, 'B')

    const modif = await ctx.app.inject({
      method: 'PUT',
      url: url('/reglages'),
      headers: pour(a.id),
      payload: { modePeriode: 'calendaire', animations: false },
    })
    expect(modif.statusCode).toBe(200)
    expect(modif.json()).toMatchObject({ modePeriode: 'calendaire', animations: false })

    const reglagesB = await ctx.app.inject({ method: 'GET', url: url('/reglages'), headers: pour(b.id) })
    expect(reglagesB.json()).toEqual(REGLAGES_PAR_DEFAUT)

    const reglagesA = await ctx.app.inject({ method: 'GET', url: url('/reglages'), headers: pour(a.id) })
    expect(reglagesA.json()).toMatchObject({ modePeriode: 'calendaire', animations: false })
  })

  it('refuse une modification de réglages invalide', async () => {
    const a = await creerCompte(ctx.app, 'A')
    const reponse = await ctx.app.inject({
      method: 'PUT',
      url: url('/reglages'),
      headers: pour(a.id),
      payload: { debutSemaine: 9 },
    })
    expect(reponse.statusCode).toBe(400)
    expect(reponse.json().erreur.champs).toHaveProperty('debutSemaine')
  })
})
