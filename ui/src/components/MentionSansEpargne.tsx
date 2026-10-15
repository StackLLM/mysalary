import { PiggyBank } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'
import { Montant } from './Montant'

/**
 * Rappel sous un reste ou un cumul : l'épargne n'y est retirée qu'une fois confirmée par l'utilisateur dans Épargne
 * (R11 : l'épargne n'est pas une dépense). `aConfirmer` : épargne prévue pas encore versée ; `null` si on ne la connaît pas.
 */
export function MentionSansEpargne({ aConfirmer, className }: { aConfirmer: number | null; className?: string }) {
  return (
    <p role="note" className={cn('flex items-start gap-3 rounded-bouton bg-sauge-100 px-4 py-3.5 text-texte-sm text-encre', className)}>
      <PiggyBank className="mt-0.5 h-5 w-5 shrink-0 text-sauge-700" aria-hidden />
      <span>
        <span className="font-semibold">Ce reste est calculé sans l’épargne.</span>{' '}
        {aConfirmer === null ? (
          'L’épargne n’est retirée qu’une fois confirmée dans Épargne.'
        ) : aConfirmer > 0 ? (
          <>
            Tu as prévu d’épargner <Montant valeur={aConfirmer} className="font-semibold" /> : c’est à toi de le confirmer dans Épargne, et seulement alors il est retiré.{' '}
            <Link to="/plan?onglet=epargne" className="font-semibold text-lien hover:underline">
              Confirmer dans Épargne
            </Link>
          </>
        ) : (
          'Aucune épargne à confirmer ce mois-ci.'
        )}
      </span>
    </p>
  )
}
