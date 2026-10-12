import { MailWarning } from 'lucide-react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { ErreurApi } from '../../lib/api'
import { useRenvoyerVerification, useUtilisateurCourant } from './requetes'

/** Tant que l'adresse n'est pas confirmée : rappel en haut de l'app, avec le renvoi du lien. */
export function BandeauEmail() {
  const utilisateur = useUtilisateurCourant()
  const renvoyer = useRenvoyerVerification()
  if (!utilisateur?.email || utilisateur.emailVerifie) return null
  const email = utilisateur.email
  return (
    <div role="status" className="border-b border-filet bg-attention-fond">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-texte-sm text-attention lg:px-14">
        <MailWarning className="h-4 w-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          Confirme ton adresse <b className="break-all font-semibold">{email}</b> : elle te permet de retrouver ton compte si tu oublies ton mot de passe.
        </p>
        <Bouton
          variante="blanc"
          taille="sm"
          chargement={renvoyer.isPending}
          onClick={() =>
            renvoyer.mutate(undefined, {
              onSuccess: () => toast(`Lien envoyé à ${email}.`),
              onError: (e) => toast(e instanceof ErreurApi ? e.message : 'Envoi impossible. Réessaie.'),
            })
          }
        >
          Renvoyer le lien
        </Bouton>
      </div>
    </div>
  )
}
