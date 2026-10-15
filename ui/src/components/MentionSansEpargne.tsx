import { PiggyBank } from 'lucide-react'
import { cn } from '../lib/cn'
import { Montant } from './Montant'

/** Rappel sous un « reste du mois » : ce reste est avant l'épargne, qui n'est pas retirée (R11 : l'épargne n'est pas une dépense). */
export function MentionSansEpargne({ epargnePrevue, className }: { epargnePrevue: number | null; className?: string }) {
  return (
    <p role="note" className={cn('flex items-start gap-3 rounded-bouton bg-sauge-100 px-4 py-3.5 text-texte-sm text-encre', className)}>
      <PiggyBank className="mt-0.5 h-5 w-5 shrink-0 text-sauge-700" aria-hidden />
      <span>
        <span className="font-semibold">Ce reste est calculé sans l’épargne.</span>{' '}
        {epargnePrevue === null ? (
          'L’épargne n’est pas retirée.'
        ) : epargnePrevue > 0 ? (
          <>
            Les <Montant valeur={epargnePrevue} className="font-semibold" /> d’épargne prévus ce mois-ci ne sont pas retirés.
          </>
        ) : (
          'Aucune épargne n’est prévue ce mois-ci.'
        )}
      </span>
    </p>
  )
}
