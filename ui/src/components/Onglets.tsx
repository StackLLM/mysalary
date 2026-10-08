import * as Tabs from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import { cn } from '../lib/cn'

interface Onglet {
  valeur: string
  libelle: string
  contenu: ReactNode
}

/** Onglets accessibles (Radix) avec indicateur qui glisse. */
export function Onglets({ onglets, valeur, onChange, className }: {
  onglets: Onglet[]
  valeur: string
  onChange: (valeur: string) => void
  className?: string
}) {
  const groupe = useId()
  return (
    <Tabs.Root value={valeur} onValueChange={onChange} className={className}>
      <Tabs.List className="inline-flex max-w-full gap-1 overflow-x-auto rounded-pilule [scrollbar-width:none] bg-teinte p-1" aria-label="Sections">
        {onglets.map((o) => (
          <Tabs.Trigger
            key={o.valeur}
            value={o.valeur}
            className="relative h-9 shrink-0 rounded-pilule px-4 text-texte-sm font-medium text-gris transition-colors hover:text-encre data-[state=active]:text-encre"
          >
            {valeur === o.valeur && (
              <motion.span
                layoutId={`onglet-${groupe}`}
                className="absolute inset-0 rounded-pilule bg-white shadow-bouton"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">{o.libelle}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {onglets.map((o) => (
        <Tabs.Content key={o.valeur} value={o.valeur} className={cn('mt-5 focus-visible:shadow-none')}>
          {o.contenu}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
