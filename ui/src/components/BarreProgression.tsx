import { motion } from 'framer-motion'
import { cn } from '../lib/cn'

interface ProprietesBarre {
  /** Part réelle, de 0 à 1. */
  valeur: number
  /** Part projetée en plus du réel, de 0 à 1 (affichée hachurée). */
  projection?: number
  /** Où l'on devrait être aujourd'hui, de 0 à 1 (petit repère vertical). */
  rythme?: number
  libelle: string
  className?: string
}

const borner = (v: number) => Math.min(1, Math.max(0, v))

/** Barre de progression (UI.md § 7.8). */
export function BarreProgression({ valeur, projection = 0, rythme, libelle, className }: ProprietesBarre) {
  const reel = borner(valeur)
  const projete = borner(reel + projection) - reel
  return (
    <div
      role="progressbar"
      aria-label={libelle}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(reel * 100)}
      className={cn('relative h-2 w-full overflow-hidden rounded-pilule bg-sauge-100', className)}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-pilule bg-sauge"
        initial={{ width: 0 }}
        animate={{ width: `${reel * 100}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      {projete > 0 && (
        <div
          className="hachure absolute inset-y-0 rounded-r-pilule"
          style={{ left: `${reel * 100}%`, width: `${projete * 100}%` }}
          aria-hidden
        />
      )}
      {rythme !== undefined && (
        <div className="absolute inset-y-0 w-0.5 bg-encre-2" style={{ left: `${borner(rythme) * 100}%` }} aria-hidden />
      )}
    </div>
  )
}
