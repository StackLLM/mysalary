import type { Alerte, CleMois, DateCivile, Recommandation } from '@mysalary/moteur'
import { describe, expect, it } from 'vitest'
import { redigerAlerte, redigerRecommandation } from './conseils'

const n = (s: string) => s.replace(/[  ]/g, ' ')
const mois = (s: string) => s as CleMois
const date = (s: string) => s as DateCivile
const c = (v: number) => v as never

const ALERTES: Alerte[] = [
  { cle: 'a', type: 'paieEnRetard', mois: mois('2027-01'), datePrevue: date('2026-12-27'), joursDeRetard: 2, montant: c(1_000_000) },
  { cle: 'b', type: 'paieAujourdhui', mois: mois('2027-02'), montant: c(1_000_000) },
  { cle: 'c', type: 'revenuEnRetard', sourceId: 's', libelle: 'Cours', datePrevue: date('2027-02-10'), montant: c(100_000) },
  { cle: 'd', type: 'echeanceEnRetard', origine: 'fixe', id: 'i', libelle: 'Internet', date: date('2027-01-08'), reste: c(30_000), mois: mois('2027-01') },
  { cle: 'e', type: 'echeanceEnRetard', origine: 'dette', id: 'p', libelle: 'Prêt', date: date('2027-01-08'), reste: c(80_000), mois: mois('2027-01') },
  { cle: 'f', type: 'enveloppeDepassee', id: 'co', libelle: 'Courses', budget: c(200_000), depassement: c(30_000), mois: mois('2027-01') },
  { cle: 'g', type: 'semaineDepassee', mois: mois('2027-01'), numero: 3, depassement: c(151_000), joursRestants: 0, budgetMoisRestant: c(120_000), parJourMois: c(7_058), joursRestantsMois: 17 },
  { cle: 'h', type: 'reserveDepasse', depassement: c(200_000) },
]

const RECOMMANDATIONS: Recommandation[] = [
  { cle: '1', type: 'finDeMois', confiance: 'moyenne', mois: mois('2027-01'), manque: c(360_000), fin: date('2027-01-26'), joursRestants: 17, parJour: c(21_177) },
  {
    cle: '2',
    type: 'effort',
    confiance: 'elevee',
    objectifId: 'moto',
    libelle: 'Moto',
    dateCible: mois('2027-12'),
    restant: c(8_300_000),
    effortMensuel: c(691_667),
    effortHebdo: c(159_616),
    versementMensuel: null,
    risque: 'horsPortee',
    dateDepassee: false,
  },
  { cle: '3', type: 'reduction', confiance: 'moyenne', objectifId: 'moto', libelle: 'Moto', chargeId: 'l', charge: 'Loisirs', budget: c(150_000), montant: c(20_000), avant: mois('2028-11'), apres: mois('2028-10'), gainMois: 1 },
  {
    cle: '4',
    type: 'prime',
    confiance: 'moyenne',
    objectifId: 'moto',
    libelle: 'Moto',
    sourceId: 'p',
    source: 'Prime de mars',
    date: date('2027-03-10'),
    montant: c(500_000),
    certitude: 'garanti',
    avant: mois('2028-12'),
    apres: mois('2028-11'),
    gainMois: 1,
  },
  { cle: '5', type: 'disponible', confiance: 'moyenne', objectifId: 'moto', libelle: 'Moto', montant: c(800_000), avant: mois('2028-11'), apres: mois('2028-09'), gainMois: 2 },
  { cle: '6', type: 'fondsSecurite', confiance: 'elevee', essentielMensuel: c(550_000), cible: c(1_650_000) },
]

describe('alertes rédigées', () => {
  it('un titre, un message clair et une action vers l’écran qui règle le problème', () => {
    const [paie, , , internet, pret, courses, semaine] = ALERTES.map(redigerAlerte)
    expect(n(paie!.message)).toBe('Ta paie de janvier 2027 (10 000 DH) était prévue le 27 déc. 2026, il y a 2 jours. Confirme-la dès qu’elle arrive.')
    expect(internet!.action).toEqual({ libelle: 'Ouvrir le mois', chemin: '/mois?mois=2027-01' })
    expect(pret!.action.chemin).toBe('/plan?onglet=dettes')
    expect(n(courses!.titre)).toBe('Enveloppe « Courses » dépassée')
    expect(n(semaine!.message)).toBe(
      'Dépassé d’environ 1 510 DH. C’est le dernier jour de la semaine. Pour rester dans le budget flexible du mois : environ 71 DH par jour pendant 17 jours.',
    )
  })

  it('épargne : compte à déclarer, versement prévu à noter', () => {
    const declarer = redigerAlerte({ cle: 'r', type: 'epargneNonDeclaree', reserve: c(900_000) })
    expect(n(declarer.message)).toBe('Tes objectifs ont 9 000 DH de côté, mais aucun compte d’épargne n’est déclaré. Indique son solde réel pour suivre tes versements.')
    expect(declarer.action).toEqual({ libelle: 'Déclarer mon compte', chemin: '/plan?onglet=epargne' })
    const versement = redigerAlerte({ cle: 'v', type: 'versementPrevu', objectifId: 'o', libelle: 'Moto', reste: c(400_000), mois: mois('2026-10') })
    expect(n(versement.titre)).toBe('Versement « Moto » à faire')
    expect(n(versement.message)).toBe('4 000 DH prévus ce mois-ci pour « Moto ». Note le versement quand il est fait.')
  })
})

describe('recommandations rédigées (R24, R25)', () => {
  const textes = RECOMMANDATIONS.map(redigerRecommandation)

  it('message, impact, base de calcul et condition ; montants d’effort arrondis au dirham supérieur', () => {
    const [fin, effort, reduction, prime, disponible, fonds] = textes
    expect(n(fin!.impact)).toBe('Dépenser 3 600 DH de moins d’ici là, soit environ 212 DH par jour pendant 17 jours, permettrait de finir le mois à l’équilibre.')
    expect(n(effort!.message)).toBe('Pour avoir « Moto » en décembre 2027, il faudrait environ 6 917 DH par mois, soit environ 1 597 DH par semaine.')
    expect(effort!.impact).toBe('Au rythme prévu, la date n’est tenue dans aucun scénario.')
    expect(n(reduction!.message)).toBe('Réduire « Loisirs » de 200 DH par mois avancerait « Moto » d’environ 1 mois (octobre 2028 au lieu de novembre 2028).')
    expect(reduction!.action!.chemin).toBe('/simulateur?objectif=moto&reduction=l&montant=200')
    expect(n(prime!.base)).toBe('Projection réaliste de « Moto », avec et sans cette prime (notée garantie).')
    expect(n(disponible!.message)).toMatch(/^8 000 DH de ton épargne ne sont réservés à aucun objectif\. Les affecter à « Moto » l’avancerait d’environ 2 mois/)
    expect(n(fonds!.message)).toContain('soit 16 500 DH')
    expect(n(redigerRecommandation({ ...RECOMMANDATIONS[4]!, avant: mois('2029-04') } as Recommandation).message)).toContain('(septembre 2028 au lieu d’avril 2029)')
    for (const t of textes) for (const champ of [t.titre, t.message, t.impact, t.base, t.condition]) expect(champ.length).toBeGreaterThan(0)
  })

  it('jamais de garantie : conditionnel, « environ », une condition à chaque fois', () => {
    const interdit = /\b(tu auras|tu vas|c’est sûr|à coup sûr|certainement|sans aucun doute|garanti que)\b/i
    for (const t of textes) {
      for (const champ of [t.titre, t.message, t.impact, t.condition]) expect(champ).not.toMatch(interdit)
      expect(t.condition).toMatch(/^(Si |Montant indicatif)/)
    }
    // Toute phrase qui projette une date ou un montant futur est au conditionnel.
    for (const t of textes.filter((x) => x.type !== 'fondsSecurite')) expect(t.message).toMatch(/rait\b|faudrait|manquerait/)
  })
})
