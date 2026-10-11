import type { PrismaClient } from '@prisma/client'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/** Nombre de sauvegardes gardées : les plus récentes. */
export const SAUVEGARDES_GARDEES = 10

const horodatage = (d: Date) => d.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')

/**
 * Copie cohérente de la base SQLite (`VACUUM INTO`, sûre même serveur allumé) dans `dossier`,
 * puis supprime les plus anciennes au-delà de `SAUVEGARDES_GARDEES`. Renvoie le chemin du fichier.
 */
export async function sauvegarderBase(prisma: PrismaClient, dossier: string, maintenant: Date): Promise<string> {
  const cible = resolve(dossier)
  await mkdir(cible, { recursive: true })
  const fichier = join(cible, `mysalary-${horodatage(maintenant)}.db`)
  await prisma.$executeRawUnsafe(`VACUUM INTO '${fichier.replaceAll("'", "''")}'`)
  const anciennes = (await readdir(cible)).filter((n) => /^mysalary-\d{8}-\d{6}\.db$/.test(n)).sort().reverse().slice(SAUVEGARDES_GARDEES)
  await Promise.all(anciennes.map((n) => rm(join(cible, n))))
  return fichier
}
