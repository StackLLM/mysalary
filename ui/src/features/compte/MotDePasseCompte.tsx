import { motDePasse as schemaMotDePasse } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { Champ } from '../../components/Champ'
import { ErreurApi } from '../../lib/api'
import { useChangerMotDePasse } from './requetes'

/** Réglages › Mot de passe : le changer demande l'actuel ; les autres appareils sont déconnectés. */
export function MotDePasseCompte() {
  const changer = useChangerMotDePasse()
  const [ouvert, setOuvert] = useState(false)
  const [actuel, setActuel] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  function fermer() {
    setOuvert(false)
    setActuel('')
    setNouveau('')
    setErreurs({})
  }

  function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    const p: Record<string, string> = {}
    if (!actuel) p.actuel = 'Entre ton mot de passe actuel.'
    const lu = schemaMotDePasse.safeParse(nouveau)
    if (!lu.success) p.nouveau = lu.error.issues[0]!.message
    setErreurs(p)
    if (Object.keys(p).length > 0) return
    changer.mutate(
      { actuel, nouveau },
      {
        onSuccess: () => {
          toast('Mot de passe changé. Tes autres appareils sont déconnectés.')
          fermer()
        },
        onError: (e) => setErreurs(e instanceof ErreurApi && e.champs?.motDePasse ? { actuel: e.champs.motDePasse } : { _: e instanceof ErreurApi ? e.message : 'Erreur inattendue. Réessaie.' }),
      },
    )
  }

  return (
    <Carte titre="Mot de passe">
      {!ouvert ? (
        <Bouton variante="teinte" taille="md" className="w-full" onClick={() => setOuvert(true)}>
          Changer le mot de passe
        </Bouton>
      ) : (
        <form onSubmit={enregistrer} noValidate className="flex flex-col gap-4">
          <Champ libelle="Mot de passe actuel" type="password" autoComplete="current-password" value={actuel} onChange={(e) => setActuel(e.target.value)} erreur={erreurs.actuel} />
          <Champ libelle="Nouveau mot de passe" type="password" autoComplete="new-password" aide="8 caractères au moins." value={nouveau} onChange={(e) => setNouveau(e.target.value)} erreur={erreurs.nouveau} />
          {erreurs._ && (
            <p role="alert" className="text-texte-sm text-alerte">
              {erreurs._}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Bouton type="submit" taille="md" chargement={changer.isPending}>
              Enregistrer
            </Bouton>
            <Bouton variante="contour" taille="md" onClick={fermer}>
              Annuler
            </Bouton>
          </div>
        </form>
      )}
    </Carte>
  )
}
