import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import { bilanDuMois, rythmeDuMois, syntheseCharges } from './bilan'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import type { Depense } from './depenses'
import { creerCalendrier, type BornesFigees } from './periodes'
import type { SourceRevenu } from './revenus'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Paie le 27 qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv.
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }

const paieJanvier: PaieEnregistree = {
  moisFinance: m('2027-01'),
  dateReelle: d('2026-12-27'),
  datePrevue: d('2026-12-27'),
  lignes: [{ id: 'l1', type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_050_000), sourceId: null }],
}

const freelance: SourceRevenu = {
  id: 's1',
  libelle: 'Freelance',
  type: 'variable',
  montant: centimes(100_000),
  frequence: 'mensuelle',
  mois: [],
  versement: 'dateSeparee',
  jour: 15,
  certitude: 'probable',
  debut: m('2027-01'),
  fin: null,
}

const loyer: Charge = {
  id: 'loyer',
  libelle: 'Loyer',
  categorieId: 'logement',
  nature: 'fixe',
  montant: centimes(350_000),
  frequence: 'mensuelle',
  mois: [],
  jour: 5,
  debut: m('2027-01'),
  fin: null,
  essentielle: true,
}
const courses: Charge = { ...loyer, id: 'courses', libelle: 'Courses', categorieId: 'alimentation', nature: 'enveloppe', montant: centimes(250_000), jour: null }

const depense = (id: string, montant: number, date: string, lien: Partial<Depense> = {}): Depense => ({
  id,
  date: d(date),
  montant: centimes(montant),
  categorieId: 'x',
  libelle: '',
  chargeId: null,
  echeance: null,
  ponctuelId: null,
  ...lien,
})

function calendrier(aujourdhui: string, { paies = [paieJanvier], moisClotures = [] as BornesFigees[] } = {}) {
  return creerCalendrier({
    mode: 'cyclePaie',
    contrats: [contrat],
    paies,
    aujourdhui: d(aujourdhui),
    sources: [freelance],
    revenusRecus: [
      { id: 'r1', sourceId: 's1', moisOccurrence: m('2027-01'), date: d('2027-01-16'), montant: centimes(90_000), libelle: 'Freelance' },
      { id: 'r2', sourceId: null, moisOccurrence: null, date: d('2027-01-03'), montant: centimes(20_000), libelle: 'Cadeau' },
    ],
    charges: [loyer, courses],
    ponctuels: [{ id: 'assurance', libelle: 'Assurance', categorieId: 'assurances', montant: centimes(240_000), date: d('2027-01-15'), certitude: 'garanti' }],
    dettes: [{ id: 'pret', libelle: 'Prêt', creancier: '', montantTotal: centimes(300_000), mensualite: centimes(100_000), premiereEcheance: d('2027-01-10') }],
    paiementsDettes: [{ id: 'p1', detteId: 'pret', date: d('2027-01-10'), montant: centimes(100_000) }],
    depenses: [
      depense('loyer-janv', 360_000, '2027-01-04', { chargeId: 'loyer', echeance: d('2027-01-05') }),
      depense('loyer-fev', 350_000, '2027-01-19', { chargeId: 'loyer', echeance: d('2027-02-05') }),
      depense('marche', 200_000, '2027-01-10', { chargeId: 'courses' }),
      depense('cinema', 15_000, '2027-01-12'),
    ],
    moisClotures,
  })
}

const resume = (lignes: ReturnType<typeof bilanDuMois>['lignes']) => lignes.map((l) => [l.famille, l.libelle, l.prevu, l.reel, l.ecart, l.statut])

describe('bilan d’un mois en cours', () => {
  const bilan = bilanDuMois(calendrier('2027-01-20'), m('2027-01'))

  it('chaque ligne prévue à côté de son réel ; l’écart seulement quand le réel est connu', () => {
    expect(resume(bilan.lignes)).toEqual([
      ['revenu', 'Salaire', 1_000_000, 1_050_000, 50_000, 'confirme'],
      ['revenu', 'Freelance', 100_000, 90_000, -10_000, 'confirme'],
      ['revenu', 'Cadeau', null, 20_000, null, 'confirme'],
      ['fixe', 'Loyer', 350_000, 360_000, 10_000, 'confirme'],
      ['enveloppe', 'Courses', 250_000, 200_000, null, 'enCours'],
      ['ponctuel', 'Assurance', 240_000, null, null, 'enRetard'],
      ['dette', 'Prêt', 100_000, 100_000, 0, 'confirme'],
      ['horsPlan', 'Hors plan', null, 15_000, null, 'confirme'],
      // Le loyer de février payé le 19 janvier : sorti en janvier, jamais caché.
      ['autreMois', 'Payé ce mois pour un autre mois', null, 350_000, null, 'confirme'],
    ])
    expect(bilan.aConfirmer.map((l) => l.libelle)).toEqual(['Assurance'])
  })

  it('totaux : réel et prévu séparés, estimation de fin de mois', () => {
    expect(bilan.totaux).toEqual({
      revenusPrevus: 1_100_000,
      revenusReels: 1_160_000,
      chargesPrevues: 940_000,
      sortiesReelles: 1_025_000,
      restePrevu: 160_000,
      resteReel: 135_000,
      ecart: null,
    })
    // Reste à sortir : l'assurance (2 400 DH) et 500 DH de courses.
    expect(bilan.estimation).toEqual({ revenusAttendus: 0, chargesAttendues: 290_000, resteFinDeMois: -155_000 })
  })

  it('la somme des lignes de charges réelles vaut les sorties réelles', () => {
    const charges = bilan.lignes.filter((l) => l.famille !== 'revenu')
    expect(charges.reduce((s, l) => s + (l.reel ?? 0), 0)).toBe(bilan.totaux.sortiesReelles)
  })

  it('synthèse : consommé des charges, hors plan à part, reste à payer toutes charges (enveloppes comprises)', () => {
    // Consommé : loyer 3 600 + courses 2 000 + prêt 1 000. Hors plan : 150. À payer : assurance 2 400 + 500 de courses = les 2 900 de l'estimation.
    // L'assurance (2 400 DH) est en retard : à confirmer. Les 500 DH de courses sont à venir.
    expect(syntheseCharges(bilan.lignes)).toEqual({ consomme: 660_000, horsPlan: 15_000, resteAPayer: 290_000, aConfirmer: 240_000, aVenir: 50_000 })
    expect(bilan.estimation?.chargesAttendues).toBe(290_000)
    expect(syntheseCharges([])).toEqual({ consomme: 0, horsPlan: 0, resteAPayer: 0, aConfirmer: 0, aVenir: 0 })
  })

  it('synthèse : sans dépassement, consommé + reste à payer = charges prévues', () => {
    const lignes = [
      { famille: 'fixe' as const, prevu: centimes(10_000), reel: centimes(10_000), statut: 'confirme' as const },
      { famille: 'ponctuel' as const, prevu: centimes(20_000), reel: null, statut: 'prevu' as const },
      { famille: 'enveloppe' as const, prevu: centimes(30_000), reel: centimes(12_000), statut: 'enCours' as const },
    ]
    const { consomme, resteAPayer } = syntheseCharges(lignes)
    expect([consomme, resteAPayer, consomme + resteAPayer]).toEqual([22_000, 38_000, 60_000])
  })

  it('synthèse : à confirmer = date passée sans paiement noté ; à confirmer + à venir = reste à payer', () => {
    const lignes = [
      { famille: 'fixe' as const, prevu: centimes(100_000), reel: null, statut: 'enRetard' as const },
      { famille: 'ponctuel' as const, prevu: centimes(20_000), reel: centimes(14_000), statut: 'partiel' as const },
      { famille: 'fixe' as const, prevu: centimes(30_000), reel: null, statut: 'prevu' as const },
      { famille: 'enveloppe' as const, prevu: centimes(40_000), reel: centimes(10_000), statut: 'enCours' as const },
    ]
    const s = syntheseCharges(lignes)
    expect([s.resteAPayer, s.aConfirmer, s.aVenir]).toEqual([166_000, 100_000, 66_000])
  })

  it('synthèse : une enveloppe d’un mois terminé ne laisse rien à payer', () => {
    const lignes = [{ famille: 'enveloppe' as const, prevu: centimes(30_000), reel: centimes(12_000), statut: 'confirme' as const }]
    expect(syntheseCharges(lignes)).toEqual({ consomme: 12_000, horsPlan: 0, resteAPayer: 0, aConfirmer: 0, aVenir: 0 })
  })

  it('synthèse : un ponctuel payé en partie ne laisse à payer que le manque', () => {
    const lignes = [{ famille: 'ponctuel' as const, prevu: centimes(20_000), reel: centimes(14_000), statut: 'partiel' as const }]
    expect(syntheseCharges(lignes)).toEqual({ consomme: 14_000, horsPlan: 0, resteAPayer: 6_000, aConfirmer: 0, aVenir: 6_000 })
  })

  it('le mois suivant voit son loyer déjà payé', () => {
    const fevrier = bilanDuMois(calendrier('2027-01-20'), m('2027-02'))
    expect(fevrier.lignes.find((l) => l.famille === 'fixe')).toMatchObject({ reel: 350_000, statut: 'confirme' })
    expect(fevrier.lignes.find((l) => l.famille === 'autreMois')).toMatchObject({ libelle: 'Déjà payé un autre mois', reel: -350_000 })
    expect(fevrier.lignes.find((l) => l.libelle === 'Salaire')).toMatchObject({ prevu: 1_000_000, reel: null, statut: 'prevu' })
  })
})

describe('bilan d’un mois terminé', () => {
  it('écart global et écart des enveloppes, pas d’estimation', () => {
    // La paie de février est reçue : janvier est terminé (sinon il se prolongerait, lot 4).
    const fevrier: PaieEnregistree = { moisFinance: m('2027-02'), dateReelle: d('2027-01-27'), datePrevue: d('2027-01-27'), lignes: paieJanvier.lignes }
    const bilan = bilanDuMois(calendrier('2027-01-28', { paies: [paieJanvier, fevrier] }), m('2027-01'))
    expect(bilan.mois.statut).toBe('passe')
    expect(bilan.totaux.ecart).toBe(-25_000)
    expect(bilan.lignes.find((l) => l.famille === 'enveloppe')).toMatchObject({ ecart: -50_000, statut: 'confirme' })
    expect(bilan.estimation).toBeNull()
  })
})

describe('rythme du mois', () => {
  it('prévu cumulé jusqu’au total des charges, réel cumulé jusqu’à aujourd’hui', () => {
    const points = rythmeDuMois(calendrier('2027-01-20'), m('2027-01'), d('2027-01-20'))
    expect(points).toHaveLength(31)
    expect(points.at(-1)).toEqual({ date: '2027-01-26', prevu: 940_000, reel: null })
    expect(points.find((p) => p.date === '2027-01-20')?.reel).toBe(1_025_000)
    expect(points.find((p) => p.date === '2027-01-21')?.reel).toBeNull()
    for (let i = 1; i < points.length; i++) expect(points[i]!.prevu).toBeGreaterThanOrEqual(points[i - 1]!.prevu)
  })
})

describe('mois clôturé', () => {
  it('garde ses bornes même si la paie suivante arrive plus tôt', () => {
    const fevrierTot: PaieEnregistree = { moisFinance: m('2027-02'), dateReelle: d('2027-01-24'), datePrevue: d('2027-01-27'), lignes: paieJanvier.lignes }
    const libre = calendrier('2027-02-01', { paies: [paieJanvier, fevrierTot] })
    expect(libre.mois(m('2027-01')).fin).toBe('2027-01-23')

    const fige = calendrier('2027-02-01', { paies: [paieJanvier, fevrierTot], moisClotures: [{ cle: m('2027-01'), debut: d('2026-12-27'), fin: d('2027-01-26') }] })
    expect(fige.mois(m('2027-01'))).toMatchObject({ debut: '2026-12-27', fin: '2027-01-26', sourceDebut: 'fige' })
    expect(fige.mois(m('2027-02'))).toMatchObject({ debut: '2027-01-27', sourceDebut: 'fige' })
    expect(fige.moisContenant(d('2027-01-25')).cle).toBe('2027-01')
    expect(fige.moisContenant(d('2027-01-27')).cle).toBe('2027-02')
    expect(fige.mois(m('2026-12')).fin).toBe('2026-12-26')
  })
})
