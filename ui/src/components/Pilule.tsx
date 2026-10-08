import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

/** Pilule de filtre ou de catégorie (recette de la skill). Active = fond encre. */
export function Pilule({ active = false, className, ...reste }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-pilule px-4 text-texte-sm font-medium shadow-bouton transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-carte active:translate-y-0 active:scale-95',
        active ? 'bg-lien text-white' : 'bg-white text-encre',
        className,
      )}
      {...reste}
    />
  )
}
