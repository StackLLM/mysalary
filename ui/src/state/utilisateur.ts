const CLE = 'mysalary.utilisateur'

/**
 * Compte connecté sur ce navigateur, retenu pour afficher l'app sans attendre (clé des données en cache).
 * Ce n'est qu'un indice : le serveur ne fait confiance qu'au cookie de session. Le stockage peut être indisponible.
 */
export function lireUtilisateurCourant(): string | null {
  try {
    return globalThis.localStorage?.getItem(CLE) ?? null
  } catch {
    return null
  }
}

export function choisirUtilisateur(id: string | null) {
  try {
    if (id) globalThis.localStorage?.setItem(CLE, id)
    else globalThis.localStorage?.removeItem(CLE)
  } catch {
    // Stockage indisponible : le choix ne sera pas retenu, sans autre effet.
  }
}
