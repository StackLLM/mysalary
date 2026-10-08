import { MotionConfig } from 'framer-motion'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const CLE = 'mysalary.animations'

interface ContexteAnimations {
  animations: boolean
  /** Fixe la préférence (réglage du compte) et la retient sur l'appareil. */
  definir: (actives: boolean) => void
}

const Contexte = createContext<ContexteAnimations | null>(null)

function prefereMoinsDeMouvement() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

function lirePreference(): boolean | null {
  try {
    const valeur = localStorage.getItem(CLE)
    return valeur === null ? null : valeur === 'on'
  } catch {
    return null
  }
}

/**
 * Animations on / off (recette de la skill). Par défaut : suit `prefers-reduced-motion`.
 * Une fois un compte ouvert, son réglage « animations » fait foi ; il est aussi retenu sur l'appareil
 * pour l'écran Profils.
 */
export function FournisseurAnimations({ children }: { children: ReactNode }) {
  const [animations, setAnimations] = useState(() => lirePreference() ?? !prefereMoinsDeMouvement())

  useEffect(() => {
    const requete = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!requete) return
    const suivre = () => {
      if (lirePreference() === null) setAnimations(!requete.matches)
    }
    requete.addEventListener('change', suivre)
    return () => requete.removeEventListener('change', suivre)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('sans-animations', !animations)
  }, [animations])

  const valeur = useMemo<ContexteAnimations>(
    () => ({
      animations,
      definir: (actives) => {
        try {
          localStorage.setItem(CLE, actives ? 'on' : 'off')
        } catch {
          // Stockage indisponible : le choix vaut pour cette visite seulement.
        }
        setAnimations(actives)
      },
    }),
    [animations],
  )

  return (
    <Contexte.Provider value={valeur}>
      <MotionConfig reducedMotion={animations ? 'never' : 'always'}>{children}</MotionConfig>
    </Contexte.Provider>
  )
}

export function useAnimations() {
  const contexte = useContext(Contexte)
  if (!contexte) throw new Error('useAnimations hors de FournisseurAnimations')
  return contexte
}
