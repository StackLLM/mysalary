import { ErreurApi } from '../../lib/api'

/** Erreurs par champ d'un schéma partagé (mêmes règles que le serveur, sans aller-retour). */
export function erreursDe(erreur: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string> {
  const champs: Record<string, string> = {}
  for (const i of erreur.issues) champs[String(i.path[0] ?? '_')] ??= i.message
  return champs
}

/** Erreurs d'une réponse du serveur : par champ si possible, sinon un message général. */
export function erreursServeur(e: unknown): Record<string, string> {
  if (e instanceof ErreurApi) return e.champs && Object.keys(e.champs).length > 0 ? e.champs : { _: e.message }
  return { _: 'Erreur inattendue. Réessaie.' }
}

/** Page où revenir après la connexion : seulement une adresse interne de l'app (jamais un autre site). */
export function suiteSure(suite: string | null): string {
  return suite && suite.startsWith('/') && !suite.startsWith('//') && !suite.startsWith('/connexion') ? suite : '/'
}
