import { PrismaClient } from '@prisma/client'
import { activerCompte } from '../src/lib/activation'

/**
 * Active un compte d'avant le lot 23 (sans e-mail ni mot de passe) : lui donne un e-mail de connexion et affiche
 * un lien, valable 24 heures, pour choisir son mot de passe. Ne se lance que sur la machine du serveur.
 *   npm run compte:activer -- <prénom ou identifiant> <e-mail>
 */
try {
  process.loadEnvFile()
} catch {
  // Pas de fichier .env.
}

const [compte, email] = process.argv.slice(2)
if (!compte || !email) {
  console.error('Usage : npm run compte:activer -- <prénom ou identifiant> <e-mail>')
  process.exit(1)
}
const prisma = new PrismaClient()
try {
  const { prenom, lien } = await activerCompte(prisma, { compte, email }, new Date(), process.env.APP_URL ?? 'http://127.0.0.1:6010')
  console.log(`Compte de ${prenom} : e-mail ${email.trim().toLowerCase()}.\nOuvre ce lien (valable 24 heures) pour choisir le mot de passe :\n${lien}`)
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
