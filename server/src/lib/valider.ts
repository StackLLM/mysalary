import { CODES_ERREUR } from '@mysalary/partage'
import type { z } from 'zod'
import { ErreurApi } from './erreurs'

/** Valide une entrée avec un schéma Zod partagé, ou lève une erreur 400 détaillée par champ. */
export function valider<S extends z.ZodType>(schema: S, donnees: unknown): z.output<S> {
  const resultat = schema.safeParse(donnees)
  if (resultat.success) return resultat.data

  const champs: Record<string, string> = {}
  for (const probleme of resultat.error.issues) {
    const cle = probleme.path.length > 0 ? probleme.path.join('.') : '_'
    if (probleme.code === 'unrecognized_keys') {
      for (const inconnu of probleme.keys) champs[inconnu] = 'Champ non autorisé.'
    } else {
      champs[cle] ??= probleme.message
    }
  }
  throw new ErreurApi(400, CODES_ERREUR.VALIDATION, 'Certaines valeurs sont invalides.', champs)
}
