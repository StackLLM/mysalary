import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Message en tête de formulaire : erreur générale ou confirmation. */
export function Alerte({ ton = 'alerte', children }: { ton?: 'alerte' | 'positif'; children: ReactNode }) {
  const Icone = ton === 'alerte' ? AlertCircle : CheckCircle2
  return (
    <div role={ton === 'alerte' ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 rounded-champ px-4 py-3 text-texte-sm', ton === 'alerte' ? 'bg-alerte-fond text-alerte' : 'bg-positif-fond text-positif')}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
