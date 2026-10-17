import { PREFIXE_API } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

/**
 * Champ inconnu refusé (prod.md § 6.1, lot P2) : chaque route qui reçoit un corps le valide avec un schéma strict.
 * Les routes du compte sont lues dans Fastify : une nouvelle route avec un corps est testée d'office.
 */
const ctx = preparerApp()

/** Routes sans corps, ou au corps volontairement souple. */
const SANS_CORPS = new Set([
  'POST /compte/email/renvoi',
  'POST /mois/:cle/rouvrir',
  // Un export d'une version plus récente peut porter des champs que celle-ci ne connaît pas encore.
  'POST /compte/restauration',
])

const ROUTES_PUBLIQUES = ['POST /auth/inscription', 'POST /auth/connexion', 'POST /auth/mot-de-passe/oubli', 'POST /auth/mot-de-passe/reinitialisation', 'POST /auth/email/verification']

const chemin = (route: string) =>
  route
    .split(' ')[1]!
    .replace(':mois', '2027-01')
    .replace(':cle', '2027-01')
    .replace(':annee', '2027')
    .replace(':paiementId', 'x')
    .replace(':id', 'x')

describe('champs inconnus', () => {
  it('chaque route qui reçoit un corps refuse un champ qu’elle ne connaît pas', async () => {
    const compte = await creerCompte(ctx.app, 'A')
    const avecCorps = [...new Set(ctx.routes)]
      .map((r) => r.replace(PREFIXE_API, ''))
      .filter((r) => (r.startsWith('POST ') || r.startsWith('PUT ')) && !SANS_CORPS.has(r))
    expect(avecCorps.length).toBeGreaterThan(40)

    const acceptes: string[] = []
    for (const route of [...avecCorps, ...ROUTES_PUBLIQUES]) {
      const methode = route.split(' ')[0] as 'POST' | 'PUT'
      const r = await ctx.app.inject({ method: methode, url: url(chemin(route)), headers: pour(compte.id), payload: { champInconnu: 1 } })
      if (r.statusCode !== 400 || r.json().erreur?.champs?.champInconnu !== 'Champ non autorisé.') acceptes.push(`${route} → ${r.statusCode} ${r.body.slice(0, 120)}`)
    }
    expect(acceptes).toEqual([])
  })
})
