import type { ReactNode } from 'react'

export interface LigneInfobulle {
  cle: string
  libelle: string
  valeur: string
  couleur: string
  /** Trait pointillé = prévu ou projeté. */
  pointille?: boolean
}

/** Infobulle en verre sombre : date, valeurs, nature (ux-ui.md (UI) § 8). Le texte reste en encre, la couleur est sur la pastille. */
export function InfobulleGraphique({ titre, lignes, note }: { titre: string; lignes: LigneInfobulle[]; note?: ReactNode }) {
  if (lignes.length === 0) return null
  return (
    <div className="verre-sombre min-w-[180px] rounded-md px-3 py-2.5 text-mention shadow-flottant">
      <div className="mb-1.5 text-white/75">{titre}</div>
      {lignes.map((l) => (
        <div key={l.cle} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2">
            <span
              className="h-0.5 w-3 rounded-pilule"
              style={{ background: l.pointille ? 'transparent' : l.couleur, borderTop: l.pointille ? `2px dashed ${l.couleur}` : undefined }}
              aria-hidden
            />
            {l.libelle}
          </span>
          <span className="chiffres font-semibold">{l.valeur}</span>
        </div>
      ))}
      {note && <div className="mt-1.5 text-white/70">{note}</div>}
    </div>
  )
}
