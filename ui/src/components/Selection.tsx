import { AlertCircle } from 'lucide-react'
import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export const styleSelect =
  'h-[46px] w-full rounded-champ border border-filet bg-white px-4 text-texte font-medium text-encre hover:border-filet-fort ' +
  'focus:border-primaire focus:shadow-focus focus:outline-none aria-[invalid=true]:border-alerte'

/** Liste déroulante dans le dessin des champs du template, avec libellé et message d'erreur. */
export function Selection({
  libelle,
  erreur,
  aide,
  className,
  children,
  ...reste
}: SelectHTMLAttributes<HTMLSelectElement> & { libelle: string; erreur?: string; aide?: ReactNode }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-texte-sm text-gris">
        {libelle}
      </label>
      <select id={id} aria-invalid={Boolean(erreur) || undefined} aria-describedby={erreur || aide ? `${id}-message` : undefined} className={styleSelect} {...reste}>
        {children}
      </select>
      {erreur ? (
        <p id={`${id}-message`} className="flex items-center gap-1 text-mention text-alerte">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {erreur}
        </p>
      ) : (
        aide && (
          <p id={`${id}-message`} className="text-mention text-gris">
            {aide}
          </p>
        )
      )}
    </div>
  )
}

/** Choix unique en pilules, accessible au clavier comme des boutons radio. */
export function Choix<T extends string>({
  libelle,
  valeur,
  options,
  onChange,
  aide,
}: {
  libelle: string
  valeur: T
  options: { valeur: T; libelle: string }[]
  onChange: (v: T) => void
  aide?: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-texte-sm text-gris" id={id}>
        {libelle}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.valeur}
            type="button"
            role="radio"
            aria-checked={valeur === o.valeur}
            onClick={() => onChange(o.valeur)}
            className={cn(
              'h-9 rounded-pilule px-4 text-texte-sm font-medium shadow-bouton transition-colors',
              valeur === o.valeur ? 'bg-lien text-white' : 'bg-white text-encre hover:bg-teinte',
            )}
          >
            {o.libelle}
          </button>
        ))}
      </div>
      {aide && <span className="text-mention text-gris">{aide}</span>}
    </div>
  )
}

/** Mois cochables (janv. → déc.) pour la fréquence « certains mois ». */
export function ChoixMois({ valeur, onChange, erreur }: { valeur: number[]; onChange: (mois: number[]) => void; erreur?: string }) {
  const noms = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-texte-sm text-gris">Mois</legend>
      <div className="grid grid-cols-6 gap-2">
        {noms.map((nom, i) => {
          const actif = valeur.includes(i + 1)
          return (
            <button
              key={nom}
              type="button"
              aria-pressed={actif}
              onClick={() => onChange(actif ? valeur.filter((m) => m !== i + 1) : [...valeur, i + 1].sort((a, b) => a - b))}
              className={cn('h-9 rounded-pilule text-texte-sm font-medium shadow-bouton', actif ? 'bg-lien text-white' : 'bg-white text-encre hover:bg-teinte')}
            >
              {nom}
            </button>
          )
        })}
      </div>
      {erreur && <span className="text-mention text-alerte">{erreur}</span>}
    </fieldset>
  )
}
