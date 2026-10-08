import { Plus } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'
import { DESTINATIONS } from '../lib/navigation'

const [aujourdhui, mois, , objectifs, , plan] = DESTINATIONS

/** Sous 1024 px, les liens de l'en-tête passent dans une barre blanche en bas. */
export function BarreOngletsMobile({ onSaisie }: { onSaisie: () => void }) {
  const lien = (d: (typeof DESTINATIONS)[number] | undefined) =>
    d && (
      <NavLink
        to={d.chemin}
        end={d.chemin === '/'}
        className={({ isActive }) =>
          cn('flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-medium', isActive ? 'text-lien' : 'text-gris')
        }
      >
        {({ isActive }) => (
          <>
            <d.Icone className={cn('h-5 w-5', isActive ? 'text-primaire' : 'text-gris-icone')} />
            {d.libelle}
          </>
        )}
      </NavLink>
    )

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t border-filet bg-white px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 lg:hidden">
      {lien(aujourdhui)}
      {lien(mois)}
      <button
        type="button"
        onClick={onSaisie}
        aria-label="Saisie rapide"
        className="-mt-7 grid h-14 w-14 shrink-0 place-items-center rounded-pilule bg-primaire text-white shadow-flottant active:scale-95"
      >
        <Plus className="h-6 w-6" strokeWidth={2.4} />
      </button>
      {lien(objectifs)}
      {lien(plan)}
    </nav>
  )
}
