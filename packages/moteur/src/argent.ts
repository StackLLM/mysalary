/**
 * Règle absolue (Plan.md § 7.6) : l'argent est manipulé en centimes entiers.
 * Les arrondis ne se font qu'à l'affichage.
 */
export type Centimes = number & { readonly __centimes: unique symbol }

export function estCentimes(valeur: unknown): valeur is Centimes {
  return typeof valeur === 'number' && Number.isSafeInteger(valeur)
}

export function centimes(valeur: number): Centimes {
  if (!estCentimes(valeur)) throw new RangeError(`Montant en centimes invalide : ${valeur}`)
  return valeur
}

/**
 * Convertit une saisie en dirhams (« 10 000,50 », « 10000.5 », 10000.5) en centimes.
 * Travaille sur le texte pour éviter les erreurs de virgule flottante.
 */
export function depuisSaisie(saisie: string | number): Centimes {
  const texte = String(saisie).trim().replace(/[\s  ]/g, '').replace(',', '.')
  const correspondance = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(texte)
  if (!correspondance) throw new RangeError(`Montant illisible : « ${saisie} »`)
  const [, signe, entier = '0', decimales = ''] = correspondance
  const valeur = Number(entier) * 100 + Number(decimales.padEnd(2, '0'))
  return centimes(signe ? -valeur : valeur)
}

export function additionner(...montants: Centimes[]): Centimes {
  return centimes(montants.reduce((total, m) => total + m, 0))
}

export function soustraire(a: Centimes, b: Centimes): Centimes {
  return centimes(a - b)
}

/**
 * Répartit un total en parts proportionnelles aux poids, sans perdre un centime.
 * Méthode du plus fort reste : la somme des parts vaut toujours exactement le total.
 * Sert au prorata (semaines partielles, budget par jour).
 */
export function repartir(total: Centimes, poids: number[]): Centimes[] {
  if (poids.length === 0) throw new RangeError('Aucune part à répartir.')
  if (poids.some((p) => !Number.isFinite(p) || p < 0)) throw new RangeError('Poids invalide.')
  const somme = poids.reduce((s, p) => s + p, 0)
  if (somme === 0) throw new RangeError('La somme des poids est nulle.')

  const signe = total < 0 ? -1 : 1
  const absolu = Math.abs(total)
  const exactes = poids.map((p) => (absolu * p) / somme)
  const parts = exactes.map(Math.floor)
  let reste = absolu - parts.reduce((s, p) => s + p, 0)

  const ordre = exactes
    .map((e, i) => ({ i, fraction: e - Math.floor(e) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i)
  for (const { i } of ordre) {
    if (reste === 0) break
    parts[i]! += 1
    reste -= 1
  }
  return parts.map((p) => centimes(p * signe || 0))
}
