import {
  additionner,
  centimes,
  creerCalendrier,
  decalerMois,
  depuisSaisie,
  lireCleMois,
  lireDate,
  plusTot,
  type Centimes,
  type RegleJourNonOuvre,
} from '@mysalary/moteur'
import { formaterDate, formaterMois, formaterMontant, type MoisCumul, type PaieDto } from '@mysalary/partage'

/**
 * Règles de saisie et d'affichage du salaire. Aucun calcul dans les composants :
 * tout passe par ces fonctions, qui délèguent au moteur.
 */

/** Lit une saisie en dirhams ; `minimum` = 1 pour un salaire, 0 pour un montant reçu. */
export function lireMontant(texte: string, minimum = 1): { valeur: number } | { erreur: string } {
  if (texte.trim() === '') return { erreur: 'Montant obligatoire.' }
  try {
    const valeur = depuisSaisie(texte)
    if (valeur < minimum) return { erreur: minimum > 0 ? 'Entre un montant supérieur à 0.' : 'Le montant ne peut pas être négatif.' }
    return { valeur }
  } catch {
    return { erreur: 'Montant illisible. Exemple : 10 000 ou 10 000,50.' }
  }
}

/** Centimes → texte de saisie : 1000050 → « 10000,50 ». */
export function versSaisie(montant: number): string {
  const entier = Math.trunc(montant / 100)
  const reste = Math.abs(montant % 100)
  return reste === 0 ? String(entier) : `${entier},${String(reste).padStart(2, '0')}`
}

export const REGLES: { valeur: RegleJourNonOuvre; libelle: string }[] = [
  { valeur: 'apres', libelle: 'Repoussée au lundi (virement bancaire)' },
  { valeur: 'avant', libelle: 'Avancée au vendredi' },
  { valeur: 'aucune', libelle: 'Gardée le samedi ou le dimanche' },
]

/** Phrase courte qui décrit un contrat : « Le 27 · finance le mois suivant · week-end avancé ». */
export function resumeContrat(c: { jourHabituel: number; financeMoisSuivant: boolean; regleJourNonOuvre: RegleJourNonOuvre }): string {
  const weekEnd = { avant: 'week-end : avancée', apres: 'week-end : repoussée', aucune: 'même le week-end' }[c.regleJourNonOuvre]
  return `Le ${c.jourHabituel} · ${c.financeMoisSuivant ? 'finance le mois suivant' : 'finance le mois même'} · ${weekEnd}`
}

/**
 * Aperçu d'un contrat avant enregistrement : bornes du premier mois qu'il finance.
 * Exemple : « Février 2027 irait du 27 janv. au 26 févr. ».
 */
export function apercuContrat(
  c: { moisEffet: string; jourHabituel: number; financeMoisSuivant: boolean; regleJourNonOuvre: RegleJourNonOuvre },
  aujourdhui: string,
): string | null {
  if (!/^\d{4}-\d{2}$/.test(c.moisEffet) || !(c.jourHabituel >= 1 && c.jourHabituel <= 31)) return null
  const moisEffet = lireCleMois(c.moisEffet)
  const calendrier = creerCalendrier({
    mode: 'cyclePaie',
    aujourdhui: lireDate(aujourdhui),
    paies: [],
    contrats: [{ id: 'apercu', moisEffet, montantNet: centimes(1), jourHabituel: c.jourHabituel, regleJourNonOuvre: c.regleJourNonOuvre, financeMoisSuivant: c.financeMoisSuivant }],
  })
  const mois = calendrier.mois(moisEffet)
  return `${formaterMois(mois.cle, { majuscule: true })} irait du ${formaterDate(mois.debut)} au ${formaterDate(mois.fin)} (${mois.nbJours} jours).`
}

export type Ton = 'positif' | 'alerte' | 'info' | 'neutre'

/** Statut d'une paie en mots, jamais par la couleur seule. */
export function statutPaie(paie: PaieDto, aujourdhui: string, { court = false } = {}): { texte: string; ton: Ton } {
  if (paie.statut === 'recue') return { texte: court ? 'Reçue' : `Reçue le ${formaterDate(paie.dateReelle!, 'court')}`, ton: 'positif' }
  if (paie.statut === 'enRetard') {
    if (court) return { texte: `En retard · ${paie.joursDeRetard} j`, ton: 'alerte' }
    return { texte: paie.joursDeRetard === 1 ? 'Attendue depuis hier' : `Attendue depuis ${paie.joursDeRetard} jours`, ton: 'alerte' }
  }
  if (paie.datePrevue === aujourdhui) return { texte: court ? 'Aujourd’hui' : 'Prévue aujourd’hui', ton: 'info' }
  return { texte: court ? 'Prévue' : `Prévue le ${formaterDate(paie.datePrevue, 'court')}`, ton: 'neutre' }
}

/** « 2026-09 » → « Sept. 2026 » : le tableau des paies a 7 colonnes (cumul, lot 13). */
export const moisAbrege = (cle: string) => {
  const court = formaterDate(`${cle}-01`, 'court').replace(/^1 /, '')
  return `${court.charAt(0).toUpperCase()}${court.slice(1)} ${cle.slice(0, 4)}`
}

/**
 * Ligne « cumul » d'une paie (lot 13) : revenus − charges − épargne du mois, ajoutés au cumul du mois précédent.
 * L'infobulle détaille le calcul ; la paie elle-même (prévue ou reçue) reste lisible dans les revenus.
 */
export function detailCumul(c: Pick<MoisCumul, 'premier' | 'report' | 'revenus' | 'charges' | 'epargne' | 'reste' | 'cumul'>, paie: Pick<PaieDto, 'totalPrevu' | 'totalRecu'>) {
  const m = formaterMontant
  const paieTexte = paie.totalRecu !== null ? `paie reçue ${m(paie.totalRecu)}` : `paie prévue ${m(paie.totalPrevu)}`
  const autres = c.revenus - (paie.totalRecu ?? paie.totalPrevu)
  return {
    revenus: `Revenus ${m(c.revenus)} : ${paieTexte}${autres !== 0 ? `, autres revenus ${m(autres)}` : ''}.`,
    cumul: `${c.premier ? 'Solde de départ' : 'Cumul du mois précédent'} ${m(c.report ?? 0)} + revenus ${m(c.revenus)} − charges ${m(c.charges)} − épargne ${m(c.epargne)} = ${m(c.cumul ?? 0)}.`,
  }
}

/** Douze mois affichés : trois avant le mois courant, huit après, décalables par six. */
export function fenetreMois(moisCourant: string, decalage: number): { du: string; au: string } {
  const du = decalerMois(lireCleMois(moisCourant), decalage - 3)
  return { du, au: decalerMois(du, 11) }
}

/** Date proposée à la confirmation : la date prévue, sauf si elle est encore à venir. */
export function dateProposee(paie: PaieDto, aujourdhui: string): string {
  return paie.dateReelle ?? plusTot(paie.datePrevue, aujourdhui)
}

/** Mois financés proposés à la confirmation (R29) : le mois de la paie et ses voisins. */
export function moisPossibles(mois: string): string[] {
  const cle = lireCleMois(mois)
  return [decalerMois(cle, -1), cle, decalerMois(cle, 1)]
}

/** Total reçu et écart pendant la saisie d'une réception (montants illisibles comptés à 0). */
export function totauxReception(totalPrevu: number, montantsRecus: string[]): { recu: Centimes; ecart: Centimes } {
  const recu = additionner(...montantsRecus.map((t) => {
    const lu = lireMontant(t, 0)
    return centimes('valeur' in lu ? lu.valeur : 0)
  }))
  return { recu, ecart: centimes(recu - totalPrevu) }
}

/** Totaux des paies affichées : prévu, reçu, et écart sur les seules paies reçues. */
export function totauxPaies(paies: PaieDto[]): { prevu: Centimes; recu: Centimes; ecart: Centimes } {
  const recues = paies.filter((p) => p.statut === 'recue')
  return {
    prevu: additionner(...paies.map((p) => centimes(p.totalPrevu))),
    recu: additionner(...recues.map((p) => centimes(p.totalRecu ?? 0))),
    ecart: additionner(...recues.map((p) => centimes(p.ecart ?? 0))),
  }
}

/** Prochaine paie à confirmer : la première non reçue après la dernière paie reçue. */
export function paieAConfirmer(paies: PaieDto[]): PaieDto | null {
  const derniere = paies.reduce((index, p, i) => (p.statut === 'recue' ? i : index), -1)
  return paies.slice(derniere + 1).find((p) => p.statut !== 'recue') ?? null
}

/** Version du contrat en vigueur pour un mois (la dernière commencée), ou la première à venir. */
export function versionPour<T extends { moisEffet: string }>(versions: T[], mois: string): T | null {
  const triees = [...versions].sort((a, b) => (a.moisEffet < b.moisEffet ? -1 : 1))
  return triees.filter((v) => v.moisEffet <= mois).at(-1) ?? triees[0] ?? null
}

/** Mois proposés dans une liste : deux ans avant et après aujourd'hui, plus la valeur actuelle. */
export function moisProposes(aujourdhui: string, actuel?: string): string[] {
  const centre = lireCleMois(aujourdhui.slice(0, 7))
  const liste: string[] = Array.from({ length: 49 }, (_, i) => decalerMois(centre, i - 24))
  if (actuel && !liste.includes(actuel)) liste.push(actuel)
  return liste.sort()
}
