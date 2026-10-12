import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../features/compte/requetes'
import { useCompte } from '../state/compte'
import { Bouton } from './Bouton'
import { Carte } from './Carte'

/**
 * Protège les pages d'un compte (lot 23) : sans session ouverte, retour à la connexion, puis à la page demandée.
 * Le serveur reste seul juge : la session est vérifiée auprès de lui à chaque ouverture de l'app.
 */
export function GardeCompte({ children }: { children: ReactNode }) {
  const { id, choisir, quitter, volontaire } = useCompte()
  const session = useSession()
  const emplacement = useLocation()
  const connecte = session.data ?? null
  const perdue = id !== null && session.isSuccess && connecte === null

  useEffect(() => {
    if (perdue) quitter()
    // Le serveur fait foi : un autre compte connecté dans ce navigateur devient le compte courant.
    else if (connecte && connecte.id !== id) choisir(connecte.id)
  }, [perdue, connecte, id, choisir, quitter])

  const suite = `${emplacement.pathname}${emplacement.search}`
  const versConnexion = <Navigate to={suite === '/' || volontaire ? '/connexion' : `/connexion?suite=${encodeURIComponent(suite)}`} replace />

  if (session.isError) {
    return (
      <Carte espacement="large" className="max-w-xl">
        <h1 className="text-titre text-encre">Connexion au serveur perdue.</h1>
        <p className="mt-2 text-texte text-gris">Tes données ne sont pas perdues. Vérifie que MySalary est lancé, puis réessaie.</p>
        <Bouton variante="teinte" taille="md" className="mt-6" onClick={() => void session.refetch()}>
          Réessayer
        </Bouton>
      </Carte>
    )
  }
  if (session.isPending) return id ? <div className="py-16 text-center text-texte-sm text-gris">Chargement…</div> : null
  if (!connecte) return versConnexion
  if (connecte.id !== id) return <div className="py-16 text-center text-texte-sm text-gris">Chargement…</div>
  return children
}
