import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnimations } from '../../state/animations'
import { InfobulleGraphique } from './InfobulleGraphique'
import { COULEURS, STYLE_AXE, montant, montantCourt } from './theme'

export interface PointRythmeGraphique {
  /** Jour, ex. « 5 oct. ». */
  jour: string
  /** Charges prévues cumulées, en centimes. */
  prevu: number
  /** Sorties réelles cumulées, en centimes ; absent après aujourd'hui. */
  reel?: number
}

const SERIES = [
  { cle: 'reel', libelle: 'Dépensé (réel)', couleur: COULEURS.serieUniqueFonce, pointille: false },
  { cle: 'prevu', libelle: 'Prévu cumulé', couleur: COULEURS.hachure, pointille: true },
] as const

/**
 * Rythme du mois (ux-ui.md (UX) § 5.3) : sorties réelles cumulées (plein) contre le prévu cumulé (pointillé).
 * Deux séries : légende toujours présente, une seule échelle.
 */
export function GraphiqueRythme({ points, libelle, hauteur = 220 }: { points: PointRythmeGraphique[]; libelle: string; hauteur?: number }) {
  const { animations } = useAnimations()
  return (
    <figure aria-label={libelle} className="w-full">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-mention text-encre-2" aria-label="Légende">
        {SERIES.map((s) => (
          <li key={s.cle} className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded-pilule"
              style={{ background: s.pointille ? 'transparent' : s.couleur, borderTop: s.pointille ? `2px dashed ${s.couleur}` : undefined }}
              aria-hidden
            />
            {s.libelle}
          </li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={hauteur}>
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="degrade-rythme" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COULEURS.serieUnique} stopOpacity={0.24} />
              <stop offset="100%" stopColor={COULEURS.serieUnique} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={COULEURS.axe} />
          <XAxis dataKey="jour" {...STYLE_AXE} dy={8} minTickGap={24} />
          <YAxis {...STYLE_AXE} width={44} tickFormatter={montantCourt} />
          <Line type="stepAfter" dataKey="prevu" stroke={COULEURS.hachure} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={animations} />
          <Area type="stepAfter" dataKey="reel" stroke={COULEURS.serieUniqueFonce} strokeWidth={2} fill="url(#degrade-rythme)" dot={false} isAnimationActive={animations} connectNulls={false} />
          <Tooltip
            cursor={{ stroke: COULEURS.aujourdhui, strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload ? (
                <InfobulleGraphique
                  titre={String(label)}
                  lignes={SERIES.flatMap((s) => {
                    const v = payload.find((p) => p.dataKey === s.cle)?.value
                    return typeof v === 'number' ? [{ cle: s.cle, libelle: s.libelle, valeur: montant(v), couleur: s.couleur, pointille: s.pointille }] : []
                  })}
                />
              ) : null
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  )
}
