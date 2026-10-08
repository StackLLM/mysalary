import { MoreHorizontal } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

interface ProprietesCarte extends HTMLAttributes<HTMLElement> {
  titre?: ReactNode
  /** Précision grise à côté du titre, ex. « (MAD) » comme « Amount Due (USD) ». */
  precision?: ReactNode
  action?: ReactNode
  /** Affiche le menu « ••• » gris du template. */
  menu?: boolean
  espacement?: 'large' | 'normal'
}

/** Carte blanche du template : rayon 24, ombre presque invisible, titre + menu « ••• ». */
export function Carte({ titre, precision, action, menu, espacement = 'normal', className, children, ...reste }: ProprietesCarte) {
  return (
    <section
      className={cn('rounded-carte bg-white shadow-carte', espacement === 'large' ? 'p-5 sm:p-[30px]' : 'p-5 sm:p-6', className)}
      {...reste}
    >
      {(titre || action || menu) && (
        <header className="mb-5 flex items-center justify-between gap-3">
          {titre && (
            <h2 className="text-titre-carte text-encre">
              {titre}
              {precision && <span className="ml-1 text-gris">{precision}</span>}
            </h2>
          )}
          {action}
          {menu && !action && (
            <button type="button" aria-label="Plus d’options" className="-mr-1 rounded-pilule p-1 text-gris-icone hover:text-encre">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          )}
        </header>
      )}
      {children}
    </section>
  )
}

/** Titre de section dans une carte : « Item Detail » + sous-titre gris, action à droite. */
export function TitreSection({ titre, sousTitre, action }: { titre: string; sousTitre?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-titre-carte font-semibold text-encre">{titre}</h3>
        {sousTitre && <p className="mt-1 text-texte-sm text-gris">{sousTitre}</p>}
      </div>
      {action}
    </div>
  )
}

export function Separateur({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-filet', className)} />
}
