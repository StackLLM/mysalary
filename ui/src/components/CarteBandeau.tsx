import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface LigneBandeau {
  libelle?: string
  valeur: ReactNode
}

interface ProprietesBandeau {
  gauche: { titre: string; lignes: LigneBandeau[] }
  droite: { titre: string; lignes: LigneBandeau[] }
  className?: string
}

function Colonne({ titre, lignes, alignement }: { titre: string; lignes: LigneBandeau[]; alignement: 'gauche' | 'droite' }) {
  return (
    <div className={cn('flex flex-col gap-2.5', alignement === 'droite' && 'sm:items-end sm:text-right')}>
      <span className="text-texte font-semibold">{titre}</span>
      {lignes.map((l, i) => (
        <span key={i} className="chiffres text-texte">
          {l.libelle && <span className="text-white/85">{l.libelle} : </span>}
          <span className={cn(l.libelle && 'font-semibold')}>{l.valeur}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * Bandeau héro du template (« Invoice Number / Billed to ») : dégradé, grands cercles
 * translucides, deux colonnes de texte blanc alignées à gauche et à droite.
 */
export function CarteBandeau({ gauche, droite, className }: ProprietesBandeau) {
  return (
    <section className={cn('relative isolate overflow-hidden rounded-bandeau bg-bandeau p-6 text-white shadow-bandeau sm:px-[30px] sm:py-7', className)}>
      <span className="absolute -left-2 -top-28 -z-10 h-44 w-44 rounded-full bg-black/[0.14]" aria-hidden />
      <span className="absolute -top-40 left-[24%] -z-10 h-[420px] w-[420px] rounded-full bg-white/[0.035]" aria-hidden />
      <span className="absolute -right-24 -top-6 -z-10 h-[300px] w-[300px] rounded-full bg-bandeau-cercle/60" aria-hidden />
      <span className="absolute -bottom-20 -right-10 -z-10 h-40 w-40 rounded-full bg-bandeau-cercle/45" aria-hidden />
      <div className="grid gap-6 sm:grid-cols-2">
        <Colonne {...gauche} alignement="gauche" />
        <Colonne {...droite} alignement="droite" />
      </div>
    </section>
  )
}
