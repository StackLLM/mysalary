import { GROUPES_CATEGORIE, type GroupeCategorie } from '@mysalary/partage'
import { useState } from 'react'
import { Bouton } from '../../components/Bouton'
import { Champ } from '../../components/Champ'
import { Choix, Selection } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { useCategories, useEnregistrerCategorie } from './requetes'
import { GROUPES } from './saisie'

const NOUVELLE = '__nouvelle'

/** Catégorie d'une charge, groupée par essentiel / flexible / engagement, avec création rapide. */
export function ChampCategorie({ valeur, onChange, erreur }: { valeur: string; onChange: (id: string) => void; erreur?: string }) {
  const categories = useCategories()
  const creer = useEnregistrerCategorie()
  const [creation, setCreation] = useState(false)
  const [libelle, setLibelle] = useState('')
  const [groupe, setGroupe] = useState<GroupeCategorie>('flexible')
  const [erreurCreation, setErreurCreation] = useState<string>()

  function ajouter() {
    creer.mutate(
      { libelle, groupe },
      {
        onSuccess: ({ id }) => {
          onChange(id)
          setCreation(false)
          setLibelle('')
          setErreurCreation(undefined)
        },
        onError: (e) => setErreurCreation(e instanceof ErreurApi ? (e.champs?.libelle ?? e.message) : 'Erreur inattendue.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Selection
        libelle="Catégorie"
        value={creation ? NOUVELLE : valeur}
        erreur={erreur}
        disabled={categories.isPending}
        onChange={(e) => (e.target.value === NOUVELLE ? setCreation(true) : (setCreation(false), onChange(e.target.value)))}
      >
        <option value="" disabled>
          {categories.isPending ? 'Chargement…' : 'Choisis une catégorie'}
        </option>
        {GROUPES_CATEGORIE.map((g) => (
          <optgroup key={g} label={GROUPES[g].libelle}>
            {(categories.data ?? [])
              .filter((c) => c.groupe === g)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
          </optgroup>
        ))}
        <option value={NOUVELLE}>+ Nouvelle catégorie…</option>
      </Selection>

      {creation && (
        <div className="flex flex-col gap-3 rounded-bouton border border-filet p-4">
          <Champ libelle="Nom de la catégorie" value={libelle} onChange={(e) => setLibelle(e.target.value)} erreur={erreurCreation} maxLength={40} />
          <Choix
            libelle="Groupe"
            valeur={groupe}
            onChange={setGroupe}
            options={GROUPES_CATEGORIE.map((g) => ({ valeur: g, libelle: GROUPES[g].libelle }))}
            aide={GROUPES[groupe].aide}
          />
          <div className="flex gap-2">
            <Bouton taille="sm" onClick={ajouter} chargement={creer.isPending} disabled={!libelle.trim()}>
              Créer
            </Bouton>
            <Bouton variante="contour" taille="sm" onClick={() => setCreation(false)}>
              Annuler
            </Bouton>
          </div>
        </div>
      )}
    </div>
  )
}
