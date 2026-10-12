import type { PointFlux } from '../../components/graphiques/GraphiqueFlux'
import type { PointTrajectoire } from '../../components/graphiques/GraphiqueTrajectoire'

/**
 * Données de DÉMONSTRATION de la vitrine. Elles ne sont pas réelles
 * et sont toujours affichées avec la mention « exemple » (produit.md (Plan) § 7.6).
 * Montants en centimes. Les totaux sont écrits en dur : la vitrine ne calcule rien.
 */
const dh = (v: number) => v * 100

export interface LigneMois {
  id: string
  libelle: string
  categorie: string
  prevu: number
  /** null = pas encore confirmé (reste « prévu »). */
  reel: number | null
  ecart: number | null
}

export const lignesMoisExemple: LigneMois[] = [
  { id: 'salaire', libelle: 'Salaire fixe', categorie: 'Revenu', prevu: dh(10_000), reel: dh(10_000), ecart: 0 },
  { id: 'prime', libelle: 'Prime de février', categorie: 'Revenu', prevu: dh(1_000), reel: dh(1_000), ecart: 0 },
  { id: 'famille', libelle: 'Aide familiale', categorie: 'Engagement', prevu: dh(1_000), reel: dh(1_000), ecart: 0 },
  { id: 'loisirs', libelle: 'Loisirs', categorie: 'Enveloppe', prevu: dh(1_500), reel: dh(1_820), ecart: dh(-320) },
  { id: 'abonnement', libelle: 'Abonnement', categorie: 'Charge fixe', prevu: dh(240), reel: null, ecart: null },
]

export const totauxMoisExemple = {
  revenus: dh(11_000),
  depenses: dh(2_820),
  epargne: dh(4_000),
  reste: dh(4_180),
}

export const trajectoireExemple: PointTrajectoire[] = [
  { periode: 'oct.', reel: dh(10_000) },
  { periode: 'nov.', reel: dh(15_200) },
  { periode: 'déc.', reel: dh(21_000) },
  { periode: 'janv.', reel: dh(25_500), projete: dh(25_500) },
  { periode: 'févr.', projete: dh(33_000) },
  { periode: 'mars', projete: dh(41_500) },
  { periode: 'avr.', projete: dh(48_600) },
  { periode: 'mai', projete: dh(55_700) },
  { periode: 'juin', projete: dh(63_800) },
  { periode: 'juil.', projete: dh(70_900) },
]

export const fluxExemple: PointFlux[] = [
  { periode: 'août', revenus: dh(10_000), depenses: dh(4_900), epargne: dh(4_000) },
  { periode: 'sept.', revenus: dh(15_000), depenses: dh(4_875), epargne: dh(9_000) },
  { periode: 'oct.', revenus: dh(10_000), depenses: dh(5_925), epargne: dh(3_500) },
  { periode: 'nov.', revenus: dh(10_000), depenses: dh(4_875), epargne: dh(4_500) },
  { periode: 'déc.', revenus: dh(10_000), depenses: dh(5_425), epargne: dh(4_000) },
  { periode: 'janv.', revenus: dh(13_500), depenses: dh(2_875), epargne: dh(9_500) },
]
