import { motDePasse as schemaMotDePasse } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton, styleBouton } from '../../components/Bouton'
import { ErreurApi } from '../../lib/api'
import { useNouveauMotDePasse } from '../compte/requetes'
import { Alerte } from './Alerte'
import { ChampMotDePasse } from './ChampMotDePasse'
import { MiseEnPageAuth } from './MiseEnPageAuth'
import { erreursServeur } from './saisie'

/** Lien reçu par e-mail (mot de passe oublié, ou activation d'un compte existant) : choisir le mot de passe. */
export function PageNouveauMotDePasse() {
  const enregistrer = useNouveauMotDePasse()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const jeton = params.get('jeton') ?? ''
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [lienMort, setLienMort] = useState(jeton.length < 20)

  function soumettre(e: FormEvent) {
    e.preventDefault()
    const p: Record<string, string> = {}
    const lu = schemaMotDePasse.safeParse(motDePasse)
    if (!lu.success) p.motDePasse = lu.error.issues[0]!.message
    else if (confirmation !== motDePasse) p.confirmation = 'Les deux mots de passe sont différents.'
    setErreurs(p)
    if (Object.keys(p).length > 0) return
    enregistrer.mutate(
      { jeton, motDePasse },
      {
        onSuccess: () => {
          toast('Mot de passe enregistré. Connecte-toi.')
          naviguer('/connexion', { replace: true })
        },
        onError: (erreur) => (erreur instanceof ErreurApi && erreur.code === 'LIEN_INVALIDE' ? setLienMort(true) : setErreurs(erreursServeur(erreur))),
      },
    )
  }

  if (lienMort) {
    return (
      <MiseEnPageAuth titre="Lien expiré" sousTitre="Ce lien n’est plus valable : il a déjà servi, ou il a plus d’une heure.">
        <Link to="/mot-de-passe/oubli" className={styleBouton({ taille: 'lg', className: 'w-full' })}>
          Demander un nouveau lien
        </Link>
      </MiseEnPageAuth>
    )
  }

  return (
    <MiseEnPageAuth titre="Nouveau mot de passe" sousTitre="Choisis-le ; tes autres appareils seront déconnectés.">
      <form onSubmit={soumettre} noValidate className="flex flex-col gap-5" aria-label="Choisir un mot de passe">
        {erreurs._ && <Alerte>{erreurs._}</Alerte>}
        <ChampMotDePasse libelle="Nouveau mot de passe" autoComplete="new-password" autoFocus aide="8 caractères au moins." value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} erreur={erreurs.motDePasse} />
        <ChampMotDePasse libelle="Confirmation" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} erreur={erreurs.confirmation} />
        <Bouton type="submit" taille="lg" className="w-full" chargement={enregistrer.isPending}>
          Enregistrer
        </Bouton>
      </form>
    </MiseEnPageAuth>
  )
}
