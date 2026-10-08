import { z } from 'zod'

export const MODES_PERIODE = ['cyclePaie', 'calendaire'] as const
export type ModePeriode = (typeof MODES_PERIODE)[number]

export const schemaReglages = z.strictObject({
  modePeriode: z.enum(MODES_PERIODE, { error: 'Mode de période inconnu.' }),
  /** 1 = lundi … 7 = dimanche. */
  debutSemaine: z
    .number({ error: 'Le début de semaine doit être un nombre.' })
    .int()
    .min(1, 'Le début de semaine va de 1 (lundi) à 7 (dimanche).')
    .max(7, 'Le début de semaine va de 1 (lundi) à 7 (dimanche).'),
  reportHebdo: z.boolean({ error: 'Valeur oui / non attendue.' }),
  animations: z.boolean({ error: 'Valeur oui / non attendue.' }),
})
export type Reglages = z.infer<typeof schemaReglages>

export const schemaModificationReglages = schemaReglages
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Aucun réglage à modifier.')
export type ModificationReglages = z.infer<typeof schemaModificationReglages>

export const REGLAGES_PAR_DEFAUT: Reglages = {
  modePeriode: 'cyclePaie',
  debutSemaine: 1,
  reportHebdo: false,
  animations: true,
}
