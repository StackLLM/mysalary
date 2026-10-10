import type { Alerte, Confiance, DateCivile, EvenementJour, IndicateursDuMois, Recommandation, Risque, SuiviSemaine } from '@mysalary/moteur'
import { deMois, formaterDate, formaterMois, formaterMontant } from './format'

export type { Alerte, Confiance, EcartPlan, IndicateurObjectif, IndicateursDuMois, PartVariable, Recommandation, ResteADepenser, ResteSemaine, Taux } from '@mysalary/moteur'

/**
 * Alertes et recommandations rédigées (Plan.md § 7.5 ; context.md R24–R26).
 * Chaque phrase reste au conditionnel et porte sa condition : jamais de garantie.
 */

export interface Action {
  libelle: string
  chemin: string
}

export type AlerteDto = Alerte & { titre: string; message: string; action: Action }

export type RecommandationDto = Recommandation & {
  titre: string
  message: string
  /** Effet attendu, en une phrase. */
  impact: string
  /** Sur quoi repose le calcul (R24). */
  base: string
  /** Hypothèse sous laquelle le conseil vaut (R25). */
  condition: string
  action: Action | null
}

/** Cloche et suggestions. */
export interface ConseilsDto {
  aujourdhui: DateCivile
  alertes: AlerteDto[]
  recommandations: RecommandationDto[]
}

export interface IndicateursDto extends IndicateursDuMois {
  aujourdhui: DateCivile
}

/**
 * Page Aujourd'hui (lot 16, UX.md § 5.2) : tout « où j'en suis » en une lecture.
 * Les chiffres viennent du moteur (indicateurs, alertes, recommandations, prochains jours, semaine passée).
 */
export interface AujourdhuiDto {
  aujourdhui: DateCivile
  /** Aucun salaire défini : la page invite à l'ajouter (état vide). */
  sansContrat: boolean
  indicateurs: IndicateursDuMois
  /** Ce qui demande une action (paie à confirmer, échéance en retard…). */
  alertes: AlerteDto[]
  /** 1 à 3 recommandations. */
  recommandations: RecommandationDto[]
  /** 7 prochains jours : revenus et charges datés. */
  prochainsJours: EvenementJour[]
  /** Le premier jour d'une semaine : bilan de la semaine qui vient de finir. */
  semainePassee: SuiviSemaine | null
}

export const CONFIANCES: Record<Confiance, { libelle: string; explication: string }> = {
  elevee: { libelle: 'Confiance élevée', explication: 'Repose sur ton réel et des montants connus.' },
  moyenne: { libelle: 'Confiance moyenne', explication: 'Repose sur une projection de ton plan (scénario réaliste).' },
  faible: { libelle: 'Confiance faible', explication: 'Repose sur un revenu incertain.' },
}

const CERTITUDES_PRIME = { garanti: 'garantie', probable: 'probable', incertain: 'incertaine' } as const

const CONDITION = 'Si tes revenus et tes dépenses restent conformes au plan.'

const RISQUES: Record<Risque, string> = {
  sur: 'La date est tenue même en scénario prudent.',
  probable: 'Au rythme prévu, la date est tenue en scénario réaliste, pas en prudent.',
  fragile: 'Au rythme prévu, la date n’est tenue qu’en scénario ambitieux.',
  horsPortee: 'Au rythme prévu, la date n’est tenue dans aucun scénario.',
}

const dh = formaterMontant
/** Montant arrondi au dirham supérieur : « environ 6 917 DH ». */
const environ = (centimes: number) => formaterMontant(Math.ceil(centimes / 100) * 100)
const mois = (n: number) => `${n} mois`
const jours = (n: number) => `${n} jour${n > 1 ? 's' : ''}`
const nom = (libelle: string) => `« ${libelle} »`

export function redigerAlerte(a: Alerte): AlerteDto {
  switch (a.type) {
    case 'paieEnRetard':
      return {
        ...a,
        titre: 'Paie à confirmer',
        message: `Ta paie de ${formaterMois(a.mois)} (${dh(a.montant)}) était prévue le ${formaterDate(a.datePrevue)}, il y a ${jours(a.joursDeRetard)}. Confirme-la dès qu’elle arrive.`,
        action: { libelle: 'Confirmer la paie', chemin: '/plan' },
      }
    case 'paieAujourdhui':
      return {
        ...a,
        titre: 'Paie prévue aujourd’hui',
        message: `${dh(a.montant)} attendus pour ${formaterMois(a.mois)}. Confirme-la quand elle arrive.`,
        action: { libelle: 'Confirmer la paie', chemin: '/plan' },
      }
    case 'revenuEnRetard':
      return {
        ...a,
        titre: `${nom(a.libelle)} pas encore reçu`,
        message: `Prévu le ${formaterDate(a.datePrevue)} (${dh(a.montant)}). Note-le s’il est arrivé.`,
        action: { libelle: 'Noter le revenu', chemin: '/plan?onglet=revenus' },
      }
    case 'echeanceEnRetard':
      return {
        ...a,
        titre: `${nom(a.libelle)} pas encore payé`,
        message: `${a.origine === 'dette' ? 'Échéance de dette' : 'Échéance'} du ${formaterDate(a.date)} : ${dh(a.reste)} restent à payer. Note le paiement si c’est fait.`,
        action: a.origine === 'dette' ? { libelle: 'Noter le paiement', chemin: '/plan?onglet=dettes' } : { libelle: 'Ouvrir le mois', chemin: `/mois?mois=${a.mois}` },
      }
    case 'enveloppeDepassee':
      return {
        ...a,
        titre: `Enveloppe ${nom(a.libelle)} dépassée`,
        message: `${dh(a.depassement)} au-dessus du budget de ${dh(a.budget)} en ${formaterMois(a.mois, { annee: false })}.`,
        action: { libelle: 'Voir les dépenses', chemin: `/mois?mois=${a.mois}&onglet=depenses` },
      }
    case 'semaineDepassee': {
      const fin = a.joursRestants === 0 ? 'C’est le dernier jour de la semaine.' : `Il reste ${jours(a.joursRestants)} dans la semaine.`
      const suite =
        a.budgetMoisRestant > 0
          ? ` Pour rester dans le budget flexible du mois : environ ${environ(a.parJourMois)} par jour pendant ${jours(a.joursRestantsMois)}.`
          : ' Le budget flexible du mois est déjà entièrement utilisé.'
      return {
        ...a,
        titre: 'Budget de la semaine dépassé',
        message: `Dépassé d’environ ${environ(a.depassement)}. ${fin}${suite}`,
        action: { libelle: 'Voir la semaine', chemin: `/mois?mois=${a.mois}&onglet=semaines` },
      }
    }
    case 'reserveDepasse':
      return {
        ...a,
        titre: 'Épargne à réajuster',
        message: `Tes objectifs réservent ${dh(a.depassement)} de plus que ton épargne déclarée. Mets à jour un solde, ou le montant déjà mis de côté d’un objectif.`,
        action: { libelle: 'Ouvrir l’épargne', chemin: '/plan?onglet=epargne' },
      }
  }
}

const avance = (gain: number, apres: string, avant: string) => `d’environ ${mois(gain)} (${formaterMois(apres)} au lieu ${deMois(avant)})`

export function redigerRecommandation(r: Recommandation): RecommandationDto {
  switch (r.type) {
    case 'finDeMois':
      return {
        ...r,
        titre: 'Fin de mois serrée',
        message: `Si tout se passe comme prévu, il manquerait environ ${dh(r.manque)} d’ici le ${formaterDate(r.fin, 'court')}.`,
        impact: `Dépenser ${dh(r.manque)} de moins d’ici là, soit environ ${environ(r.parJour)} par jour pendant ${jours(r.joursRestants)}, permettrait de finir le mois à l’équilibre.`,
        base: 'Estimation de fin de mois : revenus reçus et attendus − sorties réelles et charges encore prévues.',
        condition: 'Si les revenus attendus arrivent et que les charges prévues sortent comme prévu.',
        action: { libelle: 'Voir les semaines', chemin: `/mois?mois=${r.mois}&onglet=semaines` },
      }
    case 'effort': {
      const cible = formaterMois(r.dateCible)
      if (r.dateDepassee) {
        return {
          ...r,
          titre: `Date dépassée pour ${nom(r.libelle)}`,
          message: `La date souhaitée (${cible}) est passée et il reste ${dh(r.restant)} à réunir.`,
          impact: 'Choisir une nouvelle date ou un versement mensuel redonnerait une estimation.',
          base: `Cible − épargné à ce jour = ${dh(r.restant)}.`,
          condition: CONDITION,
          action: { libelle: 'Modifier l’objectif', chemin: `/objectifs/${r.objectifId}/modifier` },
        }
      }
      const versement = r.versementMensuel ? ` Ton versement prévu est de ${dh(r.versementMensuel)}.` : ''
      return {
        ...r,
        titre: `${nom(r.libelle)} en ${cible}`,
        message: `Pour avoir ${nom(r.libelle)} en ${cible}, il faudrait environ ${environ(r.effortMensuel)} par mois, soit environ ${environ(r.effortHebdo)} par semaine.${versement}`,
        impact: RISQUES[r.risque],
        base: `Reste à réunir depuis le début du mois, réparti sur les mois jusqu’à ${cible}.`,
        condition: CONDITION,
        action: { libelle: 'Ouvrir l’objectif', chemin: `/objectifs/${r.objectifId}` },
      }
    }
    case 'reduction':
      return {
        ...r,
        titre: `Réduire ${nom(r.charge)}`,
        message: `Réduire ${nom(r.charge)} de ${dh(r.montant)} par mois avancerait ${nom(r.libelle)} ${avance(r.gainMois, r.apres, r.avant)}.`,
        impact: `${mois(r.gainMois)} plus tôt pour ${nom(r.libelle)}.`,
        base: `Projection réaliste : ${nom(r.charge)} passe de ${dh(r.budget)} à ${dh(r.budget - r.montant)} par mois dès le mois prochain ; l’épargne est répartie par priorité.`,
        condition: CONDITION,
        action: { libelle: 'Simuler', chemin: `/simulateur?objectif=${encodeURIComponent(r.objectifId)}&reduction=${encodeURIComponent(r.chargeId)}&montant=${r.montant / 100}` },
      }
    case 'prime':
      return {
        ...r,
        titre: `Mettre de côté ${nom(r.source)}`,
        message: `Mettre de côté ${nom(r.source)} (${dh(r.montant)}, prévue le ${formaterDate(r.date)}) avancerait ${nom(r.libelle)} ${avance(r.gainMois, r.apres, r.avant)}.`,
        impact: `${mois(r.gainMois)} plus tôt pour ${nom(r.libelle)}.`,
        base: `Projection réaliste de ${nom(r.libelle)}, avec et sans cette prime (notée ${CERTITUDES_PRIME[r.certitude]}).`,
        condition: 'Si la prime est versée comme prévu et que le reste du plan se déroule comme prévu.',
        action: { libelle: 'Simuler', chemin: `/simulateur?objectif=${encodeURIComponent(r.objectifId)}` },
      }
    case 'disponible':
      return {
        ...r,
        titre: 'Épargne non affectée',
        message: `${dh(r.montant)} de ton épargne ne sont réservés à aucun objectif. Les affecter à ${nom(r.libelle)} l’avancerait ${avance(r.gainMois, r.apres, r.avant)}.`,
        impact: `${mois(r.gainMois)} plus tôt pour ${nom(r.libelle)}.`,
        base: 'Épargne déclarée − épargne réservée aux objectifs ; projection réaliste avec ce montant ajouté au « déjà mis de côté ».',
        condition: CONDITION,
        action: { libelle: 'Modifier l’objectif', chemin: `/objectifs/${r.objectifId}/modifier` },
      }
    case 'fondsSecurite':
      return {
        ...r,
        titre: 'Fonds de sécurité',
        message: `Un fonds de sécurité de 3 mois de charges essentielles, soit ${dh(r.cible)}, aiderait à absorber un imprévu sans toucher à tes objectifs.`,
        impact: 'Un imprévu serait couvert par ce fonds plutôt que par tes objectifs.',
        base: `Charges essentielles : ${dh(r.essentielMensuel)} par mois × 3 (de 3 à 6 mois selon ta situation).`,
        condition: 'Montant indicatif, à ajuster selon ta situation.',
        action: { libelle: 'Créer le fonds', chemin: '/objectifs/nouveau?type=securite' },
      }
  }
}
