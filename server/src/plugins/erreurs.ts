import { CODES_ERREUR, type ReponseErreur } from '@mysalary/partage'
import { Prisma } from '@prisma/client'
import type { FastifyError, FastifyInstance } from 'fastify'
import { ErreurApi } from '../lib/erreurs'
import { erreurPourJournal } from '../lib/journaux'
import { TropDEssais } from '../lib/limiteur'

function corps(erreur: ErreurApi): ReponseErreur {
  return {
    erreur: {
      code: erreur.code,
      message: erreur.message,
      ...(erreur.champs ? { champs: erreur.champs } : {}),
    },
  }
}

/** Toutes les erreurs sortent au format `{ erreur: { code, message, champs? } }`. */
export function installerErreurs(app: FastifyInstance, production = false) {
  app.setErrorHandler((erreur: FastifyError | Error, requete, reponse) => {
    if (erreur instanceof ErreurApi) {
      if (erreur instanceof TropDEssais) reponse.header('retry-after', String(Math.max(1, Math.ceil(erreur.attenteMs / 1000))))
      return reponse.status(erreur.statut).send(corps(erreur))
    }
    if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === 'P2025') {
      return reponse
        .status(404)
        .send(corps(new ErreurApi(404, CODES_ERREUR.INTROUVABLE, 'Élément introuvable.')))
    }
    if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === 'P2002') {
      return reponse.status(409).send(corps(new ErreurApi(409, CODES_ERREUR.CONFLIT, 'Cet élément existe déjà.')))
    }
    const statut = 'statusCode' in erreur ? erreur.statusCode : undefined
    if (statut && statut >= 400 && statut < 500) {
      // Erreurs de Fastify côté client : JSON illisible, corps trop gros, type de contenu…
      return reponse
        .status(statut)
        .send(corps(new ErreurApi(statut, CODES_ERREUR.VALIDATION, 'Requête invalide.')))
    }
    // Jamais de détail interne ni de donnée financière dans la réponse.
    requete.log.error(erreurPourJournal(erreur, production), 'Erreur interne')
    return reponse
      .status(500)
      .send(corps(new ErreurApi(500, CODES_ERREUR.INTERNE, 'Erreur interne du serveur.')))
  })

  app.setNotFoundHandler((requete, reponse) => {
    reponse
      .status(404)
      .send(
        corps(
          new ErreurApi(404, CODES_ERREUR.ROUTE_INCONNUE, `Route inconnue : ${requete.method} ${requete.url.split('?')[0]}`),
        ),
      )
  })
}
