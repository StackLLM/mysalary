import { Toaster } from 'sonner'

/** Toasts en verre sombre, en bas au centre, action « Annuler » en sauge clair (ux-ui.md (UI) § 7.11). */
export function Notifications() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'verre-sombre flex w-[min(92vw,380px)] items-center gap-3 rounded-lg px-4 py-3 text-texte-sm shadow-flottant',
          actionButton: 'ml-auto shrink-0 whitespace-nowrap font-semibold text-sauge-300 hover:text-white',
          description: 'text-white/75',
        },
      }}
    />
  )
}
