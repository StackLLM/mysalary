import type { Utilisateur } from '@mysalary/partage'
import { useState } from 'react'
import { toast } from 'sonner'
import { Champ } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { ErreurApi } from '../../lib/api'
import { BoutonExport } from './BoutonExport'
import { useReinitialiserCompte } from './requetes'

/** Réinitialisation du compte : export proposé d'abord, mot de passe exigé. */
export function ReinitialisationCompte({ utilisateur, onFermer, onFait }: { utilisateur: Utilisateur | null; onFermer: () => void; onFait: () => void }) {
  const reinitialiser = useReinitialiserCompte()
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string>()

  function fermer() {
    setMotDePasse('')
    setErreur(undefined)
    onFermer()
  }

  return (
    <Confirmation
      ouvert={utilisateur !== null}
      onFermer={fermer}
      titre="Réinitialiser ton compte ?"
      description="Plan, dépenses, épargne et clôtures sont effacés. Ton compte et tes réglages restent. Irréversible."
      libelleConfirmer="Réinitialiser"
      confirmerDesactive={!motDePasse}
      chargement={reinitialiser.isPending}
      onConfirmer={() =>
        reinitialiser.mutate(motDePasse, {
          onSuccess: () => {
            fermer()
            toast('Compte réinitialisé.')
            onFait()
          },
          onError: (e) => setErreur(e instanceof ErreurApi ? (e.champs?.motDePasse ?? e.message) : 'La réinitialisation a échoué. Réessaie.'),
        })
      }
    >
      <div className="flex flex-col gap-4">
        {utilisateur && <BoutonExport utilisateur={utilisateur} className="w-full" />}
        <Champ libelle="Ton mot de passe" type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} erreur={erreur} />
      </div>
    </Confirmation>
  )
}
