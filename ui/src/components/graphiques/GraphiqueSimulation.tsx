import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnimations } from '../../state/animations'
import { InfobulleGraphique, type LigneInfobulle } from './InfobulleGraphique'
import { COULEURS, montant, montantCourt, STYLE_AXE } from './theme'

export interface PointSimulationGraphique {
  periode: string
  /** Réel : épargne à la fin du mois passé (et aujourd'hui). */
  reel?: number
  prudent?: number
  realiste?: number
  ambitieux?: number
}

/**
 * Les trois scénarios : couleurs de la palette validée (lot 2 ; validateur dataviz OK pour ce trio),
 * et un tracé différent pour ne jamais dépendre de la couleur seule.
 */
export const SERIES_SCENARIOS = [
  { cle: 'prudent', libelle: 'Prudent', couleur: COULEURS.depenses, tirets: '2 4' },
  { cle: 'realiste', libelle: 'Réaliste', couleur: COULEURS.epargne, tirets: '6 4' },
  { cle: 'ambitieux', libelle: 'Ambitieux', couleur: COULEURS.revenus, tirets: '10 4' },
] as const

/**
 * Épargne simulée (UX.md § 4.5, § 9) : réel passé en trait plein, futur projeté hachuré (réaliste)
 * et en pointillés (prudent, ambitieux). Ligne zéro visible : une épargne négative se voit.
 */
export function GraphiqueSimulation({ points, aujourdhui, libelle, hauteur = 280 }: { points: PointSimulationGraphique[]; aujourdhui: string; libelle: string; hauteur?: number }) {
  const { animations } = useAnimations()
  return (
    <figure aria-label={libelle} className="w-full">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-mention text-gris" aria-label="Légende">
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-pilule" style={{ background: COULEURS.cible }} aria-hidden />
          Réel
        </li>
        {SERIES_SCENARIOS.map((s) => (
          <li key={s.cle} className="flex items-center gap-2">
            <svg width="16" height="4" aria-hidden>
              <line x1="0" y1="2" x2="16" y2="2" stroke={s.couleur} strokeWidth="2" strokeDasharray={s.tirets} />
            </svg>
            {s.libelle} <span className="text-gris/80">(projection)</span>
          </li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={hauteur}>
        <ComposedChart data={points} margin={{ top: 30, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <pattern id="hachure-simulation" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={COULEURS.hachure} strokeWidth="1.5" strokeOpacity="0.5" />
            </pattern>
          </defs>
          <CartesianGrid vertical={false} stroke={COULEURS.axe} />
          <XAxis dataKey="periode" {...STYLE_AXE} dy={8} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...STYLE_AXE} width={48} tickFormatter={montantCourt} />
          <ReferenceLine y={0} stroke={COULEURS.graduation} strokeWidth={1} />
          <ReferenceLine x={aujourdhui} stroke={COULEURS.aujourdhui} strokeWidth={1} label={{ value: 'Aujourd’hui', position: 'top', fill: COULEURS.graduation, fontSize: 12 }} />
          <Area
            dataKey="realiste"
            type="monotone"
            stroke={COULEURS.epargne}
            strokeWidth={2}
            strokeDasharray="6 4"
            fill="url(#hachure-simulation)"
            isAnimationActive={animations}
            animationDuration={600}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
          {SERIES_SCENARIOS.filter((s) => s.cle !== 'realiste').map((s) => (
            <Line
              key={s.cle}
              dataKey={s.cle}
              type="monotone"
              stroke={s.couleur}
              strokeWidth={2}
              strokeDasharray={s.tirets}
              dot={false}
              isAnimationActive={animations}
              animationDuration={600}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
          ))}
          <Line dataKey="reel" type="monotone" stroke={COULEURS.cible} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={animations} animationDuration={600} />
          <Tooltip
            cursor={{ stroke: COULEURS.aujourdhui, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              const point = active ? (payload?.[0]?.payload as PointSimulationGraphique | undefined) : undefined
              if (!point) return null
              const lignes: LigneInfobulle[] = []
              if (point.reel !== undefined) lignes.push({ cle: 'reel', libelle: 'Réel', valeur: montant(point.reel), couleur: COULEURS.cible })
              for (const s of SERIES_SCENARIOS) {
                const v = point[s.cle]
                if (v !== undefined && point.reel === undefined) lignes.push({ cle: s.cle, libelle: s.libelle, valeur: montant(v), couleur: s.couleur, pointille: true })
              }
              return <InfobulleGraphique titre={String(label)} lignes={lignes} note={point.reel === undefined ? 'Projection : hypothèse, pas une garantie.' : undefined} />
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">
        {libelle}.{' '}
        {points
          .map((p) => (p.reel !== undefined ? `${p.periode} : ${montant(p.reel)} (réel)` : `${p.periode} : réaliste ${montant(p.realiste ?? 0)}, prudent ${montant(p.prudent ?? 0)}, ambitieux ${montant(p.ambitieux ?? 0)}`))
          .join(' ; ')}
        .
      </figcaption>
    </figure>
  )
}
