import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Etape {
  libelle: string
  chemin?: string
}

/** Fil d'Ariane du template : premier segment coloré, suite en gris, détail final plus marqué. */
export function FilAriane({ etapes, detail, action }: { etapes: Etape[]; detail?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 lg:mb-8">
      <nav aria-label="Fil d’Ariane" className="text-texte">
        {etapes.map((e, i) => (
          <span key={e.libelle}>
            {i > 0 && <span className="mx-1.5 text-gris-icone">/</span>}
            {e.chemin ? (
              <Link to={e.chemin} className="font-medium text-lien hover:underline">
                {e.libelle}
              </Link>
            ) : (
              <span className="text-gris">{e.libelle}</span>
            )}
          </span>
        ))}
        {detail && <span className="ml-1 font-medium text-gris">({detail})</span>}
      </nav>
      {action}
    </div>
  )
}
