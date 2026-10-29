import { deMois, formaterDate, formaterMontant, type MoisCumul } from '@mysalary/partage'
import { useState } from 'react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { ChampMontant } from '../../components/Champ'
import { Fenetre } from '../../components/Fenetre'
import { Montant } from '../../components/Montant'
import { ErreurApi } from '../../lib/api'
import { lireMontant, versSaisie } from '../salaire/saisie'
import { useAnnulerCorrectionCumul, useCorrigerCumul } from './requetes'

/**
 * Correction du cumul (lot 35) : sur un mois terminé, l'utilisateur saisit le solde réel de son compte courant.
 * Ce solde devient le cumul du mois et le report du suivant ; l'écart avec le calcul reste affiché à part,
 * jamais transformé en dépense.
 */
export function CorrectionCumul({ cumul, ouvert, onFermer }: { cumul: MoisCumul & { cumulCalcule: number }; ouvert: boolean; onFermer: () => void }) {
  const corriger = useCorrigerCumul()
  const annuler = useAnnulerCorrectionCumul()
  const [montant, setMontant] = useState(cumul.ecart === null ? '' : versSaisie(cumul.cumul ?? 0))
  const [erreur, setErreur] = useState<string>()
  const de = deMois(cumul.cle)

  function enregistrer() {
    const lu = lireMontant(montant, -Number.MAX_SAFE_INTEGER)
    if ('erreur' in lu) return setErreur(lu.erreur)
    setErreur(undefined)
    corriger.mutate(
      { cle: cumul.cle, solde: lu.valeur },
      {
        onSuccess: () => {
          toast(`Cumul ${de} corrigé : ${formaterMontant(lu.valeur)}.`)
          onFermer()
        },
        onError: (e) => setErreur(e instanceof ErreurApi ? e.message : 'Correction impossible. Réessaie.'),
      },
    )
  }

  function retirer() {
    annuler.mutate(cumul.cle, {
      onSuccess: () => {
        toast(`Correction retirée : le cumul ${de} redevient celui calculé.`)
        onFermer()
      },
      onError: (e) => setErreur(e instanceof ErreurApi ? e.message : 'Annulation impossible. Réessaie.'),
    })
  }

  return (
    <Fenetre
      ouvert={ouvert}
      onFermer={onFermer}
      titre={`Solde réel fin ${de}`}
      description={`Ce qu’il y avait sur ton compte courant le ${formaterDate(cumul.fin)}, dernier jour du mois.`}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          enregistrer()
        }}
      >
        <p className="flex items-baseline justify-between gap-4 rounded-champ bg-teinte px-4 py-3 text-texte-sm">
          <span className="text-gris">Cumul calculé</span>
          <Montant valeur={cumul.cumulCalcule} className="font-semibold text-encre" />
        </p>
        <ChampMontant libelle="Solde réel du compte" value={montant} onChange={(e) => setMontant(e.target.value)} erreur={erreur} placeholder="0" autoFocus />
        <p className="text-mention text-gris">Il remplace le cumul de ce mois, et les mois suivants en partent. L’écart s’affiche à part : tes charges ne changent pas.</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {cumul.ecart !== null && (
            <Bouton type="button" variante="blanc" onClick={retirer} disabled={annuler.isPending || corriger.isPending} className="w-full sm:w-auto">
              Retirer la correction
            </Bouton>
          )}
          <Bouton type="submit" disabled={corriger.isPending || annuler.isPending} className="w-full sm:w-auto">
            Enregistrer
          </Bouton>
        </div>
      </form>
    </Fenetre>
  )
}
