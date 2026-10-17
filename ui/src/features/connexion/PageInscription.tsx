import { DEVISES, schemaInscription, type Devise } from '@mysalary/partage'
import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bouton } from '../../components/Bouton'
import { Champ } from '../../components/Champ'
import { Pilule } from '../../components/Pilule'
import { useInscription } from '../compte/requetes'
import { Alerte } from './Alerte'
import { ChampMotDePasse } from './ChampMotDePasse'
import { MiseEnPageAuth } from './MiseEnPageAuth'
import { erreursDe, erreursServeur } from './saisie'

export function PageInscription() {
  const inscription = useInscription()
  const naviguer = useNavigate()
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [devise, setDevise] = useState<Devise>('MAD')
  const [accepte, setAccepte] = useState(false)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = schemaInscription.safeParse({ prenom, email, motDePasse, devise, accepteConditions: accepte })
    if (!lu.success) return setErreurs(erreursDe(lu.error))
    setErreurs({})
    // Un nouveau compte commence par la mise en route (lot 19).
    inscription.mutate(lu.data, { onSuccess: () => naviguer('/onboarding', { replace: true }), onError: (erreur) => setErreurs(erreursServeur(erreur)) })
  }

  return (
    <MiseEnPageAuth
      titre="Crée ton compte"
      sousTitre="Quelques secondes, puis une mise en route guidée."
      pied={
        <>
          Déjà un compte ?{' '}
          <Link to="/connexion" className="font-semibold text-lien hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={soumettre} noValidate className="flex flex-col gap-5" aria-label="Inscription">
        {erreurs._ && <Alerte>{erreurs._}</Alerte>}
        <Champ libelle="Prénom" autoComplete="given-name" autoFocus placeholder="Ton prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} erreur={erreurs.prenom} />
        <Champ libelle="E-mail" type="email" autoComplete="email" inputMode="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} erreur={erreurs.email} />
        <ChampMotDePasse libelle="Mot de passe" autoComplete="new-password" aide="8 caractères au moins." value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} erreur={erreurs.motDePasse} />
        <fieldset>
          <legend className="mb-2 text-texte-sm text-gris">Devise</legend>
          <div className="flex gap-2">
            {DEVISES.map((d) => (
              <Pilule key={d} active={devise === d} onClick={() => setDevise(d)}>
                {d}
              </Pilule>
            ))}
          </div>
          <p className="mt-2 text-mention text-gris">Elle ne pourra plus être changée ensuite.</p>
        </fieldset>
        <div>
          <label className="flex items-start gap-3 text-texte-sm text-encre-2">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#7D8C82]"
              checked={accepte}
              onChange={(e) => setAccepte(e.target.checked)}
              aria-invalid={Boolean(erreurs.accepteConditions)}
              aria-describedby={erreurs.accepteConditions ? 'erreur-conditions' : undefined}
            />
            <span>
              J’accepte les{' '}
              <Link to="/conditions" target="_blank" rel="noopener" className="font-semibold text-lien hover:underline">
                conditions d’utilisation
              </Link>{' '}
              et la{' '}
              <Link to="/confidentialite" target="_blank" rel="noopener" className="font-semibold text-lien hover:underline">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
          {erreurs.accepteConditions && (
            <p id="erreur-conditions" className="mt-2 flex items-center gap-1 text-mention text-alerte">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {erreurs.accepteConditions}
            </p>
          )}
        </div>
        <Bouton type="submit" taille="lg" className="w-full" chargement={inscription.isPending}>
          Créer mon compte
        </Bouton>
      </form>
    </MiseEnPageAuth>
  )
}
