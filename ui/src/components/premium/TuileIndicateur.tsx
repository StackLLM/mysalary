import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { BadgeNature, type Nature } from '../Badges'
import { CarteLumineuse } from './CarteLumineuse'

const TONS = {
  neutre: 'bg-sauge-100 text-sauge-700',
  positif: 'bg-positif-fond text-positif',
  attention: 'bg-attention-fond text-attention',
  alerte: 'bg-alerte-fond text-alerte',
} as const

/**
 * Indicateur clé en tuile : icône teintée, libellé, valeur forte, détail. La nature est affichée si ce n'est pas du réel.
 * Pour les rangées d'indicateurs des tableaux de bord (Aujourd'hui, Objectifs).
 */
export function TuileIndicateur({
  libelle,
  valeur,
  detail,
  icone,
  ton = 'neutre',
  nature = 'reel',
  visuel,
  className,
}: {
  libelle: string
  valeur: ReactNode
  detail?: ReactNode
  icone: ReactNode
  ton?: keyof typeof TONS
  nature?: Nature
  /** Remplace l'icône : anneau, mini-graphique. */
  visuel?: ReactNode
  className?: string
}) {
  return (
    <CarteLumineuse className={cn('flex min-w-0 items-start gap-4 p-4 sm:p-5', className)}>
      {/* Sur téléphone, deux tuiles par ligne : le visuel laisse la place au chiffre. */}
      <span className="hidden sm:block">{visuel ?? <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', TONS[ton])}>{icone}</span>}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-texte-sm text-gris">{libelle}</span>
          <BadgeNature nature={nature} />
        </div>
        <div className="mt-1 text-[20px] font-bold leading-7 tracking-tight text-encre sm:text-[26px] sm:leading-8">{valeur}</div>
        {detail && <div className="mt-1 text-mention text-gris sm:text-texte-sm">{detail}</div>}
      </div>
    </CarteLumineuse>
  )
}
