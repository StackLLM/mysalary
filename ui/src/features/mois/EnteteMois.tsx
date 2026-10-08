import { formaterDate, formaterMois } from '@mysalary/partage'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { Bouton } from '../../components/Bouton'
import { Identite } from '../../components/Elements'
import { joursRestants, moisVoisin } from '../depenses/saisie'

interface Proprietes {
  titre: string
  mois: { cle: string; debut: string; fin: string; statut: string }
  aujourdhui: string
  /** Mois clôturé : badge et lecture seule. */
  cloture: boolean
  changerMois: (cle: string) => void
}

/** En-tête commun aux onglets de l'écran Mois : identité, période, navigation, état. */
export function EnteteMois({ titre, mois, aujourdhui, cloture, changerMois }: Proprietes) {
  const nom = formaterMois(mois.cle, { majuscule: true })
  const restants = joursRestants(mois, aujourdhui)
  const etat = cloture
    ? 'Clôturé'
    : restants !== null
      ? `${restants} jour${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''}`
      : mois.statut === 'aVenir'
        ? 'À venir'
        : 'Terminé'
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <Identite initiale={nom.charAt(0)} nom={titre} detail={`Du ${formaterDate(mois.debut, 'court')} au ${formaterDate(mois.fin, 'court')}`} />
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <Bouton variante="contour" taille="sm" className="h-10 w-10 rounded-pilule p-0" aria-label="Mois précédent" onClick={() => changerMois(moisVoisin(mois.cle, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Bouton>
        <span className="min-w-[132px] text-center">
          <span className="block text-texte font-semibold text-encre">{nom}</span>
          <span className="flex items-center justify-center gap-1 text-mention text-gris">
            {cloture && <Lock className="h-3 w-3" aria-hidden />}
            {etat}
          </span>
        </span>
        <Bouton variante="contour" taille="sm" className="h-10 w-10 rounded-pilule p-0" aria-label="Mois suivant" onClick={() => changerMois(moisVoisin(mois.cle, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Bouton>
      </div>
    </div>
  )
}
