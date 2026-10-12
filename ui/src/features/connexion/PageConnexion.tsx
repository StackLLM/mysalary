import { schemaConnexion } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bouton } from '../../components/Bouton'
import { Champ } from '../../components/Champ'
import { useConnexion } from '../compte/requetes'
import { Alerte } from './Alerte'
import { ChampMotDePasse } from './ChampMotDePasse'
import { MiseEnPageAuth } from './MiseEnPageAuth'
import { erreursDe, erreursServeur, suiteSure } from './saisie'

export function PageConnexion() {
  const connexion = useConnexion()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = schemaConnexion.safeParse({ email, motDePasse })
    if (!lu.success) return setErreurs(erreursDe(lu.error))
    setErreurs({})
    connexion.mutate(lu.data, {
      onSuccess: () => naviguer(suiteSure(params.get('suite')), { replace: true }),
      onError: (erreur) => setErreurs(erreursServeur(erreur)),
    })
  }

  return (
    <MiseEnPageAuth
      titre="Bon retour"
      sousTitre="Connecte-toi pour retrouver ton budget."
      pied={
        <>
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="font-semibold text-lien hover:underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={soumettre} noValidate className="flex flex-col gap-5" aria-label="Connexion">
        {erreurs._ && <Alerte>{erreurs._}</Alerte>}
        <Champ libelle="E-mail" type="email" autoComplete="email" inputMode="email" autoFocus placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} erreur={erreurs.email} />
        <div className="flex flex-col gap-2">
          <ChampMotDePasse libelle="Mot de passe" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} erreur={erreurs.motDePasse} />
          <Link to={`/mot-de-passe/oubli${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`} className="self-end text-texte-sm font-medium text-lien hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <Bouton type="submit" taille="lg" className="w-full" chargement={connexion.isPending}>
          Se connecter
        </Bouton>
      </form>
    </MiseEnPageAuth>
  )
}
