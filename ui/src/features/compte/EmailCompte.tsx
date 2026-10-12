import { email as schemaEmail } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { Champ } from '../../components/Champ'
import { ErreurApi } from '../../lib/api'
import { useChangerEmail, useRenvoyerVerification, useUtilisateurCourant } from './requetes'

/** Réglages › E-mail de connexion : adresse confirmée ou non ; la changer demande le mot de passe, puis le clic dans le lien envoyé à la nouvelle. */
export function EmailCompte() {
  const utilisateur = useUtilisateurCourant()
  const changer = useChangerEmail()
  const renvoyer = useRenvoyerVerification()
  const [ouvert, setOuvert] = useState(false)
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  function fermer() {
    setOuvert(false)
    setEmail('')
    setMotDePasse('')
    setErreurs({})
  }

  function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    const p: Record<string, string> = {}
    const lu = schemaEmail.safeParse(email)
    if (!lu.success) p.email = lu.error.issues[0]!.message
    if (!motDePasse) p.motDePasse = 'Entre ton mot de passe.'
    setErreurs(p)
    if (Object.keys(p).length > 0) return
    changer.mutate(
      { email, motDePasse },
      {
        onSuccess: (demande) => {
          toast(`Lien envoyé à ${demande.email}. Ton e-mail change quand tu l’ouvres.`)
          fermer()
        },
        onError: (e) => setErreurs(e instanceof ErreurApi && e.champs ? e.champs : { _: e instanceof ErreurApi ? e.message : 'Erreur inattendue. Réessaie.' }),
      },
    )
  }

  return (
    <Carte titre="E-mail de connexion">
      {!ouvert ? (
        <>
          {utilisateur?.email && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="min-w-0 break-all text-texte-sm text-encre">{utilisateur.email}</p>
              {utilisateur.emailVerifie ? <span className="rounded-pilule bg-positif-fond px-2.5 py-0.5 text-mention text-positif">Confirmé</span> : <span className="rounded-pilule bg-attention-fond px-2.5 py-0.5 text-mention text-attention">À confirmer</span>}
            </div>
          )}
          {utilisateur?.email && !utilisateur.emailVerifie && (
            <Bouton
              variante="contour"
              taille="md"
              className="mb-3 w-full"
              chargement={renvoyer.isPending}
              onClick={() =>
                renvoyer.mutate(undefined, {
                  onSuccess: () => toast(`Lien envoyé à ${utilisateur.email}.`),
                  onError: (e) => toast(e instanceof ErreurApi ? e.message : 'Envoi impossible. Réessaie.'),
                })
              }
            >
              Renvoyer le lien de confirmation
            </Bouton>
          )}
          <Bouton variante="teinte" taille="md" className="w-full" onClick={() => setOuvert(true)}>
            Changer l’e-mail
          </Bouton>
        </>
      ) : (
        <form onSubmit={enregistrer} noValidate className="flex flex-col gap-4">
          <Champ libelle="Nouvel e-mail" type="email" autoComplete="email" aide="Un lien de confirmation part vers cette adresse." value={email} onChange={(e) => setEmail(e.target.value)} erreur={erreurs.email} />
          <Champ libelle="Ton mot de passe" type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} erreur={erreurs.motDePasse} />
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
