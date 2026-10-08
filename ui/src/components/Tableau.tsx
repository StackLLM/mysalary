import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface ColonneTableau<L> {
  cle: string
  titre: string
  rendu: (ligne: L) => ReactNode
  /** Les montants sont alignés à droite. */
  alignement?: 'gauche' | 'droite'
  /** Colonne secondaire masquée sur mobile (la ligne devient une carte compacte). */
  secondaire?: boolean
}

interface ProprietesTableau<L> {
  colonnes: ColonneTableau<L>[]
  lignes: L[]
  cleLigne: (ligne: L) => string
  total?: ReactNode[]
  legende: string
  className?: string
}

/** Tableau (UI.md § 7.9) : filets fins, sans zébrage, total séparé par un filet fort. */
export function Tableau<L>({ colonnes, lignes, cleLigne, total, legende, className }: ProprietesTableau<L>) {
  const droite = (c: ColonneTableau<L>) => c.alignement === 'droite'
  return (
    <div className={cn('relative -mx-1 overflow-x-auto', className)}>
      <table className="chiffres w-full border-collapse text-texte-sm">
        <caption className="sr-only">{legende}</caption>
        <thead>
          <tr className="border-b border-filet">
            {colonnes.map((c) => (
              <th
                key={c.cle}
                scope="col"
                className={cn(
                  'px-3 pb-3 pt-1 text-left text-texte-sm text-gris',
                  droite(c) && 'text-right',
                  c.secondaire && 'hidden sm:table-cell',
                )}
              >
                {c.titre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr key={cleLigne(ligne)} className="border-b border-filet/70 transition-colors last:border-0 hover:bg-page">
              {colonnes.map((c) => (
                <td
                  key={c.cle}
                  className={cn('px-3 py-3 text-encre', droite(c) && 'text-right', c.secondaire && 'hidden sm:table-cell')}
                >
                  {c.rendu(ligne)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr className="border-t-2 border-filet-fort">
              {total.map((cellule, i) => {
                const colonne = colonnes[i]
                return (
                  <td
                    key={colonne?.cle ?? i}
                    className={cn(
                      'px-3 pt-3 font-[650] text-encre',
                      colonne && droite(colonne) && 'text-right',
                      colonne?.secondaire && 'hidden sm:table-cell',
                    )}
                  >
                    {cellule}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
