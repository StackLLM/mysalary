import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface ActionMenu {
  libelle: string
  onSelect: () => void
  danger?: boolean
  icone?: ReactNode
}

/** Menu déroulant accessible (clavier, Échap), dans le style des cartes du template. */
export function Menu({ declencheur, actions, entete }: { declencheur: ReactNode; actions: ActionMenu[]; entete?: ReactNode }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{declencheur}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[200px] rounded-bouton border border-filet bg-white p-1.5 shadow-flottant"
        >
          {entete && <div className="px-3 pb-2 pt-1.5">{entete}</div>}
          {actions.map((a) => (
            <DropdownMenu.Item
              key={a.libelle}
              onSelect={a.onSelect}
              className={cn(
                'flex cursor-pointer select-none items-center gap-2.5 rounded-champ px-3 py-2.5 text-texte-sm font-medium outline-none',
                a.danger ? 'text-alerte data-[highlighted]:bg-alerte-fond' : 'text-encre data-[highlighted]:bg-teinte',
              )}
            >
              {a.icone}
              {a.libelle}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
