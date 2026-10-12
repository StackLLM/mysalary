import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnimations } from '../../state/animations'
import { COULEURS, STYLE_AXE, montant, montantCourt } from './theme'
import { InfobulleGraphique } from './InfobulleGraphique'

export interface PointFlux {
  periode: string
  revenus: number
  depenses: number
  epargne: number
}

const SERIES = [
  { cle: 'revenus', libelle: 'Revenus', couleur: COULEURS.revenus },
  { cle: 'depenses', libelle: 'Dépenses', couleur: COULEURS.depenses },
  { cle: 'epargne', libelle: 'Épargne', couleur: COULEURS.epargne },
] as const

/**
 * Revenus, dépenses, épargne par mois (ux-ui.md (UI) § 8) : barres groupées fines,
 * légende toujours présente (3 séries), une seule échelle.
 */
export function GraphiqueFlux({ points, libelle, hauteur = 260 }: { points: PointFlux[]; libelle: string; hauteur?: number }) {
  const { animations } = useAnimations()
  return (
    <figure aria-label={libelle} className="w-full">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-mention text-encre-2" aria-label="Légende">
        {SERIES.map((s) => (
          <li key={s.cle} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.couleur }} aria-hidden />
            {s.libelle}
          </li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={hauteur}>
        <BarChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={COULEURS.axe} />
          <XAxis dataKey="periode" {...STYLE_AXE} dy={8} />
          <YAxis {...STYLE_AXE} width={44} tickFormatter={montantCourt} />
          {SERIES.map((s) => (
            <Bar
              key={s.cle}
              dataKey={s.cle}
              name={s.libelle}
              fill={s.couleur}
              radius={[4, 4, 0, 0]}
              maxBarSize={14}
              isAnimationActive={animations}
              animationDuration={600}
            />
          ))}
          <Tooltip
            cursor={{ fill: 'rgba(125,140,130,0.08)' }}
            content={({ active, payload, label }) =>
              active && payload ? (
                <InfobulleGraphique
                  titre={String(label)}
                  lignes={SERIES.map((s) => ({
                    cle: s.cle,
                    libelle: s.libelle,
                    couleur: s.couleur,
                    valeur: montant(Number(payload.find((p) => p.dataKey === s.cle)?.value ?? 0)),
                  }))}
                />
              ) : null
            }
          />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">
        {libelle}. {points.map((p) => `${p.periode} : revenus ${montant(p.revenus)}, dépenses ${montant(p.depenses)}, épargne ${montant(p.epargne)}`).join(' ; ')}.
      </figcaption>
    </figure>
  )
}
