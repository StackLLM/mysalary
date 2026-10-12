import { AlertTriangle, CheckCircle2, CircleDashed, Info, XCircle } from 'lucide-react'
import { cn } from '../lib/cn'

export type Nature = 'reel' | 'prevu' | 'projete' | 'importe'

const NATURES: Record<Exclude<Nature, 'reel'>, { texte: string; style: string }> = {
  prevu: { texte: 'prévu', style: 'border border-filet-fort text-gris' },
  projete: { texte: 'projection', style: 'hachure bg-sauge-50 text-sauge-700' },
  importe: { texte: 'importé · à confirmer', style: 'bg-attention-fond text-attention' },
}

/**
 * Grammaire réel / prévu / projeté (ux-ui.md (UX) § 9). Le réel n'a pas de badge :
 * c'est l'état normal d'un chiffre.
 */
export function BadgeNature({ nature, className }: { nature: Nature; className?: string }) {
  if (nature === 'reel') return null
  const { texte, style } = NATURES[nature]
  return (
    <span className={cn('inline-flex items-center rounded-pilule px-2 py-0.5 text-mention', style, className)}>
      {texte}
    </span>
  )
}

export type Risque = 'sur' | 'probable' | 'fragile' | 'horsPortee'

const RISQUES = {
  sur: { texte: 'Sûr', style: 'bg-positif-fond text-positif', Icone: CheckCircle2 },
  probable: { texte: 'Probable', style: 'bg-info-fond text-info', Icone: Info },
  fragile: { texte: 'Fragile', style: 'bg-attention-fond text-attention', Icone: AlertTriangle },
  horsPortee: { texte: 'Hors de portée', style: 'bg-alerte-fond text-alerte', Icone: XCircle },
} as const

/** Risque de retard d'un objectif : toujours icône + libellé, jamais la couleur seule. */
export function BadgeRisque({ risque, className }: { risque: Risque; className?: string }) {
  const { texte, style, Icone } = RISQUES[risque]
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-pilule px-2.5 py-1 text-mention', style, className)}>
      <Icone className="h-3.5 w-3.5" aria-hidden />
      {texte}
    </span>
  )
}

/** Mention « exemple » obligatoire sur toute donnée de démonstration (produit.md (Plan) § 7.6). */
export function BadgeExemple({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-pilule bg-teinte px-2 py-0.5 text-mention text-gris', className)}>
      <CircleDashed className="h-3 w-3" aria-hidden />
      exemple
    </span>
  )
}
