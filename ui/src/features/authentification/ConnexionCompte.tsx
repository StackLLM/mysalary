import type { Utilisateur } from '@mysalary/partage'
import { useState } from 'react'
import { Champ } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { ErreurApi } from '../../lib/api'
import { useConnecter } from './requetes'

/** Demande le mot de passe d'un compte protégé ; `onConnecte` ouvre le compte. */
export function ConnexionCompte({ utilisateur, onFermer, onConnecte }: { utilisateur: Utilisateur | null; onFermer: () => void; onConnecte: (u: Utilisateur) => void }) {
  const connecter = useConnecter()
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string>()

  function fermer() {
    setMotDePasse('')
    setErreur(undefined)
    connecter.reset()
    onFermer()
  }

  function valider() {
    if (!utilisateur || !motDePasse) return
    connecter.mutate(
      { id: utilisateur.id, motDePasse },
      {
        onSuccess: (u) => {
          fermer()
          onConnecte(u)
        },
        onError: (e) => setErreur(e instanceof ErreurApi ? e.message : 'Connexion impossible. Réessaie.'),
      },
    )
  }

  return (
    <Confirmation
      ouvert={utilisateur !== null}
      onFermer={fermer}
      titre={`Compte de ${utilisateur?.prenom ?? ''}`}
      description="Entre le mot de passe pour l’ouvrir."
      libelleConfirmer="Se connecter"
      ton="principal"
      confirmerDesactive={!motDePasse}
      chargement={connecter.isPending}
      onConfirmer={valider}
    >
      <Champ
        libelle="Mot de passe"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && valider()}
        erreur={erreur}
      />
    </Confirmation>
  )
}
