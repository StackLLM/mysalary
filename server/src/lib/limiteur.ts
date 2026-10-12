/**
 * Limiteur d'essais en mémoire (connexion, mot de passe oublié) : au-delà de `maximum` échecs dans la fenêtre,
 * la clé est bloquée jusqu'à la fin de la fenêtre. Suffisant pour une seule instance du serveur.
 */
export class Limiteur {
  private readonly essais = new Map<string, { nombre: number; jusqua: number }>()

  constructor(
    private readonly maximum: number,
    private readonly fenetreMs: number,
    private readonly maintenant: () => number = Date.now,
  ) {}

  /** Vrai si la clé a épuisé ses essais. */
  bloque(cle: string): boolean {
    const etat = this.essais.get(cle)
    if (!etat) return false
    if (etat.jusqua <= this.maintenant()) {
      this.essais.delete(cle)
      return false
    }
    return etat.nombre >= this.maximum
  }

  compter(cle: string) {
    const actuel = this.essais.get(cle)
    const vivant = actuel && actuel.jusqua > this.maintenant()
    this.essais.set(cle, { nombre: (vivant ? actuel.nombre : 0) + 1, jusqua: vivant ? actuel.jusqua : this.maintenant() + this.fenetreMs })
  }

  effacer(cle: string) {
    this.essais.delete(cle)
  }
}
