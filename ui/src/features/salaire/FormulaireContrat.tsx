import { formaterMois, type RegleJourNonOuvre, type SaisieContrat } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { Interrupteur } from '../../components/Elements'
import { ErreurApi } from '../../lib/api'
import { apercuContrat, lireMontant, moisProposes, REGLES, versSaisie } from './saisie'

interface Proprietes {
  initial?: Partial<SaisieContrat>
  aujourdhui: string
  libelleBouton: string
  /** Champ « mois d'effet » masqué (correction d'une version existante). */
  sansMoisEffet?: boolean
  chargement?: boolean
  onEnregistrer: (saisie: SaisieContrat) => Promise<unknown>
}

const styleSelect =
  'h-[46px] w-full rounded-champ border border-filet bg-white px-4 text-texte font-medium text-encre hover:border-filet-fort focus:border-primaire focus:shadow-focus focus:outline-none'

/** Formulaire du contrat de salaire. La saisie est conservée si l'enregistrement échoue (UX.md § 7). */
export function FormulaireContrat({ initial, aujourdhui, libelleBouton, sansMoisEffet, chargement, onEnregistrer }: Proprietes) {
  const [montant, setMontant] = useState(initial?.montantNet ? versSaisie(initial.montantNet) : '')
  const [jour, setJour] = useState(String(initial?.jourHabituel ?? 27))
  const [moisEffet, setMoisEffet] = useState(initial?.moisEffet ?? aujourdhui.slice(0, 7))
  const [regle, setRegle] = useState<RegleJourNonOuvre>(initial?.regleJourNonOuvre ?? 'apres')
  const [suivant, setSuivant] = useState(initial?.financeMoisSuivant ?? true)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  const jourHabituel = Number(jour)
  const apercu = apercuContrat({ moisEffet, jourHabituel, regleJourNonOuvre: regle, financeMoisSuivant: suivant }, aujourdhui)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = lireMontant(montant)
    const problemes: Record<string, string> = {}
    if ('erreur' in lu) problemes.montantNet = lu.erreur
    if (!Number.isInteger(jourHabituel) || jourHabituel < 1 || jourHabituel > 31) problemes.jourHabituel = 'Le jour de paie va de 1 à 31.'
    if (!/^\d{4}-\d{2}$/.test(moisEffet)) problemes.moisEffet = 'Choisis un mois.'
    setErreurs(problemes)
    if (Object.keys(problemes).length > 0 || 'erreur' in lu) return
    try {
      await onEnregistrer({
        montantNet: lu.valeur,
        jourHabituel,
        regleJourNonOuvre: regle,
        financeMoisSuivant: suivant,
        moisEffet,
      })
    } catch (erreur) {
      setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' })
    }
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <ChampMontant
          libelle="Salaire net habituel"
          placeholder="10 000"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          erreur={erreurs.montantNet}
          aide="Ce qui arrive sur ton compte, primes non comprises."
        />
        <Champ
          libelle="Jour habituel de paie"
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={jour}
          onChange={(e) => setJour(e.target.value)}
          erreur={erreurs.jourHabituel}
          aide="31 = dernier jour du mois."
        />
        {!sansMoisEffet && (
          <label className="flex flex-col gap-1.5">
            <span className="text-texte-sm text-gris">À partir du mois financé</span>
            <select value={moisEffet} onChange={(e) => setMoisEffet(e.target.value)} className={styleSelect} aria-invalid={Boolean(erreurs.moisEffet) || undefined}>
              {moisProposes(aujourdhui, moisEffet).map((m) => (
                <option key={m} value={m}>
                  {formaterMois(m, { majuscule: true })}
                </option>
              ))}
            </select>
            {erreurs.moisEffet && <span className="text-mention text-alerte">{erreurs.moisEffet}</span>}
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-texte-sm text-gris">Si la paie tombe un week-end</span>
          <select value={regle} onChange={(e) => setRegle(e.target.value as RegleJourNonOuvre)} className={styleSelect}>
            {REGLES.map((r) => (
              <option key={r.valeur} value={r.valeur}>
                {r.libelle}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Interrupteur libelle="Cette paie sert à vivre le mois suivant" actif={suivant} onChange={setSuivant} />

      {apercu && (
        <p className="rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2" aria-live="polite">
          {apercu}
        </p>
      )}
      {erreurs._ && <p className="text-texte-sm font-medium text-alerte">{erreurs._}</p>}

      <Bouton type="submit" taille="md" chargement={chargement} className="self-start">
        {libelleBouton}
      </Bouton>
    </form>
  )
}
