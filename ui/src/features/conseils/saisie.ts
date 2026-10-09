import { formaterMois, formaterMontant, type IndicateurObjectif, type IndicateursDto } from '@mysalary/partage'

/** Petites règles d'affichage des indicateurs ; les calculs sont dans le moteur. */

/** 0,583 → « 58 % » ; sans revenu → « — » (jamais 0 %). */
export const pourcentage = (valeur: number | null) => (valeur === null ? '—' : `${Math.round(valeur * 100)} %`)

/** « +306 DH (+6 %) » / « −150 DH (−21 %) » ; le moins est déjà écrit par le format. */
export function texteEcart(montant: number, part: number | null) {
  const signe = montant > 0 ? '+' : ''
  const pct = part === null ? '' : ` (${part > 0 ? '+' : part < 0 ? '−' : ''}${Math.round(Math.abs(part) * 100)} %)`
  return `${signe}${formaterMontant(montant)}${pct}`
}

export type LigneIndicateur = { cle: string; libelle: string; valeur: string; detail: string; base: string; ton?: 'alerte' | 'positif' }

/** Lignes de la carte « Indicateurs » d'un mois, dans l'ordre des questions (UX.md § 1). */
export function lignesIndicateurs(k: IndicateursDto): LigneIndicateur[] {
  const lignes: LigneIndicateur[] = []
  const r = k.resteADepenser
  if (r) {
    lignes.push({
      cle: 'reste',
      libelle: 'Reste à dépenser',
      valeur: formaterMontant(r.montant),
      detail: `${r.montant > 0 ? `${formaterMontant(r.parJour)} par jour · ` : ''}${r.joursRestants} jour${r.joursRestants > 1 ? 's' : ''} restant${r.joursRestants > 1 ? 's' : ''}${r.nature === 'prevu' ? ' · prévu' : ''}`,
      base: `${r.nature === 'prevu' ? 'Paie prévue' : 'Revenus reçus'} (${formaterMontant(r.revenus)}) − sorties (${formaterMontant(r.sorties)}) − charges datées encore à payer (${formaterMontant(r.engagements)}) − épargne prévue pas encore versée (${formaterMontant(r.epargneRestante)}).`,
      ton: r.montant < 0 ? 'alerte' : undefined,
    })
  }
  const s = k.resteSemaine
  if (s) {
    lignes.push({
      cle: 'semaine',
      libelle: 'Reste flexible (semaine)',
      valeur: formaterMontant(s.reste),
      detail: s.reste > 0 ? `${formaterMontant(s.parJour)} par jour` : 'budget de la semaine utilisé',
      base: `Disponible de la semaine (${formaterMontant(s.disponible)}) − dépensé en enveloppes et hors plan (${formaterMontant(s.depense)}).`,
      ton: s.reste < 0 ? 'alerte' : undefined,
    })
  }
  const e = k.tauxEpargne
  lignes.push({
    cle: 'epargne',
    libelle: 'Taux d’épargne',
    valeur: pourcentage(e.reel),
    detail: `prévu ${pourcentage(e.prevu)}`,
    base: `Épargne réelle (${formaterMontant(e.epargneReelle)}) ÷ revenus reçus (${formaterMontant(e.revenusReels)}). Prévu : ${formaterMontant(e.epargnePrevue)} ÷ ${formaterMontant(e.revenusPrevus)}.`,
  })
  const c = k.tauxCharges
  lignes.push({
    cle: 'charges',
    libelle: 'Taux de charges',
    valeur: pourcentage(c.reel),
    detail: `prévu ${pourcentage(c.prevu)}`,
    base: `Sorties réelles (${formaterMontant(c.sortiesReelles)}) ÷ revenus reçus (${formaterMontant(c.revenusReels)}). Prévu : ${formaterMontant(c.chargesPrevues)} ÷ ${formaterMontant(c.revenusPrevus)}.`,
  })
  if (k.ecart) {
    const a = k.ecart
    lignes.push({
      cle: 'ecart',
      libelle: 'Écart au plan',
      valeur: texteEcart(a.montant, a.pourcentage),
      detail: a.montant > 0 ? 'dépensé de plus que prévu' : a.montant < 0 ? 'dépensé de moins que prévu' : 'conforme au plan',
      base:
        a.base === 'aDate'
          ? `Sorties réelles à ce jour (${formaterMontant(a.reel)}) − prévu cumulé à ce jour (${formaterMontant(a.prevu)}).`
          : `Sorties réelles du mois (${formaterMontant(a.reel)}) − charges prévues (${formaterMontant(a.prevu)}).`,
      ton: a.montant > 0 ? 'alerte' : a.montant < 0 ? 'positif' : undefined,
    })
  }
  const v = k.partVariable
  lignes.push({
    cle: 'variable',
    libelle: 'Part variable du revenu',
    valeur: pourcentage(v.part),
    detail: 'sur 12 mois · prévu',
    base: `Primes et revenus variables (${formaterMontant(v.variable)}) ÷ revenus prévus des 12 prochains mois (${formaterMontant(v.total)}).`,
  })
  const o = k.objectif
  if (o) {
    lignes.push({
      cle: 'progression',
      libelle: `Progression « ${o.libelle} »`,
      valeur: pourcentage(o.progression),
      detail: `${formaterMontant(o.epargne)} sur ${formaterMontant(o.montantCible)}`,
      base: 'Épargné à ce jour ÷ cible de l’objectif prioritaire.',
    })
    lignes.push({
      cle: 'delai',
      libelle: 'Délai avant objectif',
      valeur: o.dateEstimee ? formaterMois(o.dateEstimee) : 'au-delà de 10 ans',
      detail: texteRetard(o),
      base: 'Date estimée en scénario réaliste (projection), comparée à la date souhaitée.',
      ton: o.retardMois !== null && o.retardMois > 0 ? 'alerte' : undefined,
    })
  }
  return lignes
}

/** « 11 mois après la date souhaitée », « à la date souhaitée », « sans date souhaitée ». */
export function texteRetard(o: Pick<IndicateurObjectif, 'dateCible' | 'retardMois'>) {
  if (!o.dateCible) return 'projection · sans date souhaitée'
  if (o.retardMois === null) return `projection · souhaité en ${formaterMois(o.dateCible)}`
  if (o.retardMois === 0) return 'projection · à la date souhaitée'
  return `projection · ${Math.abs(o.retardMois)} mois ${o.retardMois > 0 ? 'après' : 'avant'} la date souhaitée`
}
