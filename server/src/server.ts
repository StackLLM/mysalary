import { PrismaClient } from '@prisma/client'
import { construireApp } from './app'

try {
  process.loadEnvFile()
} catch {
  // Pas de fichier .env : on garde les variables d'environnement existantes.
}

const prisma = new PrismaClient()
const app = await construireApp({ prisma, logger: { level: 'info' } })
const port = Number(process.env.PORT ?? 3010)

// Écoute locale uniquement : pas d'authentification en v1 (Plan.md § 5.7).
await app.listen({ host: '127.0.0.1', port })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  })
}
