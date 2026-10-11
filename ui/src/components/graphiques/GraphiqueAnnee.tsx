import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnimations } from '../../state/animations'
import { InfobulleGraphique } from './InfobulleGraphique'
import { COULEURS, STYLE_AXE, montant, montantCourt } from './theme'

export interface PointAnnee {
  periode: string
  /** Mois terminé : barres pleines (réel). Mois en cours ou à venir : hachurées (en cours, prévu). */
  reel: boolean
  nature: string
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
 * Revenus, dépenses et épargne des douze mois (UX.md § 4.8, § 9) : barres pleines pour le réel,
 * hachurées pour le mois en cours (estimation) et les mois prévus ; une seule échelle ; légende et tableau texte.
 */
export function GraphiqueAnnee({ points, libelle, hauteur = 280 }: { points: PointAnnee[]; libelle: string; hauteur?: number }) {
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
        <li className="flex items-center gap-1.5 text-gris">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-gris" aria-hidden />
          Plein : réel
        </li>
        <li className="flex items-center gap-1.5 text-gris">
          <span className="hachure h-2.5 w-2.5 rounded-[3px] border border-gris" aria-hidden />
          Hachuré : en cours ou prévu
        </li>
      </ul>
      <ResponsiveContainer width="100%" height={hauteur}>
        <BarChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
          <defs>
            {SERIES.map((s) => (
              <pattern key={s.cle} id={`hachure-${s.cle}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill={s.couleur} fillOpacity="0.12" />
                <line x1="0" y1="0" x2="0" y2="6" stroke={s.couleur} strokeWidth="2" strokeOpacity="0.7" />
              </pattern>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke={COULEURS.axe} />
          <XAxis dataKey="periode" {...STYLE_AXE} dy={8} interval={0} />
          <YAxis {...STYLE_AXE} width={44} tickFormatter={montantCourt} />
          {SERIES.map((s) => (
            <Bar key={s.cle} dataKey={s.cle} name={s.libelle} radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={animations} animationDuration={600}>
              {points.map((p) => (
                <Cell key={p.periode} fill={p.reel ? s.couleur : `url(#hachure-${s.cle})`} stroke={s.couleur} strokeWidth={p.reel ? 0 : 1.2} />
              ))}
            </Bar>
          ))}
          <Tooltip
            cursor={{ fill: 'rgba(125,140,130,0.08)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload) return null
              const point = points.find((p) => p.periode === label)
              return (
                <InfobulleGraphique
                  titre={`${String(label)} · ${point?.nature ?? ''}`}
                  lignes={SERIES.map((s) => ({
                    cle: s.cle,
                    libelle: s.libelle,
                    couleur: s.couleur,
                    pointille: !point?.reel,
                    valeur: montant(Number(payload.find((p) => p.dataKey === s.cle)?.value ?? 0)),
                  }))}
                />
              )
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">
        {libelle}.{' '}
        {points.map((p) => `${p.periode} (${p.nature}) : revenus ${montant(p.revenus)}, dépenses ${montant(p.depenses)}, épargne ${montant(p.epargne)}`).join(' ; ')}.
      </figcaption>
    </figure>
  )
}
