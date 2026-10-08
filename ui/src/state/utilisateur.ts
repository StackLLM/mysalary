const CLE = 'mysalary.utilisateur'

/** Compte choisi sur l'écran Profils. Le stockage peut être indisponible : on ne casse jamais. */
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
