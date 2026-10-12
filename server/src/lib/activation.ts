import { email as schemaEmail } from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import { creerJetonMotDePasse, DUREE_ACTIVATION_MS, lienMotDePasse } from './jetons'

/**
 * Activation d'un compte existant (migration du lot 23) : on le retrouve par son identifiant ou son prénom (unique),
 * on lui donne un e-mail libre, et on crée un lien pour choisir le mot de passe. Les données du compte ne bougent pas.
 */
export async function activerCompte(prisma: PrismaClient, { compte, email }: { compte: string; email: string }, maintenant: Date, urlApplication: string) {
  const lu = schemaEmail.safeParse(email)
  if (!lu.success) throw new Error('Cet e-mail n’est pas valide.')
  const trouves = await prisma.utilisateur.findMany({ where: { OR: [{ id: compte }, { prenom: compte }] } })
  if (trouves.length === 0) throw new Error(`Aucun compte « ${compte} ».`)
  if (trouves.length > 1) throw new Error(`Plusieurs comptes s’appellent « ${compte} » : donne son identifiant.`)
  const cible = trouves[0]!
  const pris = await prisma.utilisateur.findUnique({ where: { email: lu.data } })
  if (pris && pris.id !== cible.id) throw new Error('Cet e-mail est déjà utilisé par un autre compte.')
  await prisma.utilisateur.update({ where: { id: cible.id }, data: { email: lu.data } })
  const jeton = await creerJetonMotDePasse(prisma, cible.id, maintenant, DUREE_ACTIVATION_MS)
  return { id: cible.id, prenom: cible.prenom, lien: lienMotDePasse(urlApplication, jeton) }
}
