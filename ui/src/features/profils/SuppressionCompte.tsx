import type { Utilisateur } from '@mysalary/partage'
import { useState } from 'react'
import { toast } from 'sonner'
import { Champ } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { useSupprimerUtilisateur } from './requetes'

/**
 * Double confirmation de suppression d'un compte (UX.md § 5.0) : il faut retaper le prénom.
 * Si c'est le compte courant, il est quitté (voir useSupprimerUtilisateur).
 */
export function SuppressionCompte({
  utilisateur,
  onFermer,
  onSupprime,
}: {
  utilisateur: Utilisateur | null
  onFermer: () => void
  onSupprime?: () => void
}) {
  const supprimer = useSupprimerUtilisateur()
  const [saisie, setSaisie] = useState('')

  function fermer() {
    setSaisie('')
    onFermer()
  }

  return (
    <Confirmation
      ouvert={utilisateur !== null}
      onFermer={fermer}
      titre={`Supprimer le compte de ${utilisateur?.prenom ?? ''} ?`}
      description="Toutes ses données seront effacées définitivement. Cette action ne peut pas être annulée."
      libelleConfirmer="Supprimer définitivement"
      confirmerDesactive={saisie.trim() !== utilisateur?.prenom}
      chargement={supprimer.isPending}
      onConfirmer={() => {
        if (!utilisateur) return
        supprimer.mutate(utilisateur, {
          onSuccess: () => {
            fermer()
            onSupprime?.()
          },
          onError: () => toast('La suppression a échoué. Réessaie.'),
        })
      }}
    >
      <Champ
        libelle={`Pour confirmer, tape « ${utilisateur?.prenom ?? ''} »`}
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        autoComplete="off"
      />
    </Confirmation>
  )
}
