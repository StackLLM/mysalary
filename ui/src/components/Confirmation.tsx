import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { Bouton } from './Bouton'

interface ProprietesConfirmation {
  ouvert: boolean
  onFermer: () => void
  titre: string
  description: ReactNode
  libelleConfirmer: string
  /** Libellé du bouton qui ferme sans rien faire ; à changer quand l'action elle-même est une annulation. */
  libelleRenoncer?: string
  onConfirmer: () => void
  /** Bouton de confirmation bloqué tant qu'une condition n'est pas remplie (ex. prénom retapé). */
  confirmerDesactive?: boolean
  chargement?: boolean
  /** `principal` pour une action lourde mais pas destructive (clôturer, rouvrir). */
  ton?: 'danger' | 'principal'
  children?: ReactNode
}

/** Confirmation d'une action lourde ou irréversible (ux-ui.md (UX) § 6). */
export function Confirmation({
  ouvert,
  onFermer,
  titre,
  description,
  libelleConfirmer,
  libelleRenoncer = 'Annuler',
  onConfirmer,
  confirmerDesactive,
  chargement,
  ton = 'danger',
  children,
}: ProprietesConfirmation) {
  return (
    <Dialog.Root open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-encre/20" />
        <Dialog.Content onInteractOutside={(e) => e.preventDefault()} className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-carte bg-white p-6 shadow-flottant">
          <Dialog.Title className="text-titre text-encre">{titre}</Dialog.Title>
          {/* Un div : la description peut contenir une liste (résumé des changements). */}
          <Dialog.Description asChild>
            <div className="mt-2 text-texte text-gris">{description}</div>
          </Dialog.Description>
          {children && <div className="mt-5">{children}</div>}
          {/* Sur mobile, les boutons s'empilent sur toute la largeur : un long libellé ne déborde jamais de la fenêtre. */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Bouton variante="contour" taille="md" className="w-full sm:w-auto" onClick={onFermer}>
              {libelleRenoncer}
            </Bouton>
            <Bouton variante={ton} taille="md" className="w-full sm:w-auto" onClick={onConfirmer} disabled={confirmerDesactive} chargement={chargement}>
              {libelleConfirmer}
            </Bouton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
