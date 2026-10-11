export const CODES_ERREUR = {
  VALIDATION: 'VALIDATION',
  UTILISATEUR_REQUIS: 'UTILISATEUR_REQUIS',
  UTILISATEUR_INCONNU: 'UTILISATEUR_INCONNU',
  /** Compte protégé : il faut se connecter (session absente ou expirée). */
  SESSION_REQUISE: 'SESSION_REQUISE',
  /** Mot de passe refusé. */
  IDENTIFIANTS_REFUSES: 'IDENTIFIANTS_REFUSES',
  TROP_DE_TENTATIVES: 'TROP_DE_TENTATIVES',
  INTROUVABLE: 'INTROUVABLE',
  /** Doublon (ex. deux versions du contrat pour le même mois). */
  CONFLIT: 'CONFLIT',
  /** Valeurs valides une à une, mais incohérentes avec les autres données (ex. date de paie). */
  REGLE_METIER: 'REGLE_METIER',
  ROUTE_INCONNUE: 'ROUTE_INCONNUE',
  INTERNE: 'INTERNE',
} as const

export type CodeErreur = (typeof CODES_ERREUR)[keyof typeof CODES_ERREUR]

/** Format unique de toutes les erreurs renvoyées par le serveur. */
export interface ReponseErreur {
  erreur: {
    code: CodeErreur
    message: string
    /** Message par champ invalide, clé = chemin du champ (ex. `prenom`). */
    champs?: Record<string, string>
  }
}
