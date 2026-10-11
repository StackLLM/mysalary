import { PrismaClient } from '@prisma/client'
import { sauvegarderBase } from '../src/lib/sauvegardeBase'

try {
  process.loadEnvFile()
} catch {
  // Pas de fichier .env : on garde les variables d'environnement existantes.
}

const prisma = new PrismaClient()
try {
  console.log(`Sauvegarde créée : ${await sauvegarderBase(prisma, process.argv[2] ?? '../sauvegardes', new Date())}`)
} finally {
  await prisma.$disconnect()
}
