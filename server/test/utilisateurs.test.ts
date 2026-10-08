import { describe, expect, it } from 'vitest'
import { creerCompte, preparerApp, url } from './outils'

const ctx = preparerApp()

describe('comptes utilisateurs', () => {
  it('répond sur /sante', async () => {
    const reponse = await ctx.app.inject({ method: 'GET', url: url('/sante') })
    expect(reponse.json()).toEqual({ statut: 'ok' })
  })

  it('crée, liste, renomme et supprime un compte', async () => {
    const compte = await creerCompte(ctx.app, '  Oussama ')
    expect(compte).toMatchObject({ prenom: 'Oussama', devise: 'MAD', onboardingTermine: false })

    const liste = await ctx.app.inject({ method: 'GET', url: url('/utilisateurs') })
    expect(liste.json()).toHaveLength(1)

    const renomme = await ctx.app.inject({
      method: 'PUT',
      url: url(`/utilisateurs/${compte.id}`),
      payload: { prenom: 'Oussa' },
    })
    expect(renomme.json().prenom).toBe('Oussa')

    const suppression = await ctx.app.inject({ method: 'DELETE', url: url(`/utilisateurs/${compte.id}`) })
    expect(suppression.statusCode).toBe(204)
    expect((await ctx.app.inject({ method: 'GET', url: url('/utilisateurs') })).json()).toEqual([])
  })

  it('trie les comptes du plus récemment ouvert au jamais ouvert', async () => {
    const a = await creerCompte(ctx.app, 'A')
    const b = await creerCompte(ctx.app, 'B')
    await creerCompte(ctx.app, 'C')
    expect(a.derniereOuverture).toBeNull()

    const ouvert = await ctx.app.inject({ method: 'POST', url: url(`/utilisateurs/${b.id}/ouvrir`) })
    expect(ouvert.statusCode).toBe(200)
    expect(ouvert.json().derniereOuverture).toEqual(expect.any(String))

    const liste = (await ctx.app.inject({ method: 'GET', url: url('/utilisateurs') })).json() as { prenom: string }[]
    expect(liste.map((u) => u.prenom)).toEqual(['B', 'A', 'C'])
  })

  it('refuse d’ouvrir un compte inconnu', async () => {
    const reponse = await ctx.app.inject({ method: 'POST', url: url('/utilisateurs/inconnu/ouvrir') })
    expect(reponse.statusCode).toBe(404)
  })

  it('crée les réglages par défaut avec le compte et les supprime avec lui', async () => {
    const compte = await creerCompte(ctx.app, 'A')
    expect(await ctx.prisma.reglages.count({ where: { utilisateurId: compte.id } })).toBe(1)
    await ctx.app.inject({ method: 'DELETE', url: url(`/utilisateurs/${compte.id}`) })
    expect(await ctx.prisma.reglages.count()).toBe(0)
  })

  it('renvoie une erreur 400 détaillée par champ', async () => {
    const reponse = await ctx.app.inject({
      method: 'POST',
      url: url('/utilisateurs'),
      payload: { prenom: '', devise: 'XYZ', role: 'admin' },
    })
    expect(reponse.statusCode).toBe(400)
    expect(reponse.json()).toEqual({
      erreur: {
        code: 'VALIDATION',
        message: 'Certaines valeurs sont invalides.',
        champs: {
          prenom: 'Le prénom est obligatoire.',
          devise: 'Devise non prise en charge.',
          role: 'Champ non autorisé.',
        },
      },
    })
  })

  it('renvoie une erreur normalisée pour un JSON illisible', async () => {
    const reponse = await ctx.app.inject({
      method: 'POST',
      url: url('/utilisateurs'),
      headers: { 'content-type': 'application/json' },
      payload: '{prenom:',
    })
    expect(reponse.statusCode).toBe(400)
    expect(reponse.json().erreur.code).toBe('VALIDATION')
  })

  it('renvoie 404 pour un compte ou une route inconnus', async () => {
    const compte = await ctx.app.inject({ method: 'PUT', url: url('/utilisateurs/inconnu'), payload: { prenom: 'X' } })
    expect(compte.statusCode).toBe(404)
    expect(compte.json().erreur.code).toBe('INTROUVABLE')

    const route = await ctx.app.inject({ method: 'GET', url: url('/rien') })
    expect(route.statusCode).toBe(404)
    expect(route.json().erreur.code).toBe('ROUTE_INCONNUE')
  })
})
