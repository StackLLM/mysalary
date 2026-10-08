/**
 * Dates civiles (« 2027-01-27 ») et clés de mois (« 2027-01 »), sans fuseau horaire.
 * Le calcul passe par l'UTC pour ne jamais dépendre de l'heure d'été ni du fuseau local.
 */
export type DateCivile = string & { readonly __dateCivile: unique symbol }
export type CleMois = string & { readonly __cleMois: unique symbol }

const JOUR_MS = 86_400_000
const FORMAT_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const FORMAT_MOIS = /^(\d{4})-(\d{2})$/

const deux = (n: number) => String(n).padStart(2, '0')

export function estDateCivile(texte: unknown): texte is DateCivile {
  if (typeof texte !== 'string') return false
  const m = FORMAT_DATE.exec(texte)
  if (!m) return false
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return mois >= 1 && mois <= 12 && jour >= 1 && jour <= joursDansMois(annee, mois)
}

export function estCleMois(texte: unknown): texte is CleMois {
  if (typeof texte !== 'string') return false
  const m = FORMAT_MOIS.exec(texte)
  return Boolean(m) && Number(m![2]) >= 1 && Number(m![2]) <= 12
}

export function lireDate(texte: string): DateCivile {
  if (!estDateCivile(texte)) throw new RangeError(`Date invalide : « ${texte} »`)
  return texte
}

export function lireCleMois(texte: string): CleMois {
  if (!estCleMois(texte)) throw new RangeError(`Mois invalide : « ${texte} »`)
  return texte
}

export function dateCivile(annee: number, mois: number, jour: number): DateCivile {
  return lireDate(`${String(annee).padStart(4, '0')}-${deux(mois)}-${deux(jour)}`)
}

export function cleMois(annee: number, mois: number): CleMois {
  return lireCleMois(`${String(annee).padStart(4, '0')}-${deux(mois)}`)
}

/** Nombre de jours d'un mois civil (mois de 1 à 12). */
export function joursDansMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate()
}

function versMs(date: DateCivile): number {
  const [a, m, j] = date.split('-').map(Number) as [number, number, number]
  return Date.UTC(a, m - 1, j)
}

function depuisMs(ms: number): DateCivile {
  const d = new Date(ms)
  return dateCivile(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function ajouterJours(date: DateCivile, jours: number): DateCivile {
  return depuisMs(versMs(date) + jours * JOUR_MS)
}

/** Nombre de jours de `a` à `b` (positif si `b` est après `a`). */
export function ecartJours(a: DateCivile, b: DateCivile): number {
  return Math.round((versMs(b) - versMs(a)) / JOUR_MS)
}

/** 1 = lundi … 7 = dimanche. */
export function jourSemaine(date: DateCivile): number {
  return ((new Date(versMs(date)).getUTCDay() + 6) % 7) + 1
}

export function estWeekEnd(date: DateCivile): boolean {
  return jourSemaine(date) >= 6
}

/** Les dates `AAAA-MM-JJ` se comparent dans l'ordre alphabétique. */
export function comparer(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function plusTard<T extends string>(a: T, b: T): T {
  return a >= b ? a : b
}

export function plusTot<T extends string>(a: T, b: T): T {
  return a <= b ? a : b
}

export function moisDe(date: DateCivile): CleMois {
  return date.slice(0, 7) as CleMois
}

export function partiesMois(cle: CleMois): { annee: number; mois: number } {
  const [annee, mois] = cle.split('-').map(Number) as [number, number]
  return { annee, mois }
}

export function decalerMois(cle: CleMois, decalage: number): CleMois {
  const { annee, mois } = partiesMois(cle)
  const index = annee * 12 + (mois - 1) + decalage
  return cleMois(Math.floor(index / 12), (index % 12) + 1)
}

/** Nombre de mois de `a` à `b` (positif si `b` est après `a`). */
export function ecartMois(a: CleMois, b: CleMois): number {
  const pa = partiesMois(a)
  const pb = partiesMois(b)
  return (pb.annee - pa.annee) * 12 + (pb.mois - pa.mois)
}

export function premierJour(cle: CleMois): DateCivile {
  const { annee, mois } = partiesMois(cle)
  return dateCivile(annee, mois, 1)
}

export function dernierJour(cle: CleMois): DateCivile {
  const { annee, mois } = partiesMois(cle)
  return dateCivile(annee, mois, joursDansMois(annee, mois))
}

/** Liste des mois de `du` à `au`, inclus. */
export function moisEntre(du: CleMois, au: CleMois): CleMois[] {
  const liste: CleMois[] = []
  for (let i = 0; i <= ecartMois(du, au); i++) liste.push(decalerMois(du, i))
  return liste
}
