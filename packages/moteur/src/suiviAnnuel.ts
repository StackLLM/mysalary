import { additionner, centimes, type Centimes } from './argent'
import { cumulDesMois, type Depart, type NatureCumul } from './cumul'
import { decalerMois, type CleMois, type DateCivile } from './dates'
import { epargneObjectif, type StatutObjectif } from './epargne'
import { partVariable, type PartVariable } from './indicateurs'
import { REGLES_SCENARIOS_DEFAUT, suiviDesObjectifs, trajectoireObjectif, type DonneesObjectifs, type ReglesScenarios } from './objectifs'
import type { Calendrier, StatutPeriode } from './periodes'

/**
 * Suivi annuel (lot 18, ux-ui.md (UX) § 4.8) : les douze mois budgétaires d'une année, revenus, dépenses et épargne avec le réel
 * à date et le projeté restant toujours séparés, les mois les plus coûteux, la part variable du revenu, l'épargne
 * cumulée et la progression de chaque objectif sur l'année.
 */

/** Un total d'année : le réel déjà arrivé, et ce qui est encore projeté (prévu ou attendu). */
export interface TotalAnnuel {
  reel: Centimes
  projete: Centimes
  total: Centimes
}

export interface MoisAnnuel {
  cle: CleMois
  statut: StatutPeriode
  nature: NatureCumul
  revenus: Centimes
  /** Sorties et charges encore prévues, épargne exclue (R11). */
  charges: Centimes
  epargne: Centimes
  /** Part déjà réelle : tout pour un mois terminé, le réel à date pour le mois en cours, rien sinon. */
  reel: { revenus: Centimes; charges: Centimes; epargne: Centimes }
  /** Épargne cumulée des mois de l'année jusqu'à celui-ci (réel, puis prévu). */
  epargneCumulee: Centimes
}

export interface CoutMois {
  cle: CleMois
  charges: Centimes
  nature: NatureCumul
}

/** Progression d'un objectif sur l'année : épargné au début, à date, et en fin d'année (réel si passée, sinon projeté réaliste). */
export interface ProgressionAnnuelle {
  id: string
  libelle: string
  statut: StatutObjectif
  montantCible: Centimes
  /** Épargné à la fin de l'année précédente ; `null` si la projection ne va pas jusque-là. */
  debut: Centimes | null
  /** Épargné aujourd'hui ; `null` pour une année à venir. */
  reelADate: Centimes | null
  /** Année passée : épargné à sa fin (réel). */
  fin: Centimes | null
  /** Année en cours ou à venir : épargné projeté en fin d'année ; `null` hors de la projection. */
  finProjetee: Centimes | null
  atteint: boolean
}

export interface SuiviAnnuel {
  annee: number
  etat: 'passee' | 'enCours' | 'future'
  mois: MoisAnnuel[]
  revenus: TotalAnnuel
  charges: TotalAnnuel
  epargne: TotalAnnuel
  /** Les trois mois aux charges les plus hautes (mois suivis seulement). */
  couteux: CoutMois[]
  partVariable: PartVariable
  /** Épargne cumulée à la fin de l'année (réel + projeté). */
  epargneCumulee: Centimes
  /** Mois de l'année qui précèdent le début du suivi : pas de données. */
  sansDonnees: number
  objectifs: ProgressionAnnuelle[]
}

export interface OptionsSuiviAnnuel {
  aujourdhui: DateCivile
  regles?: ReglesScenarios
  depart?: Depart | null
}

const ZERO = centimes(0)

export function suiviAnnuel(calendrier: Calendrier, donnees: DonneesObjectifs, annee: number, { aujourdhui, regles = REGLES_SCENARIOS_DEFAUT, depart = null }: OptionsSuiviAnnuel): SuiviAnnuel {
  const premier = `${annee}-01` as CleMois
  const dernier = `${annee}-12` as CleMois
  const courant = calendrier.moisContenant(aujourdhui).cle
  const etat = dernier < courant ? 'passee' : premier > courant ? 'future' : 'enCours'

  let cumulee: Centimes = ZERO
  const mois: MoisAnnuel[] = cumulDesMois(calendrier, premier, dernier, { aujourdhui, regle: regles.realiste, depart }).map((m) => {
    const reel =
      m.nature === 'reel'
        ? { revenus: m.revenus, charges: m.charges, epargne: m.epargne }
        : m.nature === 'enCours' && m.dontReel
          ? m.dontReel
          : { revenus: ZERO, charges: ZERO, epargne: ZERO }
    cumulee = additionner(cumulee, m.epargne)
    return { cle: m.cle, statut: m.statut, nature: m.nature, revenus: m.revenus, charges: m.charges, epargne: m.epargne, reel, epargneCumulee: cumulee }
  })

  const total = (champ: 'revenus' | 'charges' | 'epargne'): TotalAnnuel => {
    const reel = additionner(...mois.map((m) => m.reel[champ]))
    const tout = additionner(...mois.map((m) => m[champ]))
    return { reel, projete: centimes(tout - reel), total: tout }
  }

  // Valeur d'un objectif à la fin d'un mois budgétaire : réelle pour un mois passé, projetée (réaliste) ensuite.
  const suivi = suiviDesObjectifs(calendrier, donnees, aujourdhui, { regles })
  const progressions: ProgressionAnnuelle[] = suivi.objectifs
    .filter((o) => o.statut === 'actif' || o.statut === 'pause' || o.atteint)
    .map((o) => {
      const points = trajectoireObjectif(calendrier, o, donnees, aujourdhui, regles)
      const finDe = (cle: CleMois): Centimes | null =>
        cle < courant ? epargneObjectif(o, donnees.mouvementsEpargne, calendrier.mois(cle).fin) : (points.find((p) => p.mois === cle)?.projete ?? null)
      return {
        id: o.id,
        libelle: o.libelle,
        statut: o.statut,
        montantCible: o.montantCible,
        debut: finDe(decalerMois(premier, -1)),
        reelADate: etat === 'future' ? null : o.epargne,
        fin: etat === 'passee' ? finDe(dernier) : null,
        finProjetee: etat === 'passee' ? null : finDe(dernier),
        atteint: o.atteint,
      }
    })

  return {
    annee,
    etat,
    mois,
    revenus: total('revenus'),
    charges: total('charges'),
    epargne: total('epargne'),
    couteux: mois
      .filter((m) => m.nature !== 'avant' && m.charges > 0)
      .map((m) => ({ cle: m.cle, charges: m.charges, nature: m.nature }))
      .sort((a, b) => b.charges - a.charges || a.cle.localeCompare(b.cle))
      .slice(0, 3),
    partVariable: partVariable(calendrier, premier),
    epargneCumulee: cumulee,
    sansDonnees: mois.filter((m) => m.nature === 'avant').length,
    objectifs: progressions,
  }
}
