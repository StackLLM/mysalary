import { REGLAGES_PAR_DEFAUT } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, MOT_DE_PASSE_TEST, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

describe('compte courant et isolation des données', () => {
  it('refuse une route de compte sans session, avec un faux cookie, ou avec l’ancien en-tête X-Utilisateur', async () => {
    const a = await creerCompte(ctx.app, 'A')
    for (const headers of [{}, { cookie: 'mysalary_session=faux' }, { 'x-utilisateur': a.id }]) {
      const reponse = await ctx.app.inject({ method: 'GET', url: url('/reglages'), headers })
      expect(reponse.statusCode, JSON.stringify(headers)).toBe(401)
      expect(reponse.json().erreur.code).toBe('SESSION_REQUISE')
    }
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

  it('répond sur /sante ; erreurs normalisées : JSON illisible, route inconnue', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: url('/sante') })).json()).toEqual({ statut: 'ok' })
    const illisible = await ctx.app.inject({ method: 'POST', url: url('/auth/inscription'), headers: { 'content-type': 'application/json' }, payload: '{prenom:' })
    expect(illisible.statusCode).toBe(400)
    expect(illisible.json().erreur.code).toBe('VALIDATION')
    const route = await ctx.app.inject({ method: 'GET', url: url('/rien') })
    expect(route.statusCode).toBe(404)
    expect(route.json().erreur.code).toBe('ROUTE_INCONNUE')
  })

  it('supprimer un compte supprime ses réglages et ses sessions', async () => {
    const a = await creerCompte(ctx.app, 'A')
    expect(await ctx.prisma.reglages.count({ where: { utilisateurId: a.id } })).toBe(1)
    await ctx.app.inject({ method: 'POST', url: url('/compte/suppression'), headers: pour(a.id), payload: { motDePasse: MOT_DE_PASSE_TEST } })
    expect(await ctx.prisma.reglages.count()).toBe(0)
    expect(await ctx.prisma.session.count()).toBe(0)
  })
})
