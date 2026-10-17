import { CODES_ERREUR, type CodeErreur } from '@mysalary/partage'

/** Erreur métier ou HTTP prévue : elle est renvoyée telle quelle au client. */
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

export const introuvable = (quoi: string) =>
  new ErreurApi(404, CODES_ERREUR.INTROUVABLE, `${quoi} introuvable.`)

/**
 * Écriture d'un seul élément du compte : `updateMany` / `deleteMany` sur `{ id, utilisateurId }`.
 * Rien de touché = l'élément n'existe pas ou appartient à un autre compte → 404 (prod.md § 6.3).
 */
export function exigerTouche(resultat: { count: number }, quoi: string) {
  if (resultat.count === 0) throw introuvable(quoi)
}
