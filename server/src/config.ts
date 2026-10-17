import { z } from 'zod'

/**
 * Configuration du serveur, lue dans l'environnement et vérifiée au démarrage (prod.md § 8.1, lot P2).
 * En production, une configuration incomplète empêche le démarrage : mieux vaut pas de serveur
 * qu'un serveur qui écrit les liens de connexion dans son journal ou pose un cookie sans HTTPS.
 */
const drapeau = z.enum(['0', '1'], { error: 'Attendu : 0 ou 1.' }).optional()

const schemaEnvironnement = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test'], { error: 'Attendu : development, production ou test.' }).default('development'),
    DATABASE_URL: z.string({ error: 'Obligatoire.' }).min(1, 'Obligatoire.'),
    HOTE: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number({ error: 'Nombre attendu.' }).int().min(1).max(65535).default(3010),
    APP_URL: z.url({ error: 'Adresse web attendue (http:// ou https://).' }).default('http://127.0.0.1:6010'),
    COOKIE_SECURE: drapeau,
    TRUST_PROXY: drapeau,
    SMTP_URL: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(3).default('MySalary <no-reply@mysalary.local>'),
  })

/** Exigences de la production, vérifiées même si une autre variable est déjà fautive : tout est signalé d'un coup. */
function exigencesProduction(env: Record<string, string | undefined>): string[] {
  if (env.NODE_ENV !== 'production') return []
  const problemes: string[] = []
  if (!env.APP_URL?.startsWith('https://')) problemes.push('APP_URL : en production, l’adresse doit commencer par https://.')
  if (!env.SMTP_URL) problemes.push('SMTP_URL : obligatoire en production, sinon les liens partiraient dans le journal.')
  if (env.COOKIE_SECURE === '0') problemes.push('COOKIE_SECURE : interdit en production, le cookie de session doit rester réservé à HTTPS.')
  return problemes
}

export interface Config {
  production: boolean
  hote: string
  port: number
  urlApplication: string
  cookieSecurise: boolean
  trustProxy: boolean
  smtp: string | undefined
  expediteur: string
}

/** Configuration invalide : chaque ligne nomme la variable et le problème, jamais sa valeur (elle peut être secrète). */
export class ConfigInvalide extends Error {
  constructor(readonly problemes: string[]) {
    super(`Configuration invalide :\n${problemes.map((p) => `- ${p}`).join('\n')}`)
    this.name = 'ConfigInvalide'
  }
}

export function lireConfig(env: Record<string, string | undefined> = process.env): Config {
  // Une variable vide compte comme absente.
  const nettoye = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v.trim() !== ''))
  const lu = schemaEnvironnement.safeParse(nettoye)
  const problemes = [...(lu.success ? [] : lu.error.issues.map((i) => `${i.path.join('.') || 'environnement'} : ${i.message}`)), ...exigencesProduction(nettoye)]
  if (!lu.success || problemes.length > 0) throw new ConfigInvalide(problemes)
  const e = lu.data
  return {
    production: e.NODE_ENV === 'production',
    hote: e.HOTE,
    port: e.PORT,
    urlApplication: e.APP_URL,
    cookieSecurise: e.COOKIE_SECURE ? e.COOKIE_SECURE === '1' : e.APP_URL.startsWith('https://'),
    trustProxy: e.TRUST_PROXY === '1',
    smtp: e.SMTP_URL,
    expediteur: e.MAIL_FROM,
  }
}
