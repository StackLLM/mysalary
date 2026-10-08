import { formaterMontant } from '@mysalary/partage'

/**
 * Thème commun des graphiques (UI.md § 8).
 * Palette des séries validée par le validateur de la skill dataviz (docs/lots/Lot-02-design-system.md).
 */
export const COULEURS = {
  serieUnique: '#7D8C82',
  serieUniqueFonce: '#56635A',
  revenus: '#3A74B8',
  depenses: '#D08A2E',
  epargne: '#9C4F8C',
  cible: '#121413',
  aujourdhui: '#3D4140',
  axe: '#EEEEEE',
  graduation: '#6F7276',
  hachure: '#9EA9A1',
} as const

export const STYLE_AXE = {
  stroke: COULEURS.axe,
  tick: { fill: COULEURS.graduation, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const

/** Montant court pour les graduations : 12 500 DH → « 12,5 k ». */
export function montantCourt(centimes: number): string {
  const dirhams = centimes / 100
  if (Math.abs(dirhams) >= 1000) {
    const k = dirhams / 1000
    return `${k.toLocaleString('fr-FR', { maximumFractionDigits: Math.abs(k) >= 10 ? 0 : 1 })} k`
  }
  return dirhams.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

export const montant = (centimes: number) => formaterMontant(Math.round(centimes))
