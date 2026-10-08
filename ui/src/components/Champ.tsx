import { AlertCircle } from 'lucide-react'
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'

const styleSaisie =
  'h-[46px] w-full rounded-champ border border-filet bg-white px-4 text-texte font-medium text-encre transition-all duration-200 ' +
  'placeholder:font-normal placeholder:text-gris-icone hover:border-filet-fort focus:border-primaire focus:shadow-focus focus:outline-none ' +
  'aria-[invalid=true]:border-alerte'

interface ProprietesChamp extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  libelle: string
  /** Libellé masqué visuellement (cellule de tableau, comme dans le template). */
  libelleMasque?: boolean
  aide?: ReactNode
  erreur?: string
  /** Unité à gauche, grise, comme le « $ » du template. */
  prefixe?: ReactNode
}

/** Champ du template : blanc, bordure très claire, rayon 12, texte foncé. */
export const Champ = forwardRef<HTMLInputElement, ProprietesChamp>(function Champ(
  { libelle, libelleMasque, aide, erreur, prefixe, className, id, ...reste },
  ref,
) {
  const idAuto = useId()
  const idChamp = id ?? idAuto
  const idMessage = `${idChamp}-message`
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={idChamp} className={cn('text-texte-sm text-gris', libelleMasque && 'sr-only')}>
        {libelle}
      </label>
      <div className="relative">
        {prefixe && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-texte text-gris">{prefixe}</span>
        )}
        <input
          ref={ref}
          id={idChamp}
          aria-invalid={Boolean(erreur) || undefined}
          aria-describedby={erreur || aide ? idMessage : undefined}
          className={cn(styleSaisie, prefixe ? 'pl-11' : undefined)}
          {...reste}
        />
      </div>
      {erreur ? (
        <p id={idMessage} className="flex items-center gap-1 text-mention text-alerte">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {erreur}
        </p>
      ) : (
        aide && (
          <p id={idMessage} className="text-mention text-gris">
            {aide}
          </p>
        )
      )}
    </div>
  )
})

/** Champ montant : préfixe « DH » gris à gauche, chiffres tabulaires, clavier numérique. */
export const ChampMontant = forwardRef<HTMLInputElement, Omit<ProprietesChamp, 'prefixe' | 'type'>>(function ChampMontant(
  { className, ...reste },
  ref,
) {
  return <Champ ref={ref} inputMode="decimal" autoComplete="off" prefixe="DH" className={cn('[&_input]:chiffres', className)} {...reste} />
})

/** Cellule en lecture seule, même dessin qu'un champ du template (montants d'une ligne). */
export function Cellule({
  children,
  prefixe,
  attenue,
  titre,
  className,
}: {
  children: ReactNode
  prefixe?: string
  attenue?: boolean
  /** Texte complet au survol quand le contenu est tronqué. */
  titre?: string
  className?: string
}) {
  return (
    <div title={titre} className={cn('chiffres flex h-[46px] items-center gap-2.5 rounded-champ border border-filet bg-white px-4 text-texte', className)}>
      {prefixe && <span className="text-gris">{prefixe}</span>}
      <span className={cn('truncate font-semibold', attenue ? 'text-gris-icone' : 'text-encre')}>{children}</span>
    </div>
  )
}
