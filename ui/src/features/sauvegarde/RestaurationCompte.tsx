import { useRef } from 'react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { ErreurApi } from '../../lib/api'
import { useRestaurerCompte } from './requetes'
import { lireFichierJson } from './saisie'

/** Réglages › Sauvegarde : restaurer un export MySalary dans ce compte, seulement s'il est vide (rien n'est écrasé). */
export function RestaurationCompte() {
  const restaurer = useRestaurerCompte()
  const champ = useRef<HTMLInputElement>(null)

  async function choisi(fichier: File | undefined) {
    if (!fichier) return
    const contenu = await lireFichierJson(fichier)
    if (champ.current) champ.current.value = ''
    if (contenu === null) return void toast('Ce fichier n’est pas un export MySalary.')
    restaurer.mutate(contenu, {
      onSuccess: ({ lignes }) => toast(`Sauvegarde restaurée : ${lignes} éléments.`),
      onError: (e) => toast(e instanceof ErreurApi ? e.message : 'La restauration a échoué. Réessaie.'),
    })
  }

  return (
    <Carte titre="Sauvegarde">
      <p className="text-texte-sm text-gris">Restaure un export MySalary (.json) dans ce compte, s’il est vide.</p>
      <input ref={champ} type="file" accept="application/json,.json" aria-label="Fichier d’export" className="sr-only" tabIndex={-1} onChange={(e) => void choisi(e.target.files?.[0])} />
      <Bouton variante="teinte" taille="md" className="mt-5 w-full" chargement={restaurer.isPending} onClick={() => champ.current?.click()}>
        Restaurer un export
      </Bouton>
    </Carte>
  )
}
