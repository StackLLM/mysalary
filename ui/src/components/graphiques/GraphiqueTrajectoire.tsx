import { motion } from 'framer-motion'
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useAnimations } from '../../state/animations'
import { COULEURS, montant, montantCourt } from './theme'
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

const MARGE = { haut: 34, droite: 18, bas: 30, gauche: 48 }

/** Pas « rond » (1, 2, 2,5, 5 × 10ⁿ) pour des graduations lisibles. */
function pasRond(max: number, graduations: number): number {
  const brut = max / graduations
  const puissance = 10 ** Math.floor(Math.log10(brut))
  const m = brut / puissance
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * puissance
}

/** Courbe lisse qui ne dépasse jamais ses points (interpolation monotone) : pas de creux ni de bosse inventés. */
function courbe(pts: { x: number; y: number }[]): string {
  const n = pts.length
  if (n === 0) return ''
  if (n === 1) return `M${pts[0]!.x},${pts[0]!.y}`
  const dx = pts.slice(1).map((p, i) => p.x - pts[i]!.x)
  const pentes = pts.slice(1).map((p, i) => (p.y - pts[i]!.y) / dx[i]!)
  const t = [pentes[0]!]
  for (let i = 1; i < n - 1; i++) t.push(pentes[i - 1]! * pentes[i]! <= 0 ? 0 : (pentes[i - 1]! + pentes[i]!) / 2)
  t.push(pentes[n - 2]!)
  for (let i = 0; i < n - 1; i++) {
    if (pentes[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = t[i]! / pentes[i]!
    const b = t[i + 1]! / pentes[i]!
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      t[i] = k * a * pentes[i]!
      t[i + 1] = k * b * pentes[i]!
    }
  }
  let d = `M${pts[0]!.x},${pts[0]!.y}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]! / 3
    d += ` C${pts[i]!.x + h},${pts[i]!.y + t[i]! * h} ${pts[i + 1]!.x - h},${pts[i + 1]!.y - t[i + 1]! * h} ${pts[i + 1]!.x},${pts[i + 1]!.y}`
  }
  return d
}

/**
 * Trajectoire d'un objectif (ux-ui.md (UI) § 8, lot 28) : tracé SVG sur mesure, sans bibliothèque.
 * Réel en trait plein sur un voile sauge, projection en pointillé sous un voile hachuré, cible en repère noir,
 * point « aujourd'hui » lumineux, survol avec repère et infobulle. Une seule série : pas de légende, le titre la nomme.
 */
export function GraphiqueTrajectoire({ points, cible, aujourdhui, libelle, hauteur = 260 }: Proprietes) {
  const { animations } = useAnimations()
  const id = useId().replace(/:/g, '')
  const conteneur = useRef<HTMLDivElement>(null)
  const [largeur, setLargeur] = useState(640)
  const [survol, setSurvol] = useState<number | null>(null)

  useEffect(() => {
    const el = conteneur.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entree]) => {
      const l = Math.floor(entree?.contentRect.width ?? 0)
      if (l > 0) setLargeur(l)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const geo = useMemo(() => {
    const valeurs = points.flatMap((p) => [p.reel, p.projete].filter((v): v is number => v !== undefined))
    const plafond = Math.max(cible, ...valeurs, 1)
    const pas = pasRond(plafond * 1.08, 4)
    const max = Math.ceil((plafond * 1.04) / pas) * pas
    const interieurL = Math.max(largeur - MARGE.gauche - MARGE.droite, 10)
    const interieurH = Math.max(hauteur - MARGE.haut - MARGE.bas, 10)
    const x = (i: number) => MARGE.gauche + (points.length > 1 ? (i / (points.length - 1)) * interieurL : interieurL / 2)
    const y = (v: number) => MARGE.haut + interieurH - (v / max) * interieurH
    const reel = points.flatMap((p, i) => (p.reel !== undefined ? [{ i, x: x(i), y: y(p.reel) }] : []))
    const projete = points.flatMap((p, i) => (p.projete !== undefined ? [{ i, x: x(i), y: y(p.projete) }] : []))
    const graduations = Array.from({ length: Math.round(max / pas) + 1 }, (_, k) => k * pas)
    const base = MARGE.haut + interieurH
    const aire = (pts: { x: number; y: number }[]) => (pts.length < 2 ? '' : `${courbe(pts)} L${pts.at(-1)!.x},${base} L${pts[0]!.x},${base} Z`)
    return {
      x,
      y,
      reel,
      projete,
      graduations,
      base,
      interieurL,
      trait: { reel: courbe(reel), projete: courbe(projete) },
      aire: { reel: aire(reel), projete: aire(projete) },
      jonction: points.findIndex((p) => p.periode === aujourdhui),
    }
  }, [points, cible, largeur, hauteur, aujourdhui])

  const ancre = geo.jonction >= 0 ? geo.reel.find((p) => p.i === geo.jonction) ?? geo.reel.at(-1) : geo.reel.at(-1)
  const courant = ancre ? points[ancre.i]?.reel : undefined
  const parPeriode = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const relatif = e.clientX - r.left - MARGE.gauche
    if (points.length < 2) return setSurvol(0)
    setSurvol(Math.min(points.length - 1, Math.max(0, Math.round((relatif / geo.interieurL) * (points.length - 1)))))
  }

  const actif = survol === null ? null : points[survol]
  const lignes: LigneInfobulle[] = []
  if (actif) {
    if (actif.reel !== undefined) lignes.push({ cle: 'reel', libelle: 'Épargné', valeur: montant(actif.reel), couleur: COULEURS.serieUniqueFonce })
    if (actif.projete !== undefined && actif.reel === undefined)
      lignes.push({ cle: 'projete', libelle: 'Projection', valeur: montant(actif.projete), couleur: COULEURS.serieUnique, pointille: true })
    lignes.push({ cle: 'cible', libelle: 'Cible', valeur: montant(cible), couleur: COULEURS.cible, pointille: true })
  }
  const valeurActive = actif ? actif.reel ?? actif.projete : undefined
  const gauche = survol === null ? 0 : geo.x(survol)
  const dernier = geo.projete.at(-1)

  return (
    <figure aria-label={libelle} className="w-full">
      <div ref={conteneur} className="relative w-full" style={{ height: hauteur }}>
        <svg
          width={largeur}
          height={hauteur}
          role="img"
          aria-hidden
          className="block touch-pan-y select-none overflow-visible"
          onPointerMove={parPeriode}
          onPointerDown={parPeriode}
          onPointerLeave={() => setSurvol(null)}
        >
          <defs>
            <linearGradient id={`${id}-reel`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COULEURS.serieUnique} stopOpacity={0.34} />
              <stop offset="70%" stopColor={COULEURS.serieUnique} stopOpacity={0.06} />
              <stop offset="100%" stopColor={COULEURS.serieUnique} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${id}-projete`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COULEURS.hachure} stopOpacity={0.4} />
              <stop offset="100%" stopColor={COULEURS.hachure} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${id}-trait`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={COULEURS.serieUnique} />
              <stop offset="100%" stopColor={COULEURS.serieUniqueFonce} />
            </linearGradient>
            <pattern id={`${id}-hachure`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke={COULEURS.hachure} strokeWidth="1" strokeOpacity="0.5" />
            </pattern>
            <filter id={`${id}-halo`} x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
            <clipPath id={`${id}-zone`}>
              <rect x={MARGE.gauche} y={0} width={geo.interieurL} height={hauteur} />
            </clipPath>
          </defs>

          {geo.graduations.map((g) => (
            <g key={g}>
              <line x1={MARGE.gauche} x2={MARGE.gauche + geo.interieurL} y1={geo.y(g)} y2={geo.y(g)} stroke={COULEURS.axe} strokeDasharray={g === 0 ? undefined : '2 5'} />
              <text x={MARGE.gauche - 10} y={geo.y(g)} dy="0.35em" textAnchor="end" fontSize={11} fill={COULEURS.graduation} className="chiffres">
                {montantCourt(g)}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            const pas = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(geo.interieurL / 52))))
            if (i % pas !== 0 && p.periode !== aujourdhui) return null
            // Le repère « Auj. » prime sur l'étiquette voisine, pour qu'elles ne se chevauchent pas.
            if (p.periode !== aujourdhui && Math.abs(i - geo.jonction) * (geo.interieurL / Math.max(1, points.length - 1)) < 36) return null
            return (
              <text key={p.periode + i} x={geo.x(i)} y={geo.base + 20} textAnchor="middle" fontSize={11} fill={p.periode === aujourdhui ? COULEURS.aujourdhui : COULEURS.graduation} fontWeight={p.periode === aujourdhui ? 700 : 400}>
                {p.periode}
              </text>
            )
          })}

          {geo.jonction >= 0 && (
            <line x1={geo.x(geo.jonction)} x2={geo.x(geo.jonction)} y1={MARGE.haut - 6} y2={geo.base} stroke={COULEURS.aujourdhui} strokeOpacity={0.35} strokeDasharray="1 4" strokeLinecap="round" />
          )}

          <g clipPath={`url(#${id}-zone)`}>
            {geo.aire.projete && (
              <motion.g initial={animations ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}>
                <path d={geo.aire.projete} fill={`url(#${id}-projete)`} />
                <path d={geo.aire.projete} fill={`url(#${id}-hachure)`} opacity={0.55} />
                <path d={geo.trait.projete} fill="none" stroke={COULEURS.serieUnique} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />
              </motion.g>
            )}
            {geo.aire.reel && (
              <motion.g initial={animations ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                <path d={geo.aire.reel} fill={`url(#${id}-reel)`} />
                <path d={geo.trait.reel} fill="none" stroke={COULEURS.serieUnique} strokeWidth={7} strokeOpacity={0.45} filter={`url(#${id}-halo)`} />
              </motion.g>
            )}
            {geo.trait.reel && (
              <motion.path
                d={geo.trait.reel}
                fill="none"
                stroke={`url(#${id}-trait)`}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={animations ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </g>

          {/* Cible : repère noir fin, étiquette pleine à droite. */}
          <g>
            <line x1={MARGE.gauche} x2={MARGE.gauche + geo.interieurL} y1={geo.y(cible)} y2={geo.y(cible)} stroke={COULEURS.cible} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round" />
            <g transform={`translate(${MARGE.gauche + geo.interieurL},${geo.y(cible)})`}>
              <rect x={-92} y={-11} width={92} height={22} rx={11} fill={COULEURS.cible} />
              <text x={-46} y={0} dy="0.35em" textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff" className="chiffres">
                Cible {montantCourt(cible)}
              </text>
            </g>
          </g>

          {dernier && !actif && (
            <circle cx={dernier.x} cy={dernier.y} r={3.5} fill="#fff" stroke={COULEURS.serieUnique} strokeWidth={2} />
          )}

          {ancre && (
            <g>
              {animations && (
                <circle cx={ancre.x} cy={ancre.y} r={6} fill={COULEURS.serieUnique} opacity={0.35}>
                  <animate attributeName="r" values="6;16;6" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={ancre.x} cy={ancre.y} r={6.5} fill={COULEURS.serieUniqueFonce} stroke="#fff" strokeWidth={2.5} />
              {courant !== undefined && (
                <g transform={`translate(${Math.min(Math.max(ancre.x, MARGE.gauche + 46), MARGE.gauche + geo.interieurL - 46)},${ancre.y - 20})`}>
                  <rect x={-44} y={-12} width={88} height={22} rx={11} fill="#fff" stroke={COULEURS.serieUniqueFonce} strokeOpacity={0.35} />
                  <text x={0} y={0} dy="0.1em" textAnchor="middle" fontSize={11} fontWeight={700} fill={COULEURS.serieUniqueFonce} className="chiffres">
                    {montantCourt(courant)} DH
                  </text>
                </g>
              )}
            </g>
          )}

          {actif && survol !== null && (
            <g pointerEvents="none">
              <line x1={gauche} x2={gauche} y1={MARGE.haut - 6} y2={geo.base} stroke={COULEURS.aujourdhui} strokeWidth={1} strokeOpacity={0.55} />
              {valeurActive !== undefined && (
                <circle cx={gauche} cy={geo.y(valeurActive)} r={5} fill="#fff" stroke={actif.reel !== undefined ? COULEURS.serieUniqueFonce : COULEURS.serieUnique} strokeWidth={2.5} />
              )}
            </g>
          )}
        </svg>

        {actif && survol !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10"
            style={{ left: Math.min(Math.max(gauche, 96), largeur - 96), transform: 'translateX(-50%)' }}
          >
            <InfobulleGraphique titre={actif.periode === aujourdhui ? 'Aujourd’hui' : actif.periode} lignes={lignes} note={actif.reel === undefined ? 'Projection : hypothèse, pas une garantie.' : undefined} />
          </div>
        )}
      </div>
      <figcaption className="sr-only">
        {libelle}. {points.map((p) => `${p.periode} : ${montant(p.reel ?? p.projete ?? 0)}${p.reel === undefined ? ' (projection)' : ''}`).join(' ; ')}.
        Cible : {montant(cible)}.
      </figcaption>
    </figure>
  )
}
