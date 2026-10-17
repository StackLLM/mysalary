import { Prisma, type PrismaClient } from '@prisma/client'
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

  /** Vrai si la clé a épuisé ses essais. */
  async bloque(valeur: string): Promise<boolean> {
    const ligne = await this.prisma.tentativeAcces.findUnique({ where: { cle: this.cle(valeur) } })
    return !!ligne && ligne.finFenetre > this.maintenant() && ligne.nombre >= this.maximum
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
