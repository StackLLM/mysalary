import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Nos tailles de texte personnalisées (tailwind.config.js) doivent être déclarées :
 * sinon tailwind-merge croit que `text-texte` et `text-lien` sont en conflit
 * et supprime la couleur.
 */
const fusionner = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['logo', 'nav', 'montant', 'titre', 'titre-carte', 'texte', 'texte-sm', 'mention', 'bouton', 'bouton-plein'] },
      ],
    },
  },
})

/** Compose des classes Tailwind sans conflit (la dernière gagne). */
export function cn(...classes: ClassValue[]) {
  return fusionner(clsx(classes))
}
