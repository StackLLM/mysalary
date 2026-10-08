import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { Bouton } from './Bouton'

interface ProprietesConfirmation {
  ouvert: boolean
  onFermer: () => void
  titre: string
  description: ReactNode
  libelleConfirmer: string
  onConfirmer: () => void
  /** Bouton de confirmation bloqué tant qu'une condition n'est pas remplie (ex. prénom retapé). */
  confirmerDesactive?: boolean
  chargement?: boolean
  children?: ReactNode
}

/** Confirmation d'une action lourde ou irréversible (UX.md § 6). */
export function Confirmation({
  ouvert,
  onFermer,
  titre,
  description,
  libelleConfirmer,
  onConfirmer,
  confirmerDesactive,
  chargement,
  children,
}: ProprietesConfirmation) {
  return (
    <Dialog.Root open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-encre/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-carte bg-white p-6 shadow-flottant">
          <Dialog.Title className="text-titre text-encre">{titre}</Dialog.Title>
          <Dialog.Description className="mt-2 text-texte text-gris">{description}</Dialog.Description>
          {children && <div className="mt-5">{children}</div>}
          <div className="mt-6 flex justify-end gap-3">
            <Bouton variante="contour" taille="md" onClick={onFermer}>
              Annuler
            </Bouton>
            <Bouton variante="danger" taille="md" onClick={onConfirmer} disabled={confirmerDesactive} chargement={chargement}>
              {libelleConfirmer}
            </Bouton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
