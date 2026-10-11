import { PrismaClient } from '@prisma/client'
import { construireApp } from './app'

try {
  process.loadEnvFile()
} catch {
  // Pas de fichier .env : on garde les variables d'environnement existantes.
}

const prisma = new PrismaClient()
const hote = process.env.HOTE ?? '127.0.0.1'
const reseau = !['127.0.0.1', 'localhost', '::1'].includes(hote)

// Ouvert au réseau, tout compte doit avoir un mot de passe : le serveur refuse de démarrer sinon.
if (reseau) {
  const sansMotDePasse = await prisma.utilisateur.findMany({ where: { motDePasse: null }, select: { prenom: true } })
  if (sansMotDePasse.length > 0) {
    console.error(`HOTE=${hote} ouvre le serveur au réseau. Ces comptes n'ont pas de mot de passe : ${sansMotDePasse.map((u) => u.prenom).join(', ')}. Protège-les en local (Réglages › Mot de passe), puis relance.`)
    process.exit(1)
  }
}

const app = await construireApp({ prisma, logger: { level: 'info' }, reseau })
const port = Number(process.env.PORT ?? 3010)

// Par défaut, écoute locale uniquement. Hors de cette machine : HOTE=0.0.0.0, derrière HTTPS.
await app.listen({ host: hote, port })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  })
}
