import type { ComponentType, SVGProps } from 'react'
import {
  IconeAnnee,
  IconeCalendrier,
  IconeGrille,
  IconeMois,
  IconeObjectif,
  IconePortefeuille,
} from '../components/icones'

export interface Destination {
  chemin: string
  libelle: string
  Icone: ComponentType<SVGProps<SVGSVGElement>>
  /** Lot qui construit la page (pages encore à venir). */
  lot: number
}

/** Navigation principale, en haut comme dans le template (UX.md § 3). */
export const DESTINATIONS: Destination[] = [
  { chemin: '/', libelle: 'Aujourd’hui', Icone: IconeGrille, lot: 13 },
  { chemin: '/mois', libelle: 'Mois', Icone: IconeMois, lot: 8 },
  { chemin: '/annee', libelle: 'Année', Icone: IconeAnnee, lot: 15 },
  { chemin: '/objectifs', libelle: 'Objectifs', Icone: IconeObjectif, lot: 10 },
  { chemin: '/calendrier', libelle: 'Calendrier', Icone: IconeCalendrier, lot: 14 },
  { chemin: '/plan', libelle: 'Mon plan', Icone: IconePortefeuille, lot: 4 },
]
