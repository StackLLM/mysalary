import type { Utilisateur } from '@mysalary/partage'
import { useState } from 'react'
import { Champ } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { ErreurApi } from '../../lib/api'
import { BoutonExport } from '../sauvegarde/BoutonExport'
import { useSupprimerCompte } from './requetes'

/** Suppression du compte connecté : export proposé d'abord, mot de passe exigé. */
export function SuppressionCompte({ utilisateur, onFermer }: { utilisateur: Utilisateur | null; onFermer: () => void }) {
  const supprimer = useSupprimerCompte()
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
      titre="Supprimer ton compte ?"
      description="Toutes tes données sont effacées définitivement. Irréversible."
      libelleConfirmer="Supprimer définitivement"
      confirmerDesactive={!motDePasse}
      chargement={supprimer.isPending}
      onConfirmer={() =>
        supprimer.mutate(motDePasse, {
          onError: (e) => setErreur(e instanceof ErreurApi ? (e.champs?.motDePasse ?? e.message) : 'La suppression a échoué. Réessaie.'),
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
