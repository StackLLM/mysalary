import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { styleBouton } from '../../components/Bouton'
import { ErreurApi } from '../../lib/api'
import { useVerifierEmail } from '../compte/requetes'
import { MiseEnPageAuth } from './MiseEnPageAuth'

type Etat = 'en cours' | 'confirme' | 'lienMort' | 'pris' | 'erreur'

/** Lien reçu par e-mail : confirme l'adresse du compte, ou la remplace par la nouvelle. Le lien ne sert qu'une fois, donc un seul appel. */
export function PageVerificationEmail() {
  const verifier = useVerifierEmail()
  const [params] = useSearchParams()
  const jeton = params.get('jeton') ?? ''
  const [etat, setEtat] = useState<Etat>(jeton.length < 20 ? 'lienMort' : 'en cours')
  const lance = useRef(false)

  useEffect(() => {
    if (lance.current || jeton.length < 20) return
    lance.current = true
    verifier.mutateAsync(jeton).then(
      () => setEtat('confirme'),
      (e) => setEtat(e instanceof ErreurApi && e.code === 'LIEN_INVALIDE' ? 'lienMort' : e instanceof ErreurApi && e.statut === 409 ? 'pris' : 'erreur'),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jeton])

  const continuer = (
    <Link to="/" className={styleBouton({ taille: 'lg', className: 'w-full' })}>
      Continuer
    </Link>
  )
  if (etat === 'confirme') return <MiseEnPageAuth titre="Adresse confirmée" sousTitre="Tu te connectes désormais avec cette adresse.">{continuer}</MiseEnPageAuth>
  if (etat === 'lienMort') {
    // Réglages renvoie le lien (ou relance le changement d'adresse) ; sans session, la connexion ramène ensuite à Réglages.
    return (
      <MiseEnPageAuth titre="Lien expiré" sousTitre="Ce lien n’est plus valable : il a déjà servi, ou il a plus de 24 heures.">
        <Link to="/reglages" className={styleBouton({ taille: 'lg', className: 'w-full' })}>
          Recevoir un nouveau lien
        </Link>
      </MiseEnPageAuth>
    )
  }
  if (etat === 'pris') {
    return (
      <MiseEnPageAuth titre="Adresse déjà utilisée" sousTitre="Un autre compte utilise maintenant cette adresse. Dans Réglages, choisis-en une autre.">
        {continuer}
      </MiseEnPageAuth>
    )
  }
  if (etat === 'erreur') {
    return (
      <MiseEnPageAuth titre="Confirmation impossible" sousTitre="Le serveur ne répond pas. Ouvre le lien à nouveau dans quelques instants.">
        {continuer}
      </MiseEnPageAuth>
    )
  }
  return (
    <MiseEnPageAuth titre="Confirmation en cours" sousTitre="Un instant.">
      <p role="status" className="text-texte-sm text-gris">
        Vérification du lien…
      </p>
    </MiseEnPageAuth>
  )
}
