import type { Devise } from './utilisateurs'

const SYMBOLES: Record<Devise, string> = { MAD: 'DH', EUR: '€', USD: '$' }

/**
 * Séparateur de milliers : espace insécable. L'espace fine (U+202F) est trop étroite
 * dans la police du template et rend « 10000 » illisible.
 */
const ESPACE_MILLIERS = '\u00A0'
const ESPACE_INSECABLE = '\u00A0'
const MOINS = '−'

/**
 * Formate un montant en centimes : 1000000 → « 10 000 DH ».
 * Les centimes ne sont affichés que s'ils existent.
 */
export function formaterMontant(centimes: number, devise: Devise = 'MAD'): string {
  if (!Number.isSafeInteger(centimes)) throw new RangeError(`Montant invalide : ${centimes}`)
  const negatif = centimes < 0
  const absolu = Math.abs(centimes)
  const entier = Math.floor(absolu / 100)
  const reste = absolu % 100
  const milliers = String(entier).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_MILLIERS)
  const decimales = reste === 0 ? '' : `,${String(reste).padStart(2, '0')}`
  return `${negatif ? MOINS : ''}${milliers}${decimales}${ESPACE_INSECABLE}${SYMBOLES[devise]}`
}

// --- Dates civiles (« 2027-01-27 ») et mois (« 2027-02 ») ---

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function parties(texte: string): number[] {
  return texte.split('-').map(Number)
}

/** « 2027-02 » → « février 2027 » ; `annee: false` → « février ». */
export function formaterMois(cle: string, { annee = true, majuscule = false } = {}): string {
  const [a, m] = parties(cle) as [number, number]
  const nom = MOIS[m - 1] ?? '?'
  const texte = annee ? `${nom} ${a}` : nom
  return majuscule ? texte.charAt(0).toUpperCase() + texte.slice(1) : texte
}

/**
 * « 2027-01-27 » → « 27 janv. » (`court`), « 27 janv. 2027 » (`moyen`)
 * ou « mercredi 27 janvier 2027 » (`long`). Sans fuseau : la date reste celle saisie.
 */
export function formaterDate(date: string, style: 'court' | 'moyen' | 'long' = 'moyen'): string {
  const [a, m, j] = parties(date) as [number, number, number]
  if (style === 'court') return `${j} ${MOIS_COURTS[m - 1]}`
  if (style === 'moyen') return `${j} ${MOIS_COURTS[m - 1]} ${a}`
  const jour = (new Date(Date.UTC(a, m - 1, j)).getUTCDay() + 6) % 7
  return `${JOURS[jour]} ${j} ${MOIS[m - 1]} ${a}`
}

/** « de février 2027 », « d’avril 2027 », « d’octobre » : élision devant une voyelle. */
export function deMois(cle: string, options: { annee?: boolean; majuscule?: boolean } = {}): string {
  const nom = formaterMois(cle, options)
  return /^[aeiouéâAEIOUÉ]/.test(nom) ? `d’${nom}` : `de ${nom}`
}
