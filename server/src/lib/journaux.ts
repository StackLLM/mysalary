/**
 * Règles des journaux (prod.md § 7.3, lot P2) : ni secret, ni lien de connexion, ni montant ou libellé financier.
 */

/** Champs effacés de toute ligne de journal Fastify. */
export const CHAMPS_MASQUES = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.motDePasse',
  '*.actuel',
  '*.nouveau',
  '*.jeton',
  '*.token',
]

/** `lea@exemple.test` → `l***@exemple.test` : assez pour suivre un envoi, pas pour lire l'adresse. */
export function masquerAdresse(adresse: string): string {
  const arobase = adresse.lastIndexOf('@')
  if (arobase < 1) return '***'
  return `${adresse[0]}***${adresse.slice(arobase)}`
}

/**
 * Erreur interne à écrire au journal. En production, le message est retiré : celui de Prisma recopie
 * les valeurs de la requête (montants, libellés). Il reste le type, le code et la pile d'appels.
 */
export function erreurPourJournal(erreur: Error, production: boolean): Record<string, unknown> {
  if (!production) return { err: erreur }
  const code = 'code' in erreur && erreur.code !== undefined ? String(erreur.code) : undefined
  const pile = (erreur.stack ?? '')
    .split('\n')
    .filter((ligne) => ligne.trimStart().startsWith('at '))
    .slice(0, 10)
    .join('\n')
  return { erreur: { type: erreur.name, ...(code ? { code } : {}), pile } }
}
