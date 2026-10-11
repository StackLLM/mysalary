import type { Utilisateur } from '@mysalary/partage'
import { useState } from 'react'
import { toast } from 'sonner'
import { Champ } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { BoutonExport } from './BoutonExport'
import { useReinitialiserCompte } from './requetes'

/** Double confirmation de réinitialisation : il faut retaper le prénom ; l'export est proposé d'abord. */
export function ReinitialisationCompte({ utilisateur, onFermer, onFait }: { utilisateur: Utilisateur | null; onFermer: () => void; onFait: () => void }) {
  const reinitialiser = useReinitialiserCompte()
  const [saisie, setSaisie] = useState('')

  function fermer() {
    setSaisie('')
    onFermer()
  }

  return (
    <Confirmation
      ouvert={utilisateur !== null}
      onFermer={fermer}
      titre="Réinitialiser ce compte ?"
      description="Plan, dépenses, épargne et clôtures sont effacés. Le compte et ses réglages restent. Irréversible."
      libelleConfirmer="Réinitialiser"
      confirmerDesactive={saisie.trim() !== utilisateur?.prenom}
      chargement={reinitialiser.isPending}
      onConfirmer={() => {
        if (!utilisateur) return
        reinitialiser.mutate(utilisateur, {
          onSuccess: () => {
            fermer()
            toast('Compte réinitialisé.')
            onFait()
          },
          onError: () => toast('La réinitialisation a échoué. Réessaie.'),
        })
      }}
    >
      <div className="flex flex-col gap-4">
        {utilisateur && <BoutonExport utilisateur={utilisateur} className="w-full" />}
        <Champ libelle={`Pour confirmer, tape « ${utilisateur?.prenom ?? ''} »`} value={saisie} onChange={(e) => setSaisie(e.target.value)} autoComplete="off" />
      </div>
    </Confirmation>
  )
}
