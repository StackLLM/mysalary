import { useRef, type HTMLAttributes, type PointerEvent } from 'react'
import { cn } from '../../lib/cn'
import { useAnimations } from '../../state/animations'

/**
 * Carte blanche avec un halo sauge qui suit le pointeur.
 * Adapté de « Glowing Cards » de Lightswind UI (licence MIT, github.com/codewithMUHILAN/Lightswind-UI-Library) :
 * même principe (position du pointeur en variables CSS, dégradé radial), réduit à la charte de MySalary.
 * Sans animations (Réglages) ou au toucher : carte normale.
 */
export function CarteLumineuse({ className, children, onPointerMove, ...reste }: HTMLAttributes<HTMLDivElement>) {
  const { animations } = useAnimations()
  const ref = useRef<HTMLDivElement>(null)

  function suivre(e: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(e)
    if (!animations || e.pointerType !== 'mouse' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--x', `${e.clientX - r.left}px`)
    ref.current.style.setProperty('--y', `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={ref}
      onPointerMove={suivre}
      className={cn(
        'group/lumiere relative isolate overflow-hidden rounded-carte bg-white shadow-carte transition-shadow duration-300 hover:shadow-flottant',
        className,
      )}
      {...reste}
    >
      {animations && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/lumiere:opacity-100"
          style={{ background: 'radial-gradient(320px circle at var(--x, 50%) var(--y, 50%), rgba(125, 140, 130, 0.14), transparent 70%)' }}
        />
      )}
      {children}
    </div>
  )
}
