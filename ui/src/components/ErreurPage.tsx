import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Bouton } from './Bouton'
import { Carte } from './Carte'

interface Proprietes {
  /** Change à chaque page : l'erreur d'une page ne suit pas sur la suivante. */
  cle: string
  children: ReactNode
  /** Filet de toute l'application (autour de l'en-tête) : message centré sur la page. */
  pleinePage?: boolean
}

/**
 * Filet de sécurité d'une page (ou de toute l'application avec `pleinePage`) : une erreur d'affichage reste dans la page, avec un message et « Recharger »,
 * au lieu de blanchir toute l'application. L'en-tête et la navigation restent utilisables.
 */
export class ErreurPage extends Component<Proprietes, { erreur: Error | null; cle: string }> {
  state = { erreur: null as Error | null, cle: this.props.cle }

  static getDerivedStateFromError(erreur: Error) {
    return { erreur }
  }

  static getDerivedStateFromProps(props: Proprietes, state: { erreur: Error | null; cle: string }) {
    return props.cle !== state.cle ? { erreur: null, cle: props.cle } : null
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    console.error('Erreur d’affichage de la page', erreur, info.componentStack)
  }

  render() {
    if (!this.state.erreur) return this.props.children
    if (this.props.pleinePage) {
      return (
        <main className="grid min-h-screen place-items-center bg-page px-4">
          <div role="alert" className="max-w-md rounded-carte bg-white p-8 text-center shadow-carte">
            <h1 className="text-titre text-encre">MySalary n’a pas pu s’afficher.</h1>
            <p className="mt-2 text-texte text-gris">Tes données ne sont pas touchées. Recharge la page.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-6 h-11 rounded-bouton bg-primaire px-6 text-texte font-semibold text-white hover:bg-primaire-survol">
              Recharger
            </button>
          </div>
        </main>
      )
    }
    return (
      <Carte espacement="large" className="max-w-xl" role="alert">
        <h1 className="text-titre text-encre">Cette page n’a pas pu s’afficher.</h1>
        <p className="mt-2 text-texte text-gris">Tes données ne sont pas touchées. Recharge la page, ou passe par le menu.</p>
        <Bouton variante="teinte" taille="md" className="mt-6" onClick={() => window.location.reload()}>
          Recharger
        </Bouton>
      </Carte>
    )
  }
}
