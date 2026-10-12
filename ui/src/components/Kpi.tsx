import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { BadgeNature, type Nature } from './Badges'

interface ProprietesKpi {
  libelle: string
  valeur: ReactNode
  /** Phrase de comparaison courte, ex. « 120 DH de mieux que prévu ». */
  comparaison?: string
  tendance?: 'favorable' | 'defavorable' | 'neutre'
  nature?: Nature
  className?: string
}

const TENDANCES = {
  favorable: { Icone: ArrowUpRight, style: 'text-positif' },
  defavorable: { Icone: ArrowDownRight, style: 'text-alerte' },
  neutre: { Icone: Minus, style: 'text-gris' },
} as const

/** Indicateur clé (ux-ui.md (UI) § 7.3). La nature est affichée si ce n'est pas du réel. */
export function Kpi({ libelle, valeur, comparaison, tendance = 'neutre', nature = 'reel', className }: ProprietesKpi) {
  const { Icone, style } = TENDANCES[tendance]
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <span className="text-texte-sm text-gris">{libelle}</span>
        <BadgeNature nature={nature} />
      </div>
      <div className="text-titre text-encre">{valeur}</div>
      {comparaison && (
        <div className={cn('flex items-center gap-1 text-mention', style)}>
          <Icone className="h-3.5 w-3.5" aria-hidden />
          {comparaison}
        </div>
      )}
    </div>
  )
}
