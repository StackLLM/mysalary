import { dateDeVersement, decalerMois, lireCleMois, moisDeVersement, type Certitude, type Frequence, type TypeRevenu } from '@mysalary/moteur'
import { deMois, formaterDate, formaterMois, type RevenuPrevu, type SourceRevenuDto } from '@mysalary/partage'
import type { Ton } from '../salaire/saisie'

/** Libellés et règles d'affichage des autres revenus. Les calculs restent dans le moteur. */

export const TYPES: { valeur: TypeRevenu; libelle: string; aide: string }[] = [
  { valeur: 'prime', libelle: 'Prime', aide: 'Prime de fin d’année, de bilan, 13e mois…' },
  { valeur: 'variable', libelle: 'Variable', aide: 'Heures sup, commissions : le montant change.' },
  { valeur: 'autre', libelle: 'Autre', aide: 'Location, freelance, projet à venir…' },
]

export const FREQUENCES_LIBELLES: { valeur: Frequence; libelle: string }[] = [
  { valeur: 'mensuelle', libelle: 'Chaque mois' },
  { valeur: 'trimestrielle', libelle: 'Tous les 3 mois' },
  { valeur: 'annuelle', libelle: 'Chaque année' },
  { valeur: 'moisChoisis', libelle: 'Certains mois' },
  { valeur: 'unique', libelle: 'Une seule fois' },
]

export const CERTITUDES_INFO: Record<Certitude, { libelle: string; aide: string; ton: Ton }> = {
  garanti: { libelle: 'Garanti', aide: 'Écrit dans ton contrat.', ton: 'positif' },
  probable: { libelle: 'Probable', aide: 'Habituel, mais pas écrit.', ton: 'info' },
  incertain: { libelle: 'Incertain', aide: 'Peut ne pas arriver.', ton: 'alerte' },
}

/** Certitude proposée selon le type (R5 : un projet futur n'entre pas dans le réaliste par défaut). */
export const certitudeParDefaut = (type: TypeRevenu): Certitude => (type === 'prime' ? 'probable' : 'incertain')

export const NOMS_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** « Chaque année en juin », « En juin et décembre », « Une fois, en mars 2027 ». */
export function libelleFrequence(s: Pick<SourceRevenuDto, 'frequence' | 'mois' | 'debut'>): string {
  const mois = formaterMois(s.debut, { annee: false })
  switch (s.frequence) {
    case 'mensuelle':
      return 'Chaque mois'
    case 'trimestrielle':
      return `Tous les 3 mois, dès ${mois}`
    case 'annuelle':
      return `Chaque année en ${mois}`
    case 'unique':
      return `Une fois, en ${formaterMois(s.debut)}`
    case 'moisChoisis': {
      const noms = s.mois.map((m) => formaterMois(`2000-${String(m).padStart(2, '0')}`, { annee: false }))
      return noms.length === 1 ? `Chaque année en ${noms[0]}` : `En ${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`
    }
  }
}

export function libelleVersement(s: Pick<SourceRevenuDto, 'versement' | 'jour'>): string {
  return s.versement === 'avecPaie' ? 'Avec la paie' : `Le ${s.jour} du mois`
}

/** Aperçu des trois prochains versements d'une source en cours de saisie. */
export function apercuSource(
  s: { frequence: Frequence; mois: number[]; debut: string; fin: string | null; versement: 'avecPaie' | 'dateSeparee'; jour: number | null },
  aujourdhui: string,
  financeMoisSuivant: boolean | null,
): string | null {
  if (!/^\d{4}-\d{2}$/.test(s.debut)) return null
  const debut = lireCleMois(s.debut)
  const fin = s.fin && /^\d{4}-\d{2}$/.test(s.fin) ? lireCleMois(s.fin) : null
  if (fin && fin < debut) return null
  const depart = lireCleMois(aujourdhui.slice(0, 7)) > debut ? lireCleMois(aujourdhui.slice(0, 7)) : debut
  const prochains = moisDeVersement({ ...s, debut, fin }, depart, decalerMois(depart, 36)).slice(0, 3)
  if (prochains.length === 0) return 'Aucun versement à venir.'
  const morceaux = prochains.map((m) => {
    if (s.versement === 'dateSeparee') return formaterDate(dateDeVersement({ jour: s.jour }, m))
    const finance = financeMoisSuivant ? ` (finance ${formaterMois(decalerMois(m, 1), { annee: false })})` : ''
    return `${formaterMois(m)}${finance}`
  })
  return `Prochains versements : ${morceaux.join(' · ')}.`
}

/** Statut d'un versement prévu, en mots. */
export function statutRevenu(r: RevenuPrevu): { texte: string; ton: Ton } {
  if (r.statut === 'recu') return { texte: `Reçu le ${formaterDate(r.dateReelle ?? r.datePrevue, 'court')}`, ton: 'positif' }
  if (r.statut === 'enRetard') return { texte: `Attendu depuis le ${formaterDate(r.datePrevue, 'court')}`, ton: 'alerte' }
  return { texte: `Prévu le ${formaterDate(r.datePrevue, 'court')}`, ton: 'neutre' }
}

/** « Freelance · versement de janvier 2027 » pour choisir le versement auquel répond un revenu reçu. */
export const libelleVersementPrevu = (r: RevenuPrevu) => `${r.libelle} · versement ${deMois(r.moisVersement)}`
