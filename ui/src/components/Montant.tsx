import { formaterMontant, type Devise } from '@mysalary/partage'
import { animate, useMotionValue, useMotionValueEvent } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useAnimations } from '../state/animations'
import { cn } from '../lib/cn'

interface ProprietesMontant {
  /** Montant en centimes. */
  valeur: number
  devise?: Devise
  className?: string
  /** Compteur animé vers la nouvelle valeur (ux-ui.md (UI) § 9). */
  anime?: boolean
  /** Sans « DH » : quand l'unité est déjà affichée à côté (préfixe d'une cellule). */
  sansDevise?: boolean
}

/**
 * Affiche un montant au format « 10 000 DH » : chiffres tabulaires, devise plus petite et discrète.
 * Les lecteurs d'écran reçoivent la valeur finale, jamais les étapes du compteur.
 */
export function Montant({ valeur, devise = 'MAD', className, anime = false, sansDevise = false }: ProprietesMontant) {
  const { animations } = useAnimations()
  const doitAnimer = anime && animations
  const mouvement = useMotionValue(doitAnimer ? 0 : valeur)
  const [affiche, setAffiche] = useState(doitAnimer ? 0 : valeur)
  const premier = useRef(true)

  useMotionValueEvent(mouvement, 'change', (v) => setAffiche(Math.round(v)))

  useEffect(() => {
    if (!doitAnimer) {
      mouvement.set(valeur)
      setAffiche(valeur)
      return
    }
    const controle = animate(mouvement, valeur, { duration: premier.current ? 0.9 : 0.6, ease: [0.16, 1, 0.3, 1] })
    premier.current = false
    return () => controle.stop()
  }, [valeur, doitAnimer, mouvement])

  const texte = formaterMontant(affiche, devise)
  const separation = texte.lastIndexOf(' ')
  const nombre = texte.slice(0, separation)
  const symbole = texte.slice(separation + 1)

  return (
    <span className={cn('chiffres whitespace-nowrap', className)}>
      <span aria-hidden>
        {nombre}
        {!sansDevise && <span className="ml-[0.25em] text-[0.6em] font-medium opacity-60">{symbole}</span>}
      </span>
      <span className="sr-only">{formaterMontant(valeur, devise)}</span>
    </span>
  )
}
