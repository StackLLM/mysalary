import type { ChargeDto, ChargePrevue, Echeance, GroupeCategorie, UniteEnveloppe } from '@mysalary/partage'
import { centimes, echeancier, estDateCivile, type PlanEnveloppe } from '@mysalary/moteur'
import { formaterDate, formaterMois, formaterMontant } from '@mysalary/partage'
import type { Ton } from '../salaire/saisie'

/** Libellés et règles d'affichage des charges et des dettes. */

export const GROUPES: Record<GroupeCategorie, { libelle: string; aide: string }> = {
  essentiel: { libelle: 'Essentiel', aide: 'Ce qu’on ne peut pas couper : logement, nourriture, santé.' },
  flexible: { libelle: 'Flexible', aide: 'Ce qu’on peut réduire : loisirs, shopping.' },
  engagement: { libelle: 'Engagement', aide: 'Ce qu’on a promis : famille, dettes.' },
}

/** « Le 5, chaque mois », « Le 15, en juin et décembre », « Le 1er, chaque année en mars ». */
export function libelleQuandCharge(c: Pick<ChargeDto, 'nature' | 'frequence' | 'mois' | 'jour' | 'debut'>): string {
  if (c.nature === 'enveloppe') return 'Chaque mois budgétaire'
  const jour = c.jour === 1 ? '1er' : String(c.jour)
  const nomsMois = c.mois.map((m) => formaterMois(`2000-${String(m).padStart(2, '0')}`, { annee: false }))
  switch (c.frequence) {
    case 'mensuelle':
      return `Le ${jour}, chaque mois`
    case 'trimestrielle':
      return `Le ${jour}, tous les 3 mois dès ${formaterMois(c.debut, { annee: false })}`
    case 'annuelle':
      return `Le ${jour}, chaque année en ${formaterMois(c.debut, { annee: false })}`
    case 'moisChoisis':
      return `Le ${jour}, en ${nomsMois.length > 1 ? `${nomsMois.slice(0, -1).join(', ')} et ${nomsMois.at(-1)}` : nomsMois[0]}`
  }
}

export const ORIGINES: Record<ChargePrevue['origine'], string> = {
  fixe: 'Charge fixe',
  enveloppe: 'Enveloppe',
  ponctuel: 'Ponctuel',
  dette: 'Échéance',
}

export const STATUTS_ECHEANCE: Record<Echeance['statut'], { texte: string; ton: Ton }> = {
  payee: { texte: 'Payée', ton: 'positif' },
  partielle: { texte: 'En partie payée', ton: 'info' },
  enRetard: { texte: 'En retard', ton: 'alerte' },
  prevue: { texte: 'Prévue', ton: 'neutre' },
}

/** « Fin prévue en mai 2027 » ou « Soldée ». */
export function libelleFinDette(etat: { soldee: boolean; finPrevue: string | null }): string {
  if (etat.soldee) return 'Soldée'
  return etat.finPrevue ? `Fin prévue en ${formaterMois(etat.finPrevue.slice(0, 7))}` : '—'
}

/** Part d'un total, entre 0 et 1 (barres de progression et de répartition). */
export const part = (valeur: number, total: number) => (total > 0 ? Math.min(1, Math.max(0, valeur / total)) : 0)

/**
 * Rythme de consommation d'une enveloppe (Mon plan › Charges). Le budget est celui du mois ;
 * par semaine ou par jour, l'utilisateur choisit combien ouvrir, jusqu'à atteindre le budget. MySalary ne divise rien.
 */
export const RYTHMES: Record<UniteEnveloppe, { libelle: string; champ: string | null; court: string; explication: string }> = {
  mois: { libelle: 'Librement sur le mois', champ: null, court: 'Libre', explication: 'Tout le budget est disponible sur le mois ; le suivi de la semaine le voit arriver au fil des jours.' },
  semaine: { libelle: 'Par semaine', champ: 'Montant par semaine', court: 'sem.', explication: 'Chaque semaine ouvre ce montant dès son premier jour, jusqu’à atteindre le budget du mois. Tu peux choisir un autre montant pour une semaine précise.' },
  jour: { libelle: 'Par jour', champ: 'Montant par jour', court: 'jour', explication: 'Chaque jour ouvre ce montant, jusqu’à atteindre le budget du mois.' },
}

/** Fin de la consommation d'une enveloppe : « Budget atteint le 4 janv. » ou « 180 DH restent à répartir ». */
export function phrasePlanEnveloppe(plan: Pick<PlanEnveloppe, 'aRepartir' | 'atteintLe'>, unite: UniteEnveloppe): { texte: string; ton: Ton } {
  if (plan.atteintLe) {
    // « 4 janv. » finit déjà par un point.
    const date = formaterDate(plan.atteintLe, 'court')
    return { texte: `Budget du mois atteint le ${date}${date.endsWith('.') ? '' : '.'}`, ton: 'positif' }
  }
  const quoi = unite === 'jour' ? 'augmente le montant par jour' : 'augmente le montant d’une semaine'
  return { texte: `${formaterMontant(plan.aRepartir)} restent à répartir sur ce mois : ${quoi}.`, ton: 'alerte' }
}

export const dateOuMois = (l: ChargePrevue) => (l.date ? formaterDate(l.date, 'court') : 'Tout le mois')

/** Aperçu de l'échéancier avant enregistrement : « 5 échéances : 4 × 2 000 DH puis 500 DH. Dernière le 31 mai 2027. » */
export function apercuDette(total: number | null, mensualite: number | null, premiere: string): string | null {
  if (!total || !mensualite || mensualite > total || total / mensualite > 600 || !estDateCivile(premiere)) return null
  const liste = echeancier({ montantTotal: centimes(total), mensualite: centimes(mensualite), premiereEcheance: premiere })
  const derniere = liste.at(-1)!
  const pleines = liste.filter((e) => e.montant === mensualite).length
  const repartition =
    pleines === liste.length
      ? `${liste.length} × ${formaterMontant(mensualite)}`
      : `${pleines} × ${formaterMontant(mensualite)} puis ${formaterMontant(derniere.montant)}`
  return `${liste.length} échéance${liste.length > 1 ? 's' : ''} : ${repartition}. Dernière le ${formaterDate(derniere.date)}.`
}
