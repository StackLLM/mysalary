import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Bouton } from './Bouton'

interface ProprietesPanneau {
  ouvert: boolean
  onFermer: () => void
  titre: string
  description?: string
  children: ReactNode
  pied?: ReactNode
}

/**
 * Panneau de saisie en verre (UI.md § 7.10) : entre par la droite sur bureau,
 * par le bas sur mobile. Focus piégé et touche Échap gérés par Radix.
 */
export function Panneau({ ouvert, onFermer, titre, description, children, pied }: ProprietesPanneau) {
  // Bureau : entrée par la droite. Mobile : feuille qui monte du bas.
  const bureau = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(min-width: 640px)').matches)
  return (
    <Dialog.Root open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <AnimatePresence>
        {ouvert && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-encre/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount onInteractOutside={(e) => e.preventDefault()}>
              <motion.div
                className="fixed border border-filet bg-white shadow-flottant inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-carte p-6 sm:inset-y-3 sm:left-auto sm:right-3 sm:max-h-none sm:w-[440px] sm:rounded-carte"
                initial={bureau ? { opacity: 0, x: 48 } : { opacity: 0, y: 48 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={bureau ? { opacity: 0, x: 48 } : { opacity: 0, y: 48 }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              >
                <header className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-titre text-encre">{titre}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-texte-sm text-gris">{description}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{titre}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <Bouton variante="contour" taille="sm" className="h-10 w-10 rounded-pilule p-0" aria-label="Fermer">
                      <X className="h-4 w-4" />
                    </Bouton>
                  </Dialog.Close>
                </header>
                <div className="-mx-1 flex-1 overflow-y-auto px-1">{children}</div>
                {pied && <footer className="mt-5 flex justify-end gap-2">{pied}</footer>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
