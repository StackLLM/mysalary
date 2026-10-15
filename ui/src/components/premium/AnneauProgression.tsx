import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useAnimations } from '../../state/animations'

const borner = (v: number) => Math.min(1, Math.max(0, v))

/** Anneau de progression (part réelle de 0 à 1), le contenu au centre. Le trait se dessine à l'arrivée. */
export function AnneauProgression({ valeur, libelle, taille = 88, epaisseur = 8, children, className }: { valeur: number; libelle: string; taille?: number; epaisseur?: number; children?: ReactNode; className?: string }) {
  const { animations } = useAnimations()
  const rayon = (taille - epaisseur) / 2
  const tour = 2 * Math.PI * rayon
  const part = borner(valeur)
  return (
    <div
      role="progressbar"
      aria-label={libelle}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(part * 100)}
      className={cn('relative grid shrink-0 place-items-center', className)}
      style={{ width: taille, height: taille }}
    >
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={taille / 2} cy={taille / 2} r={rayon} fill="none" stroke="#E6ECE8" strokeWidth={epaisseur} />
        <motion.circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          stroke="#7D8C82"
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={tour}
          initial={{ strokeDashoffset: animations ? tour : tour * (1 - part) }}
          animate={{ strokeDashoffset: tour * (1 - part) }}
          transition={{ duration: animations ? 1 : 0, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  )
}
