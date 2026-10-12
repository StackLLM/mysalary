import {
  STATUTS_OBJECTIF,
  TYPES_OBJECTIF,
  type CleMois,
  type DateCivile,
  type EtatEpargne,
  type MouvementEpargne,
  type PointTrajectoireObjectif,
  type ReglesScenarios,
  type Scenario,
  type SuiviDesObjectifs,
  type SuiviObjectif,
  type SimulationObjectif,
} from '@mysalary/moteur'
import { z } from 'zod'
import { schemaMontantPositif, schemaNote } from './charges'
import { schemaCleMois, schemaDateCivile } from './salaire'

export { SCENARIOS, STATUTS_OBJECTIF, TYPES_OBJECTIF } from '@mysalary/moteur'
export type { MoisSimulation, SimulationObjectif } from '@mysalary/moteur'
export type { EtatEpargne, PointTrajectoireObjectif, Risque, Scenario, StatutObjectif, SuiviObjectif, TypeObjectif } from '@mysalary/moteur'

const libelle = (nom: string) =>
  z
    .string({ error: `${nom} obligatoire.` })
    .trim()
    .min(1, `${nom} obligatoire.`)
    .max(60, `${nom} trop long (60 caractères au plus).`)

const montantOuZero = z
  .number({ error: 'Entre un montant (0 si rien).' })
  .int('Montant en centimes entiers attendu.')
  .min(0, 'Le montant ne peut pas être négatif.')
  .max(1_000_000_000, 'Montant trop élevé.')

// --- Comptes et mouvements ---

/** Compte d'épargne : le solde déclaré est du réel, à une date (R12). */
export const schemaCompteEpargne = z.strictObject({
  libelle: libelle('Le nom du compte'),
  solde: montantOuZero,
  auLe: schemaDateCivile,
})
export type SaisieCompteEpargne = z.input<typeof schemaCompteEpargne>

/** Versement (avec ou sans objectif) ou retrait : réel, jamais une dépense (R11). */
export const schemaMouvementEpargne = z.strictObject({
  sens: z.enum(['versement', 'retrait'], { error: 'Versement ou retrait ?' }),
  compteId: z.string({ error: 'Choisis un compte.' }).min(1, 'Choisis un compte.'),
  objectifId: z.string().min(1).nullable().default(null),
  date: schemaDateCivile,
  montant: schemaMontantPositif,
  libelle: z.string().trim().max(60, 'Libellé trop long (60 caractères au plus).').default(''),
  note: schemaNote,
})
export type SaisieMouvementEpargne = z.input<typeof schemaMouvementEpargne>

export interface MouvementEpargneDto extends Omit<MouvementEpargne, 'montant'> {
  montant: number
  note: string | null
  /** Nom de l'objectif lié. */
  objectif: string | null
  compte: string
}

export type CompteSuiviDto = EtatEpargne['comptes'][number]

/** Mon plan › Épargne. */
export interface EpargneDto {
  aujourdhui: DateCivile
  etat: EtatEpargne
  mouvements: MouvementEpargneDto[]
  /** Objectifs qui peuvent recevoir un versement (actifs ou en pause). */
  objectifs: { id: string; libelle: string; statut: string }[]
}

// --- Objectifs ---

export const schemaObjectif = z
  .strictObject({
    libelle: libelle('Le nom'),
    type: z.enum(TYPES_OBJECTIF, { error: 'Type inconnu.' }).default('autre'),
    montantCible: schemaMontantPositif,
    montantInitial: montantOuZero.default(0),
    dateCible: schemaCleMois.nullable().default(null),
    versementMensuel: schemaMontantPositif.nullable().default(null),
  })
  .refine((v) => v.montantInitial <= v.montantCible || v.montantInitial === 0, {
    path: ['montantInitial'],
    message: 'Déjà plus que la cible : l’objectif serait atteint dès sa création.',
  })
export type SaisieObjectif = z.input<typeof schemaObjectif>

export const schemaOrdreObjectifs = z.strictObject({ ids: z.array(z.string().min(1)).min(1, 'Aucun objectif à ordonner.') })

export const schemaStatutObjectif = z.strictObject({
  statut: z.enum(STATUTS_OBJECTIF.filter((s) => s !== 'realise') as ['actif', 'pause', 'abandonne'], { error: 'Statut inconnu.' }),
})

/** Achat réalisé (R19) : l'épargne de l'objectif est consommée à cette date, sans dépense. */
export const schemaRealisation = z.strictObject({
  date: schemaDateCivile,
  compteId: z.string({ error: 'Choisis le compte d’où sort l’argent.' }).min(1, 'Choisis le compte d’où sort l’argent.'),
})
export type SaisieRealisation = z.input<typeof schemaRealisation>

/** Page Objectifs : projections de chaque objectif, épargne, cible proposée d'un fonds de sécurité. */
export interface ObjectifsDto extends SuiviDesObjectifs {
  aujourdhui: DateCivile
  /** 3 à 6 mois de charges essentielles (lot 6) ; `null` sans charge essentielle. */
  fondsSecurite: { min: number; max: number; base: number } | null
  comptes: { id: string; libelle: string }[]
  /** Règles des scénarios utilisées (Réglages). */
  regles: ReglesScenarios
}

/** Page Objectif (détail). */
export interface ObjectifDetailDto {
  aujourdhui: DateCivile
  moisCourant: CleMois
  objectif: SuiviObjectif
  trajectoire: PointTrajectoireObjectif[]
  versements: MouvementEpargneDto[]
  capacite: Record<Scenario, number>
  comptes: { id: string; libelle: string }[]
  regles: ReglesScenarios
  /** Simulation avec le cumul de fin de mois ; `null` si l'objectif n'est pas actif. */
  simulation: SimulationObjectif | null
}

/** Aperçu en direct d'un objectif pas encore créé (projection seule). */
export interface ApercuObjectifDto {
  objectif: SuiviObjectif
  capacite: Record<Scenario, number>
}
