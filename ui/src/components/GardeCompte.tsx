import { useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useUtilisateurs } from '../features/profils/requetes'
import { useCompte } from '../state/compte'
import { Bouton } from './Bouton'
import { Carte } from './Carte'

/**
 * Protège les pages d'un compte (UX.md § 5.0) :
 * - aucun compte choisi → écran Profils ;
 * - compte retenu sur l'appareil mais supprimé → retour à Profils avec un message.
 */
export function GardeCompte({ children }: { children: ReactNode }) {
  const { id, quitter } = useCompte()
  const utilisateurs = useUtilisateurs()
  const inconnu = Boolean(id && utilisateurs.data && !utilisateurs.data.some((u) => u.id === id))

  useEffect(() => {
    if (!inconnu) return
    quitter()
    toast('Ce compte n’existe plus. Choisis un autre compte.', { id: 'compte-inconnu' })
  }, [inconnu, quitter])

  if (!id || inconnu) return <Navigate to="/profils" replace />

  if (utilisateurs.isError) {
    return (
      <Carte espacement="large" className="max-w-xl">
        <h1 className="text-titre text-encre">Connexion au serveur perdue.</h1>
        <p className="mt-2 text-texte text-gris">Tes données ne sont pas perdues. Vérifie que MySalary est lancé, puis réessaie.</p>
        <Bouton variante="teinte" taille="md" className="mt-6" onClick={() => void utilisateurs.refetch()}>
          Réessayer
        </Bouton>
      </Carte>
    )
  }

  if (utilisateurs.isPending) return <div className="py-16 text-center text-texte-sm text-gris">Chargement…</div>

  return children
}
