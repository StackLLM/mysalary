import type { CategorieDto, DonneesLigneImport, LigneImport, StatutImport, ThemeImport } from '@mysalary/partage'
import { formaterMois, formaterMontant } from '@mysalary/partage'

/** Libellés et règles d'affichage de l'onboarding (lot 19, UX.md § 4.1). Aucun calcul : le moteur propose, l'utilisateur décide. */

export const ETAPES = [
  { n: 1, nom: 'Bienvenue' },
  { n: 2, nom: 'Import' },
  { n: 3, nom: 'Salaire' },
  { n: 4, nom: 'Primes' },
  { n: 5, nom: 'Charges fixes' },
  { n: 6, nom: 'Enveloppes' },
  { n: 7, nom: 'Dettes et ponctuels' },
  { n: 8, nom: 'Épargne' },
  { n: 9, nom: 'Premier objectif' },
  { n: 10, nom: 'Résumé' },
] as const

export const ETAPE_FINALE = ETAPES.length

/** Étape où l'on reprend : la dernière atteinte, au moins la première. */
export const etapeDeReprise = (etape: number) => Math.min(ETAPE_FINALE, Math.max(1, etape))

/** Part de la barre de progression : étape 3 sur 10 = 30 %. */
export const progression = (etape: number) => etape / ETAPE_FINALE

/** Suggestions cochables : le libellé proposé et la catégorie par défaut où le ranger. Jamais de montant. */
export const SUGGESTIONS_CHARGES = [
  { libelle: 'Téléphone', categorie: 'Télécom & internet' },
  { libelle: 'Internet', categorie: 'Télécom & internet' },
  { libelle: 'Abonnements', categorie: 'Abonnements' },
  { libelle: 'Assurance', categorie: 'Assurances' },
  { libelle: 'Aide familiale', categorie: 'Famille' },
  { libelle: 'Sport', categorie: 'Sport' },
] as const

export const SUGGESTIONS_ENVELOPPES = [
  { libelle: 'Nourriture', categorie: 'Alimentation' },
  { libelle: 'Transport', categorie: 'Transport' },
  { libelle: 'Loisirs', categorie: 'Loisirs' },
] as const

/** Identifiant de la catégorie qui porte ce nom (sans tenir compte de la casse), s'il existe. */
export const categorieParNom = (categories: Pick<CategorieDto, 'id' | 'libelle'>[] | undefined, nom: string) =>
  categories?.find((c) => c.libelle.toLowerCase() === nom.toLowerCase())?.id

/** Lignes d'un thème dans un état donné, dans l'ordre du fichier. */
export const lignesDe = (lignes: LigneImport[] | undefined, themes: ThemeImport[], statut?: StatutImport) =>
  (lignes ?? []).filter((l) => themes.includes(l.theme) && (statut === undefined || l.statut === statut))

/** Lignes acceptées à l'import et pas encore confirmées à leur étape : « importé · à confirmer ». */
export const aConfirmer = (lignes: LigneImport[] | undefined, etape: number) => (lignes ?? []).filter((l) => l.etape === etape && l.statut === 'importe')

export const STATUTS: Record<StatutImport, { texte: string; ton: 'neutre' | 'info' | 'positif' | 'alerte' }> = {
  propose: { texte: 'À décider', ton: 'neutre' },
  importe: { texte: 'Importé · à confirmer', ton: 'info' },
  ignore: { texte: 'Ignoré', ton: 'neutre' },
  confirme: { texte: 'Confirmé', ton: 'positif' },
}

/** Montant principal d'une ligne, en centimes ; `null` pour un salaire à choisir ou une information. */
export function montantLigne(d: DonneesLigneImport): number | null {
  switch (d.type) {
    case 'salaire':
      return d.choix
    case 'objectif':
      return d.montantCible
    case 'aClasser':
      return d.mois.at(-1)?.montant ?? null
    case 'info':
      return null
    default:
      return d.montant
  }
}

/** La ligne en une phrase : « 120 DH par mois », « 5 000 DH en septembre 2026 », « 50 000 DH avant septembre 2027 ». */
export function phraseLigne(l: LigneImport): string {
  const d = l.donnees
  const dh = (c: number) => formaterMontant(c)
  switch (d.type) {
    case 'salaire':
      return d.choix !== null ? `${dh(d.choix)} par mois${d.jour ? `, versé le ${d.jour}` : ''}` : `${d.options.length} montants dans le fichier${d.jour ? `, versé le ${d.jour}` : ''}`
    case 'prime':
      return `${dh(d.montant)} en ${formaterMois(d.mois)}`
    case 'charge':
    case 'enveloppe':
      return `${dh(d.montant)} par mois`
    case 'epargne':
      return `${dh(d.montant)} par mois`
    case 'ponctuel':
      return `${dh(d.montant)} prévus en ${formaterMois(d.mois)}`
    case 'aClasser':
      return d.mois.length > 0 ? d.mois.map((m) => `${dh(m.montant)} en ${formaterMois(m.mois)}`).join(', ') : 'Aucun montant daté'
    case 'objectif':
      return `${dh(d.montantCible)}${d.dateCible ? ` avant ${formaterMois(d.dateCible)}` : ''}${d.montantInitial > 0 ? `, ${dh(d.montantInitial)} déjà de côté` : ''}`
    case 'info':
      return ''
  }
}

/** Titres des groupes de l'aperçu d'import, dans l'ordre de lecture. */
export const GROUPES_IMPORT: { theme: ThemeImport; titre: string }[] = [
  { theme: 'salaire', titre: 'Salaire' },
  { theme: 'primes', titre: 'Primes' },
  { theme: 'charges', titre: 'Charges fixes' },
  { theme: 'enveloppes', titre: 'Enveloppes' },
  { theme: 'epargne', titre: 'Épargne' },
  { theme: 'dettes', titre: 'À classer : dette ou aide' },
  { theme: 'ponctuels', titre: 'Ponctuels prévus' },
  { theme: 'objectifs', titre: 'Objectifs' },
  { theme: 'info', titre: 'Pour information, non importé' },
]

export const NOMS_NON_IMPORTES: Record<string, string> = {
  allocation: 'La répartition en pourcentages',
  patrimoine: 'Le patrimoine',
  tauxRendementAnnuel: 'Le taux de rendement',
  soldeFondsUrgence: 'Le fonds d’urgence',
  redirectionApresUrgence: 'La redirection après le fonds d’urgence',
  methode: 'La méthode de budget',
}
