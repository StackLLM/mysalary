import { Area, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnimations } from '../../state/animations'
import { COULEURS, STYLE_AXE, montant, montantCourt } from './theme'
import { InfobulleGraphique, type LigneInfobulle } from './InfobulleGraphique'

export interface PointTrajectoire {
  /** Libellé court de la période, ex. « janv. ». */
  periode: string
  /** Cumul réel en centimes (jusqu'à aujourd'hui). */
  reel?: number
  /** Cumul projeté en centimes (à partir d'aujourd'hui ; le point de jonction porte les deux). */
  projete?: number
}

interface Proprietes {
  points: PointTrajectoire[]
  /** Montant cible en centimes. */
  cible: number
  /** Période où commence la projection (ligne « aujourd'hui »). */
  aujourdhui: string
  libelle: string
  hauteur?: number
}

/**
 * Trajectoire d'un objectif (ux-ui.md (UI) § 8) : réel plein, projection hachurée + pointillée, cible en pointillé.
 * Une seule série : pas de légende, le titre de la carte la nomme.
 */
export function GraphiqueTrajectoire({ points, cible, aujourdhui, libelle, hauteur = 240 }: Proprietes) {
  const { animations } = useAnimations()
  return (
    <figure aria-label={libelle} className="w-full">
      <ResponsiveContainer width="100%" height={hauteur}>
        <ComposedChart data={points} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="degrade-reel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COULEURS.serieUnique} stopOpacity={0.28} />
              <stop offset="100%" stopColor={COULEURS.serieUnique} stopOpacity={0} />
            </linearGradient>
            <pattern id="hachure-projection" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={COULEURS.hachure} strokeWidth="1.5" strokeOpacity="0.55" />
            </pattern>
          </defs>
          <CartesianGrid vertical={false} stroke={COULEURS.axe} />
          <XAxis dataKey="periode" {...STYLE_AXE} dy={8} />
          <YAxis {...STYLE_AXE} width={44} tickFormatter={montantCourt} />
          <ReferenceLine
            y={cible}
            stroke={COULEURS.cible}
            strokeDasharray="4 4"
            strokeWidth={1}
            ifOverflow="extendDomain"
            label={{ value: 'Cible', position: 'insideBottomRight', fill: COULEURS.cible, fontSize: 12 }}
          />
          <ReferenceLine
            x={aujourdhui}
            stroke={COULEURS.aujourdhui}
            strokeWidth={1}
            label={{ value: 'Aujourd’hui', position: 'top', fill: COULEURS.graduation, fontSize: 12 }}
          />
          <Area
            dataKey="projete"
            type="monotone"
            stroke={COULEURS.serieUnique}
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="url(#hachure-projection)"
            connectNulls={false}
            isAnimationActive={animations}
            animationDuration={600}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
          <Area
            dataKey="reel"
            type="monotone"
            stroke={COULEURS.serieUniqueFonce}
            strokeWidth={2}
            fill="url(#degrade-reel)"
            isAnimationActive={animations}
            animationDuration={600}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
          <Tooltip
            cursor={{ stroke: COULEURS.aujourdhui, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload) return null
              const point = payload[0]?.payload as PointTrajectoire | undefined
              if (!point) return null
              const lignes: LigneInfobulle[] = []
              if (point.reel !== undefined)
                lignes.push({ cle: 'reel', libelle: 'Épargné', valeur: montant(point.reel), couleur: COULEURS.serieUniqueFonce })
              if (point.projete !== undefined && point.reel === undefined)
                lignes.push({ cle: 'projete', libelle: 'Projection', valeur: montant(point.projete), couleur: COULEURS.serieUnique, pointille: true })
              lignes.push({ cle: 'cible', libelle: 'Cible', valeur: montant(cible), couleur: COULEURS.cible, pointille: true })
              return (
                <InfobulleGraphique
                  titre={String(label)}
                  lignes={lignes}
                  note={point.reel === undefined ? 'Projection : hypothèse, pas une garantie.' : undefined}
                />
              )
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">
        {libelle}. {points.map((p) => `${p.periode} : ${montant(p.reel ?? p.projete ?? 0)}${p.reel === undefined ? ' (projection)' : ''}`).join(' ; ')}.
        Cible : {montant(cible)}.
      </figcaption>
    </figure>
  )
}
