import { CODES_ERREUR } from '@mysalary/partage'
import { Prisma, type PrismaClient } from '@prisma/client'
import { ErreurApi } from './erreurs'
import { empreinteJeton } from './motDePasse'

/**
 * Limiteur d'essais (connexion, mot de passe oublié, envois de liens) : au-delà de `maximum` essais dans la fenêtre,
 * la clé est bloquée jusqu'à la fin de la fenêtre. Compté en base (`TentativeAcces`) : la limite tient
 * avec plusieurs instances du serveur (prod.md § 5.4, lot P2). La clé est stockée en empreinte, jamais en clair.
 */
export class Limiteur {
  constructor(
    private readonly prisma: PrismaClient,
    /** Nom de la limite, pour que deux limites ne partagent jamais une clé. */
    private readonly nom: string,
    private readonly maximum: number,
    private readonly fenetreMs: number,
    private readonly maintenant: () => Date,
  ) {}

  private cle(valeur: string) {
    return empreinteJeton(`${this.nom}:${valeur}`)
  }

  /** Temps à attendre avant un nouvel essai, en millisecondes ; 0 si la clé n'est pas bloquée. */
  async attente(valeur: string): Promise<number> {
    const ligne = await this.prisma.tentativeAcces.findUnique({ where: { cle: this.cle(valeur) } })
    if (!ligne || ligne.nombre < this.maximum) return 0
    return Math.max(0, ligne.finFenetre.getTime() - this.maintenant().getTime())
  }

  /** Compte un essai. Une fenêtre passée repart de zéro. Sûr si deux instances comptent en même temps. */
  async compter(valeur: string) {
    const cle = this.cle(valeur)
    const maintenant = this.maintenant()
    await this.prisma.tentativeAcces.deleteMany({ where: { cle, finFenetre: { lte: maintenant } } })
    const plus1 = { nombre: { increment: 1 } }
    try {
      await this.prisma.tentativeAcces.upsert({
        where: { cle },
        create: { cle, nombre: 1, finFenetre: new Date(maintenant.getTime() + this.fenetreMs) },
        update: plus1,
      })
    } catch (e) {
      // L'autre instance a créé la ligne entre-temps : on l'incrémente.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e
      await this.prisma.tentativeAcces.update({ where: { cle }, data: plus1 })
    }
  }

  async effacer(valeur: string) {
    await this.prisma.tentativeAcces.deleteMany({ where: { cle: this.cle(valeur) } })
  }
}

/** Délai lisible : « 1 minute », « 14 minutes », « 1 heure ». Arrondi au-dessus, jamais « 0 minute ». */
export function dureeLisible(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000))
  if (minutes >= 60 && minutes % 60 === 0) return minutes === 60 ? '1 heure' : `${minutes / 60} heures`
  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}

/** Refus 429 avec le délai réel (lot P3) ; `Retry-After` est posé par le gestionnaire d'erreurs. */
export class TropDEssais extends ErreurApi {
  constructor(
    readonly attenteMs: number,
    quoi = 'Trop d’essais',
  ) {
    super(429, CODES_ERREUR.TROP_DE_TENTATIVES, `${quoi}. Réessaie dans ${dureeLisible(attenteMs)}.`)
  }
}
