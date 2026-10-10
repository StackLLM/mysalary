import type { Variants } from 'framer-motion'

/** Variantes partagées (recette de la skill UI-Stealer, UI.md § 9). */
export const conteneurCascade: Variants = {
  cache: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export const elementApparition: Variants = {
  cache: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 24 } },
}
