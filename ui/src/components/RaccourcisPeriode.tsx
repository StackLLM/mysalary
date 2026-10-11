import { useEffect } from 'react'

/** Vrai quand la touche part d'un champ de saisie ou qu'une fenêtre est ouverte : les flèches y gardent leur sens. */
function touchePourAutreChose(e: KeyboardEvent) {
  const cible = e.target instanceof Element ? e.target : null
  if (cible?.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="tablist"], [role="radio"], [role="menu"]')) return true
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]'))
}

/** `←` et `→` changent de période (mois, année), comme les flèches de l'en-tête. Ne fait rien dans un champ ni sous une fenêtre. */
export function RaccourcisPeriode({ precedent, suivant }: { precedent: () => void; suivant: () => void }) {
  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || touchePourAutreChose(e)) return
      e.preventDefault()
      if (e.key === 'ArrowLeft') precedent()
      else suivant()
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [precedent, suivant])
  return null
}
