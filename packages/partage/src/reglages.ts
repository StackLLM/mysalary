import { CERTITUDES, REGLES_SCENARIOS_DEFAUT } from '@mysalary/moteur'
import { z } from 'zod'
import { schemaCleMois } from './salaire'

export { REGLES_SCENARIOS_DEFAUT }
export type { RegleScenario, ReglesScenarios } from '@mysalary/moteur'

const regle = z.strictObject({
  /** « garanti » est toujours retenu, même absent de la liste. */
  revenus: z.array(z.enum(CERTITUDES, { error: 'Certitude inconnue.' })).max(3).transform((l) => [...new Set(l)]),
  flexibleMoyenne: z.boolean({ error: 'Valeur oui / non attendue.' }),
})

/** Règles des scénarios (Plan.md § 7.3), modifiables (UX.md § 5.12). */
export const schemaReglesScenarios = z.strictObject({ prudent: regle, realiste: regle, ambitieux: regle })

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
  reglesScenarios: schemaReglesScenarios,
  /** Solde du compte courant au début d'un mois budgétaire : point de départ du cumul (lot 13). `null` : 0 au premier mois suivi. */
  depart: z
    .strictObject({
      mois: schemaCleMois,
      solde: z.number({ error: 'Montant attendu.' }).int('Montant en centimes entiers.').min(-100_000_000_00, 'Montant trop grand.').max(100_000_000_00, 'Montant trop grand.'),
    })
    .nullable(),
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
  reglesScenarios: REGLES_SCENARIOS_DEFAUT,
  depart: null,
}
