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
}

/** Navigation principale, en haut comme dans le template (ux-ui.md (UX) § 3). */
export const DESTINATIONS: Destination[] = [
  { chemin: '/', libelle: 'Aujourd’hui', Icone: IconeGrille },
  { chemin: '/mois', libelle: 'Mois', Icone: IconeMois },
  { chemin: '/annee', libelle: 'Année', Icone: IconeAnnee },
  { chemin: '/objectifs', libelle: 'Objectifs', Icone: IconeObjectif },
  { chemin: '/calendrier', libelle: 'Calendrier', Icone: IconeCalendrier },
  { chemin: '/plan', libelle: 'Mon plan', Icone: IconePortefeuille },
]
