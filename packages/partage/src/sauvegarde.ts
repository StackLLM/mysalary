import { z } from 'zod'
import { DEVISES } from './utilisateurs'

/** Export d'un compte (lot 20) : toutes ses données, en JSON, pour les sauvegarder ou les rouvrir dans un autre compte. */
export const FORMAT_EXPORT = 'mysalary-export'
export const VERSION_EXPORT = 1

const ligne = z.record(z.string(), z.unknown())

export const schemaExportCompte = z.object({
  format: z.literal(FORMAT_EXPORT, { error: 'Ce fichier n’est pas un export MySalary.' }),
  version: z.number({ error: 'Ce fichier n’est pas un export MySalary.' }).int().min(1),
  exporteLe: z.string().optional(),
  compte: z.object({ prenom: z.string().trim().min(1).max(40), devise: z.enum(DEVISES) }),
  /** Lignes de chaque table, avec leurs identifiants d'origine. */
  donnees: z.record(z.string(), z.array(ligne)),
})
export type ExportCompte = z.infer<typeof schemaExportCompte>

/** Ce que l'import a créé : le nouveau compte et le nombre de lignes reprises. */
export interface ResultatImportCompte {
  utilisateur: import('./utilisateurs').Utilisateur
  lignes: number
}
