import { CODES_ERREUR, schemaChangementMotDePasse, schemaConnexion } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { ErreurApi, introuvable } from '../../lib/erreurs'
import { hacher, verifier } from '../../lib/motDePasse'
import { valider } from '../../lib/valider'
import { exigerAcces, fermerSession, ouvrirSession } from '../../plugins/session'
import { versDto } from '../utilisateurs/depot'

const ECHECS_MAX = 5
const BLOCAGE_MS = 60_000

/** Connexion, déconnexion et mot de passe d'un compte (lot 22). */
export async function routesSession(app: FastifyInstance) {
  // Échecs consécutifs par compte, en mémoire : 5 erreurs bloquent les essais pendant une minute.
  const echecs = new Map<string, { nombre: number; jusqua: number }>()

  const compteDe = async (id: string) => {
    const compte = await app.prisma.utilisateur.findUnique({ where: { id } })
    if (!compte) throw introuvable('Compte')
    return compte
  }
  const refuser = () => new ErreurApi(401, CODES_ERREUR.IDENTIFIANTS_REFUSES, 'Mot de passe incorrect.', { motDePasse: 'Mot de passe incorrect.' })

  /** Vérifie un mot de passe en comptant les échecs ; lève 429 pendant un blocage. */
  async function controler(id: string, mot: string | undefined, enregistre: string) {
    const etat = echecs.get(id)
    if (etat && etat.nombre >= ECHECS_MAX && etat.jusqua > Date.now()) {
      throw new ErreurApi(429, CODES_ERREUR.TROP_DE_TENTATIVES, 'Trop d’essais. Réessaie dans une minute.')
    }
    if (mot !== undefined && (await verifier(mot, enregistre))) return echecs.delete(id)
    const nombre = (etat && etat.jusqua > Date.now() ? etat.nombre : 0) + 1
    echecs.set(id, { nombre, jusqua: Date.now() + BLOCAGE_MS })
    throw refuser()
  }

  app.post<{ Params: { id: string } }>('/utilisateurs/:id/connexion', async (requete, reponse) => {
    const { motDePasse } = valider(schemaConnexion, requete.body)
    const compte = await compteDe(requete.params.id)
    if (!compte.motDePasse) return versDto(compte)
    await controler(compte.id, motDePasse, compte.motDePasse)
    await ouvrirSession(app.prisma, requete, reponse, compte.id)
    return versDto(compte)
  })

  app.post('/deconnexion', async (requete, reponse) => {
    await fermerSession(app.prisma, requete, reponse)
    return reponse.status(204).send()
  })

  // Définit ou change le mot de passe ; un compte déjà protégé exige la session et l'ancien mot de passe.
  app.put<{ Params: { id: string } }>('/utilisateurs/:id/mot-de-passe', async (requete, reponse) => {
    const { actuel, nouveau } = valider(schemaChangementMotDePasse, requete.body)
    const compte = await compteDe(requete.params.id)
    if (compte.motDePasse) {
      await exigerAcces(app.prisma, requete, compte.id)
      await controler(compte.id, actuel, compte.motDePasse)
    }
    const modifie = await app.prisma.utilisateur.update({ where: { id: compte.id }, data: { motDePasse: await hacher(nouveau) } })
    // Les autres sessions du compte tombent ; celle-ci reste ouverte.
    await app.prisma.session.deleteMany({ where: { utilisateurId: compte.id } })
    await ouvrirSession(app.prisma, requete, reponse, compte.id)
    return versDto(modifie)
  })

  app.post<{ Params: { id: string } }>('/utilisateurs/:id/mot-de-passe/retrait', async (requete, reponse) => {
    const { motDePasse } = valider(schemaConnexion, requete.body)
    if (app.reseau) throw new ErreurApi(422, CODES_ERREUR.REGLE_METIER, 'Le serveur est ouvert au réseau : le mot de passe est obligatoire.')
    const compte = await compteDe(requete.params.id)
    if (!compte.motDePasse) return versDto(compte)
    await exigerAcces(app.prisma, requete, compte.id)
    await controler(compte.id, motDePasse, compte.motDePasse)
    const modifie = await app.prisma.utilisateur.update({ where: { id: compte.id }, data: { motDePasse: null } })
    await app.prisma.session.deleteMany({ where: { utilisateurId: compte.id } })
    await fermerSession(app.prisma, requete, reponse)
    return versDto(modifie)
  })
}
