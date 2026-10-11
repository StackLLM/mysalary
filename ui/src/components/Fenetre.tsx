import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Bouton } from './Bouton'

interface ProprietesFenetre {
  ouvert: boolean
  onFermer: () => void
  titre: ReactNode
  /** Texte accessible du titre quand `titre` n'est pas une simple chaîne. */
  description?: ReactNode
  /** À droite du titre, avant le bouton Fermer (badge, navigation…). */
  entete?: ReactNode
  children: ReactNode
  pied?: ReactNode
}

/**
 * Fenêtre de consultation centrée (lot 14) : pour lire le détail d'un mois ou d'une semaine.
 * Feuille qui monte du bas sur mobile. Focus piégé et touche Échap gérés par Radix.
 */
export function Fenetre({ ouvert, onFermer, titre, description, entete, children, pied }: ProprietesFenetre) {
  const bureau = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(min-width: 640px)').matches)
  return (
    <Dialog.Root open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <AnimatePresence>
        {ouvert && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-40 bg-encre/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
              <Dialog.Content asChild forceMount onInteractOutside={(e) => e.preventDefault()}>
                <motion.div
                  className="pointer-events-auto flex max-h-[92vh] w-full flex-col rounded-t-carte border border-filet bg-white shadow-flottant sm:max-h-[86vh] sm:max-w-[760px] sm:rounded-carte"
                  initial={bureau ? { opacity: 0, y: 16, scale: 0.98 } : { opacity: 0, y: 48 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={bureau ? { opacity: 0, y: 16, scale: 0.98 } : { opacity: 0, y: 48 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                >
                  <header className="flex items-start justify-between gap-4 border-b border-filet px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
                    <div className="min-w-0">
                      <Dialog.Title className="text-titre text-encre">{titre}</Dialog.Title>
                      {description ? (
                        <Dialog.Description asChild>
                          <div className="mt-1 text-texte-sm text-gris">{description}</div>
                        </Dialog.Description>
                      ) : (
                        <Dialog.Description className="sr-only">{typeof titre === 'string' ? titre : 'Détail'}</Dialog.Description>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {entete}
                      <Dialog.Close asChild>
                        <Bouton variante="contour" taille="sm" className="h-10 w-10 rounded-pilule p-0" aria-label="Fermer">
                          <X className="h-4 w-4" />
                        </Bouton>
                      </Dialog.Close>
                    </div>
                  </header>
                  <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
                  {pied && <footer className="flex flex-wrap justify-end gap-2 border-t border-filet px-5 py-4 sm:px-7">{pied}</footer>}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
