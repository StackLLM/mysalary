import type { Transition, Variants } from 'framer-motion'

/** Variantes partagées (recette de la skill UI-Stealer, UI.md § 9). */
export const conteneurCascade: Variants = {
  cache: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export const elementApparition: Variants = {
  cache: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 24 } },
}

export const transitionVue = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } satisfies Transition,
}

/** Version sans déplacement, utilisée quand les animations sont coupées. */
export const transitionVueSobre = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12 } satisfies Transition,
}
