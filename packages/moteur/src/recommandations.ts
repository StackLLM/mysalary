import { centimes, type Centimes } from './argent'
import { bilanDuMois } from './bilan'
import { decalerMois, ecartJours, ecartMois, type CleMois, type DateCivile } from './dates'
import { cibleFondsSecurite, etatEpargne, type Objectif } from './epargne'
import { analyser, projeter, REGLES_SCENARIOS_DEFAUT, type Ajustements, type DonneesObjectifs, type ReglesScenarios, type Risque } from './objectifs'
import type { Calendrier } from './periodes'
import type { Certitude } from './salaire'
import { suiviDesSemaines } from './semaines'

/**
 * Alertes et recommandations (Plan.md § 7.5 ; context.md R24–R26 ; UX.md § 1 « Calme »).
 * Règles explicites et testées, sans boîte noire. Une alerte n'existe que si une action est utile ;
 * une recommandation donne un montant, son impact, sa base de calcul et un niveau de confiance.
 * Le moteur rend des données ; les phrases sont rédigées dans `partage` (toujours au conditionnel, jamais de garantie).
 */

export type Confiance = 'elevee' | 'moyenne' | 'faible'

export type Alerte = { cle: string } & (
  | { type: 'paieEnRetard'; mois: CleMois; datePrevue: DateCivile; joursDeRetard: number; montant: Centimes }
  | { type: 'paieAujourdhui'; mois: CleMois; montant: Centimes }
  | { type: 'revenuEnRetard'; sourceId: string; libelle: string; datePrevue: DateCivile; montant: Centimes }
  | { type: 'echeanceEnRetard'; origine: 'fixe' | 'ponctuel' | 'dette'; id: string; libelle: string; date: DateCivile; reste: Centimes; mois: CleMois }
  | { type: 'enveloppeDepassee'; id: string; libelle: string; budget: Centimes; depassement: Centimes; mois: CleMois }
  | { type: 'semaineDepassee'; mois: CleMois; numero: number; depassement: Centimes; joursRestants: number; budgetMoisRestant: Centimes; parJourMois: Centimes; joursRestantsMois: number }
  | { type: 'reserveDepasse'; depassement: Centimes }
)

export type Recommandation = { cle: string; confiance: Confiance } & (
  | { type: 'finDeMois'; mois: CleMois; manque: Centimes; fin: DateCivile; joursRestants: number; parJour: Centimes }
  | {
      type: 'effort'
      objectifId: string
      libelle: string
      dateCible: CleMois
      restant: Centimes
      effortMensuel: Centimes
      effortHebdo: Centimes
      versementMensuel: Centimes | null
      risque: Risque
      dateDepassee: boolean
    }
  | { type: 'reduction'; objectifId: string; libelle: string; chargeId: string; charge: string; budget: Centimes; montant: Centimes; avant: CleMois; apres: CleMois; gainMois: number }
  | { type: 'prime'; objectifId: string; libelle: string; sourceId: string; source: string; date: DateCivile; montant: Centimes; certitude: Certitude; avant: CleMois; apres: CleMois; gainMois: number }
  | { type: 'disponible'; objectifId: string; libelle: string; montant: Centimes; avant: CleMois; apres: CleMois; gainMois: number }
  | { type: 'fondsSecurite'; essentielMensuel: Centimes; cible: Centimes }
)

export interface OptionsConseils {
  aujourdhui: DateCivile
  debutSemaine?: number
  report?: boolean
  regles?: ReglesScenarios
  /** Mois clôturés : figés, ils ne génèrent plus d'alerte. */
  moisClos?: CleMois[]
  /** Charges essentielles par mois (équivalent mensuel), pour le fonds de sécurité. */
  essentielMensuel?: Centimes
}

/** Rien en dessous : une alerte ou une suggestion de quelques dirhams n'aide pas. */
const SEUIL = 10_000
/** Pas des réductions proposées (10 %, puis 20 % du budget), arrondies à 100 DH. */
const PAS_REDUCTION = [0.1, 0.2]
/** Primes regardées : les 6 prochains mois. */
const MOIS_PRIMES = 6

const arrondi100 = (montant: number) => Math.max(SEUIL, Math.round(montant / SEUIL) * SEUIL)

// --- Alertes ---

export function alertes(calendrier: Calendrier, donnees: DonneesObjectifs, { aujourdhui, debutSemaine = 1, report = false, moisClos = [] }: OptionsConseils): Alerte[] {
  const clos = new Set<string>(moisClos)
  const courant = calendrier.moisContenant(aujourdhui).cle
  const precedent = decalerMois(courant, -1)
  // Le mois précédent ne compte que si le suivi avait commencé : pas d'alerte sur l'avant-MySalary.
  const suivi = calendrier.debutSuivi !== null && calendrier.debutSuivi <= calendrier.mois(precedent).fin
  const ouverts = [...(suivi ? [precedent] : []), courant].filter((m) => !clos.has(m))
  const liste: Alerte[] = []

  // Paies : en retard (pas confirmée après la date prévue) ou prévue aujourd'hui.
  for (const m of [...ouverts, decalerMois(courant, 1)]) {
    if (clos.has(m)) continue
    const paie = calendrier.paies.paie(m)
    if (!paie || paie.statut === 'recue') continue
    const montant = centimes(paie.totalPrevu)
    if (paie.statut === 'enRetard') liste.push({ cle: `paie:${m}`, type: 'paieEnRetard', mois: m, datePrevue: paie.datePrevue, joursDeRetard: paie.joursDeRetard, montant })
    else if (paie.datePrevue === aujourdhui) liste.push({ cle: `paie:${m}`, type: 'paieAujourdhui', mois: m, montant })
  }

  // Revenus versés à part, attendus et pas reçus.
  for (const r of calendrier.revenusPrevus(decalerMois(courant, -3), decalerMois(courant, 1))) {
    if (r.versement !== 'dateSeparee' || r.statut !== 'enRetard' || !ouverts.includes(r.moisBudget)) continue
    liste.push({ cle: `revenu:${r.sourceId}:${r.moisVersement}`, type: 'revenuEnRetard', sourceId: r.sourceId, libelle: r.libelle, datePrevue: r.datePrevue, montant: r.montantPrevu })
  }

  // Échéances passées pas (entièrement) payées : charges fixes, ponctuels, dettes.
  for (const m of ouverts) {
    for (const l of calendrier.suiviDuMois(m).lignes) {
      if (l.date >= aujourdhui || l.reste <= 0) continue
      liste.push({ cle: `${l.origine}:${l.id}:${l.date}`, type: 'echeanceEnRetard', origine: l.origine, id: l.id, libelle: l.libelle, date: l.date, reste: l.reste, mois: m })
    }
    for (const e of calendrier.echeancesDettes(m)) {
      if (e.date >= aujourdhui || e.attendu <= 0) continue
      liste.push({ cle: `dette:${e.detteId}:${e.numero}`, type: 'echeanceEnRetard', origine: 'dette', id: e.detteId, libelle: e.libelle, date: e.date, reste: e.attendu, mois: m })
    }
  }

  if (!clos.has(courant)) {
    const mois = calendrier.mois(courant)
    for (const e of calendrier.suiviDuMois(courant).enveloppes) {
      if (e.reste < 0) liste.push({ cle: `enveloppe:${e.id}`, type: 'enveloppeDepassee', id: e.id, libelle: e.libelle, budget: e.budget, depassement: centimes(-e.reste), mois: courant })
    }
    const semaines = suiviDesSemaines(calendrier, courant, { debutSemaine, report, aujourdhui })
    const s = semaines.semaines.find((x) => x.statut === 'enCours')
    if (s && semaines.budget > 0 && s.reste < 0) {
      const joursRestantsMois = ecartJours(aujourdhui, mois.fin) + 1
      const budgetMoisRestant = centimes(Math.max(0, semaines.budget - semaines.depense))
      liste.push({
        cle: `semaine:${courant}:${s.numero}`,
        type: 'semaineDepassee',
        mois: courant,
        numero: s.numero,
        depassement: centimes(-s.reste),
        joursRestants: s.nbJours - s.joursEcoules,
        budgetMoisRestant,
        parJourMois: centimes(Math.floor(budgetMoisRestant / joursRestantsMois)),
        joursRestantsMois,
      })
    }
  }

  const { depassement } = etatEpargne(donnees)
  if (depassement > 0) liste.push({ cle: 'reserve', type: 'reserveDepasse', depassement })
  return liste
}

// --- Recommandations ---

const CONFIANCE_CERTITUDE: Record<Certitude, Confiance> = { garanti: 'elevee', probable: 'moyenne', incertain: 'faible' }

export function recommandations(calendrier: Calendrier, donnees: DonneesObjectifs, { aujourdhui, regles = REGLES_SCENARIOS_DEFAUT, essentielMensuel }: OptionsConseils): Recommandation[] {
  const liste: Recommandation[] = []
  const courant = calendrier.moisContenant(aujourdhui).cle

  // Fin de mois : l'estimation du mois en cours (R23) passe sous zéro.
  const bilan = bilanDuMois(calendrier, courant)
  if (bilan.estimation && bilan.estimation.resteFinDeMois <= -SEUIL) {
    const manque = centimes(-bilan.estimation.resteFinDeMois)
    const joursRestants = ecartJours(aujourdhui, bilan.mois.fin) + 1
    liste.push({ cle: `finDeMois:${courant}`, type: 'finDeMois', confiance: 'moyenne', mois: courant, manque, fin: bilan.mois.fin, joursRestants, parJour: centimes(Math.ceil(manque / joursRestants)) })
  }

  const { suivi, projections } = analyser(calendrier, donnees, aujourdhui, { regles })

  // Effort pour tenir la date : objectifs datés qui ne sont pas « sûrs ».
  const aRisque = suivi.objectifs.filter((o) => o.statut === 'actif' && !o.atteint && o.dateCible && o.risque && o.risque !== 'sur' && o.effortMensuel)
  for (const o of aRisque) {
    liste.push({
      cle: `effort:${o.id}`,
      type: 'effort',
      confiance: 'elevee',
      objectifId: o.id,
      libelle: o.libelle,
      dateCible: o.dateCible!,
      restant: o.restant,
      effortMensuel: o.effortMensuel!,
      effortHebdo: o.effortHebdo!,
      versementMensuel: o.versementMensuel,
      risque: o.risque!,
      dateDepassee: o.dateDepassee,
    })
  }

  // Leviers chiffrés pour le premier objectif à risque (projection réaliste, comparée à elle-même).
  const cible = aRisque[0]
  const avant = cible ? (projections.realiste.dates.get(cible.id) ?? null) : null
  if (cible && avant) {
    const dateAvec = (objectifs: Objectif[], ajustements: Ajustements) =>
      projeter(calendrier, objectifs, donnees.mouvementsEpargne, { aujourdhui, regle: regles.realiste, ajustements }).dates.get(cible.id) ?? null
    const gain = (apres: CleMois | null, base: CleMois | null = avant) => (apres && base ? ecartMois(apres, base) : 0)

    // Réduire la plus grosse enveloppe non essentielle à partir du mois prochain.
    const enveloppe = calendrier
      .chargesDuMois(decalerMois(courant, 1))
      .lignes.filter((l) => l.origine === 'enveloppe' && !l.essentielle)
      .sort((a, b) => b.montant - a.montant)[0]
    if (enveloppe && enveloppe.montant >= SEUIL) {
      for (const pas of PAS_REDUCTION) {
        const montant = centimes(Math.min(enveloppe.montant, arrondi100(enveloppe.montant * pas)))
        const apres = dateAvec(donnees.objectifs, { reductions: [{ chargeId: enveloppe.id, montant }] })
        if (gain(apres) >= 1) {
          liste.push({ cle: `reduction:${cible.id}:${enveloppe.id}`, type: 'reduction', confiance: 'moyenne', objectifId: cible.id, libelle: cible.libelle, chargeId: enveloppe.id, charge: enveloppe.libelle, budget: enveloppe.montant, montant, avant, apres: apres!, gainMois: gain(apres) })
          break
        }
      }
    }

    // Prochaine prime prévue : la date de l'objectif avec et sans elle.
    const prime = calendrier
      .revenusPrevus(courant, decalerMois(courant, MOIS_PRIMES))
      .find((r) => r.type === 'prime' && r.statut === 'prevu' && r.moisBudget >= courant)
    if (prime) {
      const retenue = prime.certitude === 'garanti' || regles.realiste.revenus.includes(prime.certitude)
      const autre = dateAvec(donnees.objectifs, { primes: [{ mois: prime.moisBudget, montant: centimes(retenue ? -prime.montantPrevu : prime.montantPrevu) }] })
      const [avec, sans] = retenue ? [avant, autre] : [autre, avant]
      if (avec && sans && gain(avec, sans) >= 1) {
        liste.push({
          cle: `prime:${cible.id}:${prime.sourceId}:${prime.moisVersement}`,
          type: 'prime',
          confiance: CONFIANCE_CERTITUDE[prime.certitude],
          objectifId: cible.id,
          libelle: cible.libelle,
          sourceId: prime.sourceId,
          source: prime.libelle,
          date: prime.datePrevue,
          montant: prime.montantPrevu,
          certitude: prime.certitude,
          avant: sans,
          apres: avec,
          gainMois: gain(avec, sans),
        })
      }
    }

    // Épargne disponible (non réservée) affectée à l'objectif.
    const montant = centimes(Math.min(suivi.epargne.disponible, cible.restant))
    if (montant >= SEUIL) {
      const objectifs = donnees.objectifs.map((o) => (o.id === cible.id ? { ...o, montantInitial: centimes(o.montantInitial + montant) } : o))
      const apres = dateAvec(objectifs, {})
      if (gain(apres) >= 1) liste.push({ cle: `disponible:${cible.id}`, type: 'disponible', confiance: 'moyenne', objectifId: cible.id, libelle: cible.libelle, montant, avant, apres: apres!, gainMois: gain(apres) })
    }
  }

  // Fonds de sécurité : aucun objectif de ce type (sauf abandonné), des charges essentielles connues.
  const aUnFonds = donnees.objectifs.some((o) => o.type === 'securite' && o.statut !== 'abandonne')
  if (!aUnFonds && essentielMensuel && essentielMensuel > 0) {
    liste.push({ cle: 'fondsSecurite', type: 'fondsSecurite', confiance: 'elevee', essentielMensuel, cible: cibleFondsSecurite(essentielMensuel).min })
  }
  return liste
}
