import { additionner, centimes, decalerMois, ecartJours, lireCleMois, lireDate } from '@mysalary/moteur'
import {
  formaterDate,
  formaterMontant,
  type CategorieDto,
  type DepenseDto,
  type Imputation,
  type LigneAPayer,
  type PaiementDuMoisDto,
  type RattachementsDto,
  type SaisieDepense,
} from '@mysalary/partage'

/** Libellés et règles d'affichage des dépenses réelles. */

export const IMPUTATIONS: Record<Imputation, string> = {
  fixe: 'Charge fixe',
  enveloppe: 'Enveloppe',
  ponctuel: 'Ponctuel',
  horsPlan: 'Hors plan',
}

/** Les catégories les plus utilisées en premier (puces de la saisie rapide), puis l'ordre du plan. */
export function categoriesFrequentes(categories: CategorieDto[], nombre = 6): CategorieDto[] {
  return [...categories].sort((a, b) => b.depenses - a.depenses || a.ordre - b.ordre).slice(0, nombre)
}

// --- Rattachement ---

/** Clé d'un choix de rattachement : « fixe:id:date », « ponctuel:id », « enveloppe:id » ou « aucun ». */
export type CleLien = string
export const HORS_PLAN: CleLien = 'aucun'

export interface OptionLien {
  cle: CleLien
  libelle: string
  detail: string
  categorieId: string
  /** Montant proposé quand on choisit cette ligne : ce qui reste à payer. */
  reste: number | null
}

const cleLigne = (l: Pick<LigneAPayer, 'origine' | 'id' | 'date'>) => (l.origine === 'fixe' ? `fixe:${l.id}:${l.date}` : `ponctuel:${l.id}`)

export function optionsLien(r: RattachementsDto): OptionLien[] {
  return [
    ...r.lignes.map((l) => ({
      cle: cleLigne(l),
      libelle: l.libelle,
      detail: `${l.origine === 'fixe' ? 'Échéance' : 'Ponctuel'} du ${formaterDate(l.date, 'court')} · reste ${formaterMontant(l.reste)}`,
      categorieId: l.categorieId,
      reste: l.reste,
    })),
    ...r.enveloppes.map((e) => ({
      cle: `enveloppe:${e.id}`,
      libelle: e.libelle,
      detail: e.reste > 0 ? `Enveloppe · reste ${formaterMontant(e.reste)}` : `Enveloppe · dépassée de ${formaterMontant(-e.reste)}`,
      categorieId: e.categorieId,
      reste: null,
    })),
  ]
}

/** Proposition automatique (ux-ui.md (UX) § 4.3) : une ligne à payer de même catégorie, sinon son enveloppe, sinon hors plan. */
export function lienPropose(options: OptionLien[], categorieId: string): CleLien {
  const memes = options.filter((o) => o.categorieId === categorieId)
  return (memes.find((o) => !o.cle.startsWith('enveloppe:')) ?? memes[0])?.cle ?? HORS_PLAN
}

export function versLien(cle: CleLien): Pick<SaisieDepense, 'chargeId' | 'echeance' | 'ponctuelId'> {
  const [type, id, date] = cle.split(':')
  if (type === 'fixe') return { chargeId: id!, echeance: date!, ponctuelId: null }
  if (type === 'enveloppe') return { chargeId: id!, echeance: null, ponctuelId: null }
  if (type === 'ponctuel') return { chargeId: null, echeance: null, ponctuelId: id! }
  return { chargeId: null, echeance: null, ponctuelId: null }
}

/** Clé du lien actuel d'une dépense (modification). */
export function cleDe(d: Pick<DepenseDto, 'imputation' | 'chargeId' | 'echeance' | 'ponctuelId'>): CleLien {
  if (d.imputation === 'fixe') return `fixe:${d.chargeId}:${d.echeance}`
  if (d.imputation === 'enveloppe') return `enveloppe:${d.chargeId}`
  if (d.imputation === 'ponctuel') return `ponctuel:${d.ponctuelId}`
  return HORS_PLAN
}

// --- Liste du mois ---

export type LigneJournal = { type: 'depense'; depense: DepenseDto } | { type: 'dette'; paiement: PaiementDuMoisDto }

/** Dépenses et paiements de dettes groupés par jour, du plus récent au plus ancien, avec le total de chaque jour. */
export function journal(depenses: DepenseDto[], paiements: PaiementDuMoisDto[], categorieId: string | null) {
  const lignes: LigneJournal[] = [
    ...depenses.filter((d) => !categorieId || d.categorieId === categorieId).map((depense) => ({ type: 'depense' as const, depense })),
    ...(categorieId ? [] : paiements.map((paiement) => ({ type: 'dette' as const, paiement }))),
  ]
  const date = (l: LigneJournal) => (l.type === 'depense' ? l.depense.date : l.paiement.date)
  const montant = (l: LigneJournal) => centimes(l.type === 'depense' ? l.depense.montant : l.paiement.montant)
  const jours = new Map<string, LigneJournal[]>()
  for (const l of lignes.sort((a, b) => date(b).localeCompare(date(a)))) jours.set(date(l), [...(jours.get(date(l)) ?? []), l])
  const groupes = [...jours].map(([jour, liste]) => ({ jour, lignes: liste, total: additionner(...liste.map(montant)) }))
  return { groupes, total: additionner(...lignes.map(montant)), nombre: lignes.length }
}

/** Nom affiché : le libellé saisi, sinon la ligne du plan payée, sinon la catégorie. */
export function libelleDepense(d: Pick<DepenseDto, 'libelle' | 'ligne' | 'categorieId'>, categories: Map<string, CategorieDto>): string {
  return d.libelle || d.ligne || categories.get(d.categorieId)?.libelle || 'Dépense'
}

/** « Alimentation · Courses · enveloppe », « Logement · charge fixe », « Loisirs · hors plan ». */
export function detailDepense(d: Pick<DepenseDto, 'libelle' | 'ligne' | 'categorieId' | 'imputation'>, categories: Map<string, CategorieDto>): string {
  const nom = libelleDepense(d, categories)
  const categorie = categories.get(d.categorieId)?.libelle
  // La ligne du plan n'est répétée que si elle apporte quelque chose (« Transport · Transport » non).
  return [categorie, d.ligne && d.ligne !== nom && d.ligne !== categorie ? d.ligne : null, IMPUTATIONS[d.imputation].toLowerCase()].filter(Boolean).join(' · ')
}

/** « Aujourd'hui », « Hier » ou « Lundi 5 octobre » (année seulement si ce n'est pas l'année en cours). */
export function libelleJour(jour: string, aujourdhui: string): string {
  if (jour === aujourdhui) return 'Aujourd’hui'
  const veille = new Date(`${aujourdhui}T12:00:00Z`)
  veille.setUTCDate(veille.getUTCDate() - 1)
  if (jour === veille.toISOString().slice(0, 10)) return 'Hier'
  const texte = formaterDate(jour, 'long')
  const sansAnnee = jour.slice(0, 4) === aujourdhui.slice(0, 4) ? texte.replace(/ \d{4}$/, '') : texte
  return sansAnnee.charAt(0).toUpperCase() + sansAnnee.slice(1)
}

/** Date d'une dépense créée par « Payé » : la date prévue si elle est passée, sinon aujourd'hui (jamais dans le futur). */
export const dateDePaiement = (ligne: Pick<LigneAPayer, 'date'>, aujourdhui: string) => (ligne.date <= aujourdhui ? ligne.date : aujourdhui)

/** Saisie d'une dépense qui paie le reste d'une ligne du plan. */
export function saisiePaiement(ligne: LigneAPayer, aujourdhui: string): SaisieDepense {
  return {
    date: dateDePaiement(ligne, aujourdhui),
    montant: ligne.reste,
    categorieId: ligne.categorieId,
    libelle: ligne.libelle,
    ...versLien(cleLigne(ligne)),
  }
}

/** Jours restants d'un mois en cours, aujourd'hui compris ; `null` pour un mois passé ou à venir. */
export function joursRestants(mois: { fin: string; statut: string }, aujourdhui: string): number | null {
  return mois.statut === 'enCours' ? ecartJours(lireDate(aujourdhui), lireDate(mois.fin)) + 1 : null
}

/** Mois budgétaire voisin (navigation précédent / suivant). */
export const moisVoisin = (cle: string, decalage: number) => decalerMois(lireCleMois(cle), decalage)
