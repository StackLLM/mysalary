import { PrismaClient } from '@prisma/client'
import { construireApp } from './app'
import { ConfigInvalide, lireConfig, type Config } from './config'
import { CHAMPS_MASQUES, erreurPourJournal } from './lib/journaux'
import { creerMessagerie } from './lib/messagerie'
import { purgerExpires } from './lib/purge'

try {
  process.loadEnvFile()
} catch {
  // Pas de fichier .env : on garde les variables d'environnement existantes.
}

// Configuration vérifiée avant tout (prod.md § 8.1) : incomplète, le serveur ne démarre pas.
let config: Config
try {
  config = lireConfig()
} catch (e) {
  if (!(e instanceof ConfigInvalide)) throw e
  console.error(e.message)
  process.exit(1)
}

const prisma = new PrismaClient()

const app = await construireApp({
  prisma,
  logger: { level: 'info', redact: { paths: CHAMPS_MASQUES, censor: '[masqué]' } },
  production: config.production,
  // Derrière un proxy HTTPS (Nginx, Caddy…), l'adresse du client vient de X-Forwarded-For.
  trustProxy: config.trustProxy,
  auth: {
    urlApplication: config.urlApplication,
    cookieSecurise: config.cookieSecurise,
    // Sans SMTP_URL (local uniquement), les liens de mot de passe sont écrits dans ce journal.
    messagerie: creerMessagerie({ smtp: config.smtp, expediteur: config.expediteur, journal: (t) => app.log.info(t) }),
  },
})

// Sessions, liens et limites d'essais expirés : purge au démarrage, puis toutes les heures.
const purger = () => purgerExpires(prisma, new Date()).then((n) => app.log.info(n, 'Éléments expirés supprimés'), (e) => app.log.error(erreurPourJournal(e, config.production), 'Purge impossible'))
await purger()
setInterval(purger, 60 * 60 * 1000).unref()

// Par défaut, écoute locale uniquement. Pour un accès réseau : HOTE=0.0.0.0, derrière HTTPS (voir README).
await app.listen({ host: config.hote, port: config.port })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  })
}
