import { CODES_ERREUR, PREFIXE_API, type CodeErreur, type ReponseErreur } from '@mysalary/partage'
import { lireUtilisateurCourant } from '../state/utilisateur'

/** Émis quand le serveur refuse le compte ouvert faute de session. */
export const EVENEMENT_SESSION_EXPIREE = 'mysalary:session-expiree'

/** Erreur renvoyée par le serveur, au format commun. */
export class ErreurApi extends Error {
  constructor(
    readonly statut: number,
    readonly code: CodeErreur,
    message: string,
    readonly champs?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ErreurApi'
  }
}

type Methode = 'GET' | 'POST' | 'PUT' | 'DELETE'

/**
 * Seul point d'accès au serveur. Le compte vient du cookie de session (HttpOnly, envoyé par le navigateur) :
 * le client ne désigne jamais un compte. Toute erreur devient une `ErreurApi`.
 */
export async function appelerApi<T>(methode: Methode, chemin: string, corps?: unknown): Promise<T> {
  const entetes: Record<string, string> = {}
  const utilisateur = lireUtilisateurCourant()
  if (corps !== undefined) entetes['content-type'] = 'application/json'

  let reponse: Response
  try {
    reponse = await fetch(`${PREFIXE_API}${chemin}`, {
      method: methode,
      headers: entetes,
      credentials: 'same-origin',
      ...(corps !== undefined ? { body: JSON.stringify(corps) } : {}),
    })
  } catch {
    throw new ErreurApi(0, CODES_ERREUR.INTERNE, 'Connexion au serveur perdue. Tes données ne sont pas perdues.')
  }

  if (reponse.status === 204) return undefined as T
  const texte = await reponse.text()
  const donnees: unknown = texte ? JSON.parse(texte) : undefined

  if (!reponse.ok) {
    const erreur = (donnees as Partial<ReponseErreur> | undefined)?.erreur
    // Session perdue ou expirée sur un compte ouvert : l'app le quitte et demande de se reconnecter.
    if (erreur?.code === CODES_ERREUR.SESSION_REQUISE && utilisateur && !chemin.startsWith('/auth/')) window.dispatchEvent(new Event(EVENEMENT_SESSION_EXPIREE))
    throw new ErreurApi(
      reponse.status,
      erreur?.code ?? CODES_ERREUR.INTERNE,
      erreur?.message ?? 'Erreur inattendue du serveur.',
      erreur?.champs,
    )
  }
  return donnees as T
}

export const api = {
  lire: <T>(chemin: string) => appelerApi<T>('GET', chemin),
  creer: <T>(chemin: string, corps: unknown) => appelerApi<T>('POST', chemin, corps),
  modifier: <T>(chemin: string, corps: unknown) => appelerApi<T>('PUT', chemin, corps),
  supprimer: (chemin: string) => appelerApi<void>('DELETE', chemin),
}
