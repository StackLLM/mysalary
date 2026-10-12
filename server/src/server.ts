import { PrismaClient } from '@prisma/client'
import { construireApp } from './app'
import { creerMessagerie } from './lib/messagerie'
import { purgerExpires } from './lib/purge'

try {
  process.loadEnvFile()
} catch {
  // Pas de fichier .env : on garde les variables d'environnement existantes.
}

const prisma = new PrismaClient()
const hote = process.env.HOTE ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 3010)
const urlApplication = process.env.APP_URL ?? 'http://127.0.0.1:6010'
const smtp = process.env.SMTP_URL

const app = await construireApp({
  prisma,
  logger: { level: 'info' },
  // Derrière un proxy HTTPS (Nginx, Caddy…), l'adresse du client vient de X-Forwarded-For.
  trustProxy: process.env.TRUST_PROXY === '1',
  auth: {
    urlApplication,
    // Un site en HTTPS garde le cookie de session pour HTTPS seulement.
    cookieSecurise: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === '1' : urlApplication.startsWith('https://'),
    // Sans SMTP_URL, les liens de mot de passe sont écrits dans ce journal (usage local).
    ...(smtp ? { messagerie: creerMessagerie({ smtp, expediteur: process.env.MAIL_FROM ?? 'MySalary <no-reply@mysalary.local>', journal: (t) => console.info(t) }) } : {}),
  },
})

// Sessions et liens expirés : purge au démarrage, puis toutes les heures.
const purger = () => purgerExpires(prisma, new Date()).then((n) => app.log.info(n, 'Sessions et liens expirés supprimés'), (e) => app.log.error(e, 'Purge impossible'))
await purger()
setInterval(purger, 60 * 60 * 1000).unref()

// Par défaut, écoute locale uniquement. Pour un accès réseau : HOTE=0.0.0.0, derrière HTTPS (voir README).
await app.listen({ host: hote, port })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  })
}
