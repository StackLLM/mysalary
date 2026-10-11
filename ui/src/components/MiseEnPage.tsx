import type { ReactNode } from 'react'
import { BarreOngletsMobile } from './BarreOngletsMobile'
import { Entete } from './Entete'

/** Structure du template : en-tête blanc pleine largeur, puis page gris très clair. */
export function MiseEnPage({ children, onSaisie, simple = false }: { children: ReactNode; onSaisie: () => void; simple?: boolean }) {
  return (
    <div className="min-h-screen bg-page">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-bouton focus:bg-white focus:px-4 focus:py-2 focus:text-texte-sm focus:font-semibold focus:text-encre focus:shadow-flottant"
      >
        Aller au contenu
      </a>
      <Entete simple={simple} onSaisie={onSaisie} />
      <main id="contenu" tabIndex={-1} className="mx-auto outline-none w-full max-w-[1440px] px-5 pb-28 pt-6 lg:px-14 lg:pb-14 lg:pt-8">{children}</main>
      {!simple && <BarreOngletsMobile onSaisie={onSaisie} />}
    </div>
  )
}
