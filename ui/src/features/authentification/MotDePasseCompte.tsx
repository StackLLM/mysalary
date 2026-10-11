import type { Utilisateur } from '@mysalary/partage'
import { motDePasse as schemaMotDePasse } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { Champ } from '../../components/Champ'
import { ErreurApi } from '../../lib/api'
import { useDefinirMotDePasse, useRetirerMotDePasse } from './requetes'

/** Réglages › Mot de passe : définir, changer ou retirer. Changer et retirer demandent l'ancien mot de passe. */
export function MotDePasseCompte({ utilisateur }: { utilisateur: Utilisateur }) {
  const definir = useDefinirMotDePasse()
  const retirer = useRetirerMotDePasse()
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

  function surErreur(e: Error) {
    setErreurs(e instanceof ErreurApi ? { ...(e.champs ?? {}), ...(e.champs ? {} : { _: e.message }) } : { _: 'Erreur inattendue. Réessaie.' })
  }

  function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    const lu = schemaMotDePasse.safeParse(nouveau)
    if (!lu.success) return setErreurs({ nouveau: lu.error.issues[0]!.message })
    setErreurs({})
    definir.mutate(
      { id: utilisateur.id, ...(utilisateur.protege ? { actuel } : {}), nouveau },
      {
        onSuccess: () => {
          toast(utilisateur.protege ? 'Mot de passe changé.' : 'Mot de passe défini.')
          fermer()
        },
        onError: (e) => setErreurs(e instanceof ErreurApi && e.champs?.motDePasse ? { actuel: e.champs.motDePasse } : { _: e.message }),
      },
    )
  }

  function retrait() {
    if (!actuel) return setErreurs({ actuel: 'Entre ton mot de passe.' })
    retirer.mutate(
      { id: utilisateur.id, motDePasse: actuel },
      {
        onSuccess: () => {
          toast('Mot de passe retiré.')
          fermer()
        },
        onError: (e) => (e instanceof ErreurApi && e.champs?.motDePasse ? setErreurs({ actuel: e.champs.motDePasse }) : surErreur(e)),
      },
    )
  }

  return (
    <Carte titre="Mot de passe">
      <p className="text-texte-sm text-gris">{utilisateur.protege ? 'Ce compte est protégé.' : 'Aucun. Tout le monde sur cet ordinateur peut ouvrir ce compte.'}</p>
      {!ouvert ? (
        <Bouton variante="teinte" taille="md" className="mt-5 w-full" onClick={() => setOuvert(true)}>
          {utilisateur.protege ? 'Changer ou retirer' : 'Définir un mot de passe'}
        </Bouton>
      ) : (
        <form onSubmit={enregistrer} noValidate className="mt-5 flex flex-col gap-4">
          {utilisateur.protege && <Champ libelle="Mot de passe actuel" type="password" autoComplete="current-password" value={actuel} onChange={(e) => setActuel(e.target.value)} erreur={erreurs.actuel} />}
          <Champ libelle="Nouveau mot de passe" type="password" autoComplete="new-password" aide="8 caractères au moins." value={nouveau} onChange={(e) => setNouveau(e.target.value)} erreur={erreurs.nouveau} />
          {erreurs._ && <p role="alert" className="text-texte-sm text-alerte">{erreurs._}</p>}
          <div className="flex flex-wrap gap-2">
            <Bouton type="submit" taille="md" chargement={definir.isPending}>
              Enregistrer
            </Bouton>
            {utilisateur.protege && (
              <Bouton variante="contour" taille="md" chargement={retirer.isPending} onClick={retrait}>
                Retirer
              </Bouton>
            )}
            <Bouton variante="contour" taille="md" onClick={fermer}>
              Annuler
            </Bouton>
          </div>
        </form>
      )}
    </Carte>
  )
}
