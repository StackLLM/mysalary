import {
  CERTITUDES,
  FREQUENCES_CHARGE,
  GROUPES_CATEGORIE,
  NATURES_CHARGE,
  UNITES_ENVELOPPE,
  type Centimes,
  type Charge,
  type ChargePrevue,
  type ChargesDuMois,
  type CleMois,
  type DateCivile,
  type Dette,
  type EtatDette,
  type GroupeCategorie,
  type PaiementDette,
  type Ponctuel,
  type Semaine,
} from '@mysalary/moteur'
import { z } from 'zod'
import { schemaCleMois, schemaDateCivile } from './salaire'

export { FREQUENCES_CHARGE, GROUPES_CATEGORIE, NATURES_CHARGE, UNITES_ENVELOPPE }
export type { AjustementSemaine, ChargePrevue, Echeance, FrequenceCharge, GroupeCategorie, NatureCharge, UniteEnveloppe } from '@mysalary/moteur'

const MAXIMUM = 1_000_000_000

const texte = (nom: string, max = 60) =>
  z
    .string({ error: `${nom} obligatoire.` })
    .trim()
    .min(1, `${nom} obligatoire.`)
    .max(max, `${nom} trop long (${max} caractères au plus).`)

const montant = z
  .number({ error: 'Entre un montant supérieur à 0.' })
  .int('Montant en centimes entiers attendu.')
  .min(1, 'Entre un montant supérieur à 0.')
  .max(MAXIMUM, 'Montant trop élevé.')

const note = z.string().trim().max(200, 'Note trop longue (200 caractères au plus).').optional()

export { montant as schemaMontantPositif, note as schemaNote }

// --- Catégories ---

export const ICONES_CATEGORIE = [
  'maison', 'panier', 'voiture', 'telephone', 'sante', 'bouclier', 'famille', 'abonnement',
  'loisirs', 'sport', 'shopping', 'banque', 'education', 'cadeau', 'autre',
] as const
export type IconeCategorie = (typeof ICONES_CATEGORIE)[number]

export const schemaCategorie = z.strictObject({
  libelle: texte('Le nom', 40),
  groupe: z.enum(GROUPES_CATEGORIE, { error: 'Groupe inconnu.' }),
  icone: z.enum(ICONES_CATEGORIE, { error: 'Icône inconnue.' }).default('autre'),
})
export type SaisieCategorie = z.input<typeof schemaCategorie>

/** Catégories créées au premier usage d'un compte. Modifiables ensuite. */
export const CATEGORIES_PAR_DEFAUT: { libelle: string; groupe: GroupeCategorie; icone: IconeCategorie }[] = [
  { libelle: 'Logement', groupe: 'essentiel', icone: 'maison' },
  { libelle: 'Alimentation', groupe: 'essentiel', icone: 'panier' },
  { libelle: 'Transport', groupe: 'essentiel', icone: 'voiture' },
  { libelle: 'Télécom & internet', groupe: 'essentiel', icone: 'telephone' },
  { libelle: 'Santé', groupe: 'essentiel', icone: 'sante' },
  { libelle: 'Assurances', groupe: 'essentiel', icone: 'bouclier' },
  { libelle: 'Famille', groupe: 'engagement', icone: 'famille' },
  { libelle: 'Abonnements', groupe: 'flexible', icone: 'abonnement' },
  { libelle: 'Loisirs', groupe: 'flexible', icone: 'loisirs' },
  { libelle: 'Sport', groupe: 'flexible', icone: 'sport' },
  { libelle: 'Shopping', groupe: 'flexible', icone: 'shopping' },
  { libelle: 'Formation', groupe: 'flexible', icone: 'education' },
  { libelle: 'Autre', groupe: 'flexible', icone: 'autre' },
]

export interface CategorieDto {
  id: string
  libelle: string
  groupe: GroupeCategorie
  icone: IconeCategorie
  ordre: number
  /** Utilisée par une charge, un ponctuel ou une dépense : la suppression est refusée. */
  utilisee: boolean
  /** Nombre de dépenses notées : les plus utilisées sont proposées en premier à la saisie. */
  depenses: number
}

// --- Charges fixes et enveloppes ---

export const schemaCharge = z
  .strictObject({
    libelle: texte('Le libellé'),
    categorieId: z.string({ error: 'Choisis une catégorie.' }).min(1, 'Choisis une catégorie.'),
    nature: z.enum(NATURES_CHARGE, { error: 'Type de charge inconnu.' }),
    montant,
    frequence: z.enum(FREQUENCES_CHARGE, { error: 'Fréquence inconnue.' }).default('mensuelle'),
    mois: z.array(z.number().int().min(1).max(12)).max(12).default([]),
    jour: z.number().int().min(1, 'Le jour va de 1 à 31.').max(31, 'Le jour va de 1 à 31.').nullable().default(null),
    debut: schemaCleMois,
    fin: schemaCleMois.nullable().default(null),
    essentielle: z.boolean().default(false),
    /** Enveloppe : rythme de consommation du budget du mois (ignoré pour une charge fixe). */
    unite: z.enum(UNITES_ENVELOPPE, { error: 'Rythme inconnu.' }).default('mois'),
    /** Enveloppe par jour : montant reçu chaque jour. */
    rythme: montant.nullable().default(null),
    /** Enveloppe par semaine : le montant que l'utilisateur met sur chaque semaine (une semaine absente reçoit 0). */
    semaines: z
      .array(z.strictObject({ debut: schemaDateCivile, montant: z.number().int('Montant en centimes entiers attendu.').min(0, 'Montant négatif.').max(MAXIMUM, 'Montant trop élevé.') }))
      .max(120)
      .default([]),
  })
  .superRefine((v, ctx) => {
    if (v.nature === 'fixe' && v.jour === null) ctx.addIssue({ code: 'custom', path: ['jour'], message: 'Indique le jour du paiement.' })
    if (v.nature === 'fixe' && v.frequence === 'moisChoisis' && v.mois.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['mois'], message: 'Choisis au moins un mois.' })
    }
    if (v.fin && v.fin < v.debut) ctx.addIssue({ code: 'custom', path: ['fin'], message: 'La fin doit suivre le début.' })
    // Par jour : un montant par jour, au plus le budget. Par semaine : chaque semaine a son propre montant (aucun imposé).
    if (v.nature === 'enveloppe' && v.unite === 'jour') {
      if (v.rythme === null) ctx.addIssue({ code: 'custom', path: ['rythme'], message: 'Indique le montant par jour.' })
      else if (v.rythme > v.montant) ctx.addIssue({ code: 'custom', path: ['rythme'], message: 'Le montant par jour ne peut pas dépasser le budget du mois.' })
    }
  })
  .transform((v) =>
    v.nature === 'enveloppe'
      ? {
          ...v,
          frequence: 'mensuelle' as const,
          mois: [],
          jour: null,
          rythme: v.unite === 'jour' ? v.rythme : null,
          semaines: v.unite === 'semaine' ? [...new Map(v.semaines.map((a) => [a.debut, a])).values()].sort((a, b) => a.debut.localeCompare(b.debut)) : [],
        }
      : { ...v, mois: v.frequence === 'moisChoisis' ? [...new Set(v.mois)].sort((a, b) => a - b) : [], unite: 'mois' as const, rythme: null, semaines: [] },
  )
export type SaisieCharge = z.input<typeof schemaCharge>

export interface ChargeDto extends Omit<Charge, 'montant'> {
  montant: number
  creeLe: string
  equivalentMensuel: number
  /** Prochain paiement d'une charge fixe, aujourd'hui ou plus tard. */
  prochaineDate: DateCivile | null
  active: boolean
}

// --- Ponctuels ---

export const schemaPonctuel = z.strictObject({
  libelle: texte('Le libellé'),
  categorieId: z.string({ error: 'Choisis une catégorie.' }).min(1, 'Choisis une catégorie.'),
  montant,
  date: schemaDateCivile,
  certitude: z.enum(CERTITUDES, { error: 'Certitude inconnue.' }).default('garanti'),
})
export type SaisiePonctuel = z.input<typeof schemaPonctuel>

export interface PonctuelDto extends Omit<Ponctuel, 'montant'> {
  montant: number
  creeLe: string
  /** Mois budgétaire qui contient la date. */
  moisBudget: CleMois
  passe: boolean
}

// --- Dettes ---

export const schemaDette = z
  .strictObject({
    libelle: texte('Le libellé'),
    creancier: z.string().trim().max(60, 'Nom trop long (60 caractères au plus).').default(''),
    montantTotal: montant,
    mensualite: montant,
    premiereEcheance: schemaDateCivile,
    note,
  })
  .refine((v) => v.mensualite <= v.montantTotal, { path: ['mensualite'], message: 'La mensualité ne peut pas dépasser le total.' })
  .refine((v) => v.montantTotal / v.mensualite <= 600, { path: ['mensualite'], message: 'Mensualité trop petite : plus de 50 ans de remboursement.' })
export type SaisieDette = z.input<typeof schemaDette>

export const schemaPaiementDette = z.strictObject({ date: schemaDateCivile, montant, note })
export type SaisiePaiementDette = z.input<typeof schemaPaiementDette>

export interface PaiementDetteDto extends Omit<PaiementDette, 'montant'> {
  montant: number
  note: string | null
}

export interface DetteDto extends Omit<Dette, 'montantTotal' | 'mensualite'> {
  montantTotal: number
  mensualite: number
  note: string | null
  creeLe: string
  etat: EtatDette
  paiements: PaiementDetteDto[]
}

// --- Résumé ---

export interface MoisAvecSemaines {
  cle: CleMois
  debut: DateCivile
  fin: DateCivile
  nbJours: number
  semaines: Semaine[]
}

export interface ResumeChargesDto {
  aujourdhui: DateCivile
  /** Mois en cours ; ses semaines servent à mettre le montant de chaque semaine d'une enveloppe. */
  mois: MoisAvecSemaines
  /** Mois suivant : ses montants de semaine se préparent à la fin du mois en cours. */
  moisSuivant: MoisAvecSemaines
  duMois: ChargesDuMois
  /** Mois en cours par groupe de catégorie ; les dettes comptent en « engagement ». */
  parGroupe: Record<GroupeCategorie, Centimes>
  equivalentMensuel: { fixe: Centimes; enveloppe: Centimes; essentiel: Centimes }
  /** Somme des ponctuels encore à venir, tous mois confondus (total de la section Ponctuels). */
  ponctuelsAVenir: Centimes
  /** Prochaines sorties datées (aujourd'hui compris), six au plus. */
  prochaines: ChargePrevue[]
  /** Reste dû sur toutes les dettes. */
  detteRestante: Centimes
}
