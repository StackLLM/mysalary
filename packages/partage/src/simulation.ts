import { HORIZONS, type DateCivile, type Simulation } from '@mysalary/moteur'
import { z } from 'zod'
import { schemaMontantPositif } from './charges'
import { schemaCleMois } from './salaire'

export { HORIZONS }
export type { AlerteSimulation, Ajustements, ObjectifSimule, PointSimulation } from '@mysalary/moteur'

const identifiant = z.string().min(1).max(64)

/** Leviers d'une simulation (UX.md § 4.5) : des hypothèses, jamais des données. */
export const schemaAjustements = z.strictObject({
  versements: z.record(identifiant, schemaMontantPositif.nullable()).default({}),
  datesCibles: z.record(identifiant, schemaCleMois.nullable()).default({}),
  primes: z.array(z.strictObject({ mois: schemaCleMois, montant: schemaMontantPositif })).max(12, '12 primes au plus.').default([]),
  reductions: z.array(z.strictObject({ chargeId: identifiant, montant: schemaMontantPositif })).max(20, '20 réductions au plus.').default([]),
})
export type SaisieAjustements = z.input<typeof schemaAjustements>

const horizon = z
  .number({ error: 'Horizon attendu.' })
  .refine((v) => (HORIZONS as readonly number[]).includes(v), 'Horizon : 6, 12, 24 ou 36 mois.')
  .default(12)

export const schemaExecution = z.strictObject({ ajustements: schemaAjustements.prefault({}), horizon })
export type SaisieExecution = z.input<typeof schemaExecution>

export const schemaApplication = z.strictObject({ ajustements: schemaAjustements })

export const schemaScenario = z.strictObject({
  nom: z.string({ error: 'Nom obligatoire.' }).trim().min(1, 'Nom obligatoire.').max(60, 'Nom trop long (60 caractères au plus).'),
  ajustements: schemaAjustements,
  horizon,
})
export type SaisieScenario = z.input<typeof schemaScenario>

/** Simulateur : projection avec leviers ; rien n'est écrit. */
export interface SimulationDto extends Simulation {
  aujourdhui: DateCivile
}

export interface ScenarioDto {
  id: string
  nom: string
  ajustements: z.output<typeof schemaAjustements>
  horizon: number
  creeLe: string
}

/** Résumé des changements faits au plan par « Appliquer ». */
export interface ApplicationDto {
  changements: string[]
}
