import type { ReactNode } from 'react'
import { BarreOngletsMobile } from './BarreOngletsMobile'
import { Entete } from './Entete'

/** Structure du template : en-tête blanc pleine largeur, puis page gris très clair. */
export function MiseEnPage({ children, onSaisie, simple = false }: { children: ReactNode; onSaisie: () => void; simple?: boolean }) {
  return (
    <div className="min-h-screen bg-page">
      <Entete simple={simple} onSaisie={onSaisie} />
      <main className="mx-auto w-full max-w-[1440px] px-5 pb-28 pt-6 lg:px-14 lg:pb-14 lg:pt-8">{children}</main>
      {!simple && <BarreOngletsMobile onSaisie={onSaisie} />}
    </div>
  )
}
