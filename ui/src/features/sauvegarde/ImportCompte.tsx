import { useRef } from 'react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { ErreurApi } from '../../lib/api'
import { useImporterCompte } from './requetes'
import { lireFichierJson } from './saisie'

/** Importe un export MySalary : un nouveau compte, jamais un compte écrasé. */
export function ImportCompte() {
  const importer = useImporterCompte()
  const champ = useRef<HTMLInputElement>(null)

  async function choisi(fichier: File | undefined) {
    if (!fichier) return
    const contenu = await lireFichierJson(fichier)
    if (contenu === null) return void toast('Ce fichier n’est pas un export MySalary.')
    importer.mutate(contenu, {
      onSuccess: ({ utilisateur }) => toast(`Compte de ${utilisateur.prenom} importé.`),
      onError: (e) => toast(e instanceof ErreurApi ? e.message : 'L’import a échoué. Réessaie.'),
    })
    if (champ.current) champ.current.value = ''
  }

  return (
    <Carte titre="Importer un compte">
      <p className="text-texte-sm text-gris">Un export MySalary (.json) crée un nouveau compte.</p>
      <input ref={champ} type="file" accept="application/json,.json" aria-label="Fichier d’export" className="sr-only" tabIndex={-1} onChange={(e) => void choisi(e.target.files?.[0])} />
      <Bouton variante="teinte" taille="md" className="mt-5 w-full" chargement={importer.isPending} onClick={() => champ.current?.click()}>
        Choisir un fichier
      </Bouton>
    </Carte>
  )
}
