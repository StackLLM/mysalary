import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

/**
 * Boutons du template :
 * - principal : « Send Invoice » (plein, 60 px, rayon 16) ;
 * - teinte : « Add Customer » (fond pâle, texte foncé coloré) ;
 * - blanc : « Previews / Download » (carte blanche, texte coloré, icône) ;
 * - puce : « Customize » (petit, fond pâle) ;
 * - menu : « Manage Invoice ▾ » (carte blanche compacte).
 */
export const styleBouton = cva(
  'inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap transition-all duration-200 ' +
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variante: {
        principal: 'bg-primaire text-white hover:bg-primaire-survol',
        teinte: 'bg-teinte font-semibold text-lien hover:bg-teinte-fort',
        blanc: 'bg-white font-semibold text-lien shadow-bouton hover:-translate-y-px hover:shadow-carte',
        puce: 'bg-teinte font-semibold text-lien hover:bg-teinte-fort',
        menu: 'bg-white font-semibold text-lien shadow-bouton hover:shadow-carte',
        contour: 'border border-filet bg-white font-semibold text-encre hover:border-filet-fort',
        lien: 'font-semibold text-lien hover:underline',
        danger: 'bg-alerte-fond font-semibold text-alerte hover:brightness-95',
      },
      taille: {
        lg: 'h-[60px] rounded-bouton px-6 text-bouton',
        md: 'h-[52px] rounded-bouton px-5 text-texte',
        sm: 'h-9 rounded-[10px] px-3.5 text-texte-sm',
        menu: 'h-11 rounded-champ px-5 text-texte-sm',
        texte: 'h-auto p-0 text-texte',
      },
    },
    compoundVariants: [{ variante: 'principal', taille: 'lg', className: 'text-bouton-plein' }],
    defaultVariants: { variante: 'principal', taille: 'lg' },
  },
)

export interface ProprietesBouton extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof styleBouton> {
  chargement?: boolean
}

export const Bouton = forwardRef<HTMLButtonElement, ProprietesBouton>(function Bouton(
  { className, variante, taille, chargement = false, disabled, children, type = 'button', ...reste },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(styleBouton({ variante, taille }), className)}
      disabled={disabled || chargement}
      aria-busy={chargement || undefined}
      {...reste}
    >
      {chargement && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
