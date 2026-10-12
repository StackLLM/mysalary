import { schemaOubliMotDePasse } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bouton } from '../../components/Bouton'
import { Champ } from '../../components/Champ'
import { useOubliMotDePasse } from '../compte/requetes'
import { Alerte } from './Alerte'
import { MiseEnPageAuth } from './MiseEnPageAuth'
import { erreursDe, erreursServeur } from './saisie'

/** Demande d'un lien : la réponse est la même que l'e-mail ait un compte ou non. */
export function PageMotDePasseOublie() {
  const oubli = useOubliMotDePasse()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [envoye, setEnvoye] = useState<string | null>(null)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = schemaOubliMotDePasse.safeParse({ email })
    if (!lu.success) return setErreurs(erreursDe(lu.error))
    setErreurs({})
    oubli.mutate(lu.data.email, { onSuccess: () => setEnvoye(lu.data.email), onError: (erreur) => setErreurs(erreursServeur(erreur)) })
  }

  return (
    <MiseEnPageAuth
      titre="Mot de passe oublié"
      sousTitre="Entre ton e-mail : tu reçois un lien pour en choisir un nouveau."
      pied={
        <Link to="/connexion" className="font-semibold text-lien hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      {envoye ? (
        <div className="flex flex-col gap-5">
          <Alerte ton="positif">
            Si un compte existe pour <span className="font-semibold">{envoye}</span>, un lien vient d’être envoyé. Il est valable 1 heure.
          </Alerte>
          <Bouton variante="contour" taille="lg" className="w-full" onClick={() => setEnvoye(null)}>
            Renvoyer un lien
          </Bouton>
        </div>
      ) : (
        <form onSubmit={soumettre} noValidate className="flex flex-col gap-5" aria-label="Mot de passe oublié">
          {erreurs._ && <Alerte>{erreurs._}</Alerte>}
          <Champ libelle="E-mail" type="email" autoComplete="email" inputMode="email" autoFocus placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} erreur={erreurs.email} />
          <Bouton type="submit" taille="lg" className="w-full" chargement={oubli.isPending}>
            Envoyer le lien
          </Bouton>
        </form>
      )}
    </MiseEnPageAuth>
  )
}
