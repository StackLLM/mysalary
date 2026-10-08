import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { choisirUtilisateur } from '../state/utilisateur'
import { ErreurApi, appelerApi } from './api'

function stockageMemoire(): Storage {
  const donnees = new Map<string, string>()
  return {
    getItem: (k) => donnees.get(k) ?? null,
    setItem: (k, v) => void donnees.set(k, v),
    removeItem: (k) => void donnees.delete(k),
    clear: () => donnees.clear(),
    key: () => null,
    get length() {
      return donnees.size
    },
  }
}

const reponseJson = (statut: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json' } })

describe('client API', () => {
  beforeEach(() => vi.stubGlobal('localStorage', stockageMemoire()))
  afterEach(() => vi.unstubAllGlobals())

  it('ajoute l’en-tête du compte courant', async () => {
    choisirUtilisateur('u1')
    const fetchMock = vi.fn().mockResolvedValue(reponseJson(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await appelerApi('GET', '/reglages')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/reglages', expect.objectContaining({
      headers: { 'x-utilisateur': 'u1' },
    }))
  })

  it('transforme une réponse d’erreur en ErreurApi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      reponseJson(400, { erreur: { code: 'VALIDATION', message: 'Invalide', champs: { prenom: 'Obligatoire' } } }),
    ))
    const erreur = await appelerApi('POST', '/utilisateurs', {}).catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur).toMatchObject({ statut: 400, code: 'VALIDATION', champs: { prenom: 'Obligatoire' } })
  })

  it('signale une coupure réseau sans planter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(appelerApi('GET', '/sante')).rejects.toMatchObject({ statut: 0 })
  })

  it('accepte une réponse vide (204)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(appelerApi('DELETE', '/utilisateurs/u1')).resolves.toBeUndefined()
  })
})
