import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import type { Depense } from './depenses'
import { creerCalendrier, semainesDe } from './periodes'
import type { PaieEnregistree, VersionContrat } from './salaire'
import { suiviDesSemaines } from './semaines'
import { rythmeDuMois } from './bilan'
import { budgetEnveloppesParJour, planEnveloppe } from './enveloppes'
import { prochainsJours, semainePassee } from './aujourdhui'
import { equivalentMensuelCharge } from './charges'

// Paie le 27 qui finance le mois suivant : « janvier 2027 » va du dim. 27 déc. au mar. 26 janv. (31 jours).
// Semaines du lundi : 27 déc. (1 jour) · 28 déc.–3 janv. · 4–10 · 11–17 · 18–24 · 25–26 (2 jours).
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }

const paie = (moisFinance: string, date: string): PaieEnregistree => ({
  moisFinance: m(moisFinance),
  dateReelle: d(date),
  datePrevue: d(date),
  lignes: [{ id: moisFinance, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null }],
})

const loyer: Charge = {
  id: 'loyer',
  libelle: 'Loyer',
  categorieId: 'logement',
  nature: 'fixe',
  montant: centimes(350_000),
  frequence: 'mensuelle',
  mois: [],
  jour: 5,
  debut: m('2026-11'),
  fin: null,
  essentielle: true,
}
// 3 100 DH sur 31 jours : 100 DH par jour.
const courses: Charge = { ...loyer, id: 'courses', libelle: 'Courses', categorieId: 'alimentation', nature: 'enveloppe', montant: centimes(310_000), jour: null }

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

const DEPENSES = [
  depense('loyer', 350_000, '2027-01-04', { chargeId: 'loyer', echeance: d('2027-01-05') }),
  depense('marche', 30_000, '2027-01-05', { chargeId: 'courses' }),
  depense('cafe', 5_000, '2027-01-06'),
]

function calendrier(aujourdhui: string, { charges = [loyer, courses], depenses = DEPENSES, paies = [paie('2027-01', '2026-12-27')] } = {}) {
  return creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies, charges, depenses, aujourdhui: d(aujourdhui) })
}

const suivre = (aujourdhui: string, options: { report?: boolean; debutSemaine?: number; cle?: string } & Parameters<typeof calendrier>[1] = {}) =>
  suiviDesSemaines(calendrier(aujourdhui, options), m(options.cle ?? '2027-01'), { aujourdhui: d(aujourdhui), report: options.report, debutSemaine: options.debutSemaine })

describe('semaines d’un mois en cours', () => {
  const s = suivre('2027-01-06')

  it('budget flexible réparti jour par jour, semaines partielles au prorata', () => {
    expect(s.semaines.map((x) => [x.debut, x.nbJours, x.partielle, x.budget])).toEqual([
      ['2026-12-27', 1, true, 10_000],
      ['2026-12-28', 7, false, 70_000],
      ['2027-01-04', 7, false, 70_000],
      ['2027-01-11', 7, false, 70_000],
      ['2027-01-18', 7, false, 70_000],
      ['2027-01-25', 2, true, 20_000],
    ])
    expect(s.budget).toBe(310_000)
  })

  it('dépensé flexible = enveloppes + hors plan ; les charges ont leur propre colonne', () => {
    const w = s.semaines[2]!
    expect(w).toMatchObject({ statut: 'enCours', joursEcoules: 3, depense: 35_000, chargesPrevues: 350_000, chargesPayees: 350_000 })
    expect(w.charges).toEqual([{ origine: 'fixe', id: 'loyer', libelle: 'Loyer', date: '2027-01-05', montant: 350_000, statut: 'payee' }])
  })

  it('reste, écart au rythme et montant par jour de la semaine en cours', () => {
    const w = s.semaines[2]!
    // 3 jours écoulés : 300 DH de budget à date pour 350 DH dépensés.
    expect(w).toMatchObject({ report: 0, disponible: 70_000, reste: 35_000, ecart: -5_000, parJour: 7_000 })
    expect(s.semaines[1]).toMatchObject({ statut: 'passe', ecart: 70_000, parJour: null })
    expect(s.semaines[3]).toMatchObject({ statut: 'aVenir', joursEcoules: 0, ecart: null, tendance: null })
    expect(s.courante).toBe(3)
  })

  it('réponse en tête : avance sur le budget des jours écoulés', () => {
    // 11 jours écoulés (27 déc. → 6 janv.) : 1 100 DH de budget, 350 DH dépensés.
    expect(s.budgetADate).toBe(110_000)
    expect(s.reponse).toEqual({ type: 'avance', montant: 75_000 })
    const retard = suivre('2027-01-06', { depenses: [...DEPENSES, depense('fete', 100_000, '2027-01-06')] })
    expect(retard.reponse).toEqual({ type: 'retard', montant: 25_000 })
  })
})

describe('enveloppe consommée par semaine ou par jour, au rythme choisi par l’utilisateur', () => {
  // Moto : 300 DH pour le mois. L'utilisateur choisit combien ouvrir chaque semaine (ou chaque jour) ; MySalary ne divise rien.
  const moto: Charge = { ...courses, id: 'moto', libelle: 'Moto', montant: centimes(30_000), unite: 'semaine', rythme: centimes(10_000) }
  const plan = (charge: Charge, aujourdhui = '2027-01-06') => {
    const cal = calendrier(aujourdhui, { charges: [loyer, charge] })
    const mois = cal.mois(m('2027-01'))
    const e = cal.suiviDuMois(m('2027-01')).enveloppes[0]!
    return { cal, e, p: planEnveloppe(e, mois, semainesDe(mois, 1)) }
  }

  it('par semaine : 100 DH chaque semaine dès son premier jour, jusqu’à atteindre les 300 DH du mois', () => {
    const { cal, e, p } = plan(moto)
    expect(e).toMatchObject({ budget: 30_000, unite: 'semaine', rythme: 10_000 })
    expect(cal.chargesDuMois(m('2027-01')).totaux.enveloppe).toBe(30_000)
    expect(p.semaines.map((x) => [x.demande, x.ouvert])).toEqual([
      [10_000, 10_000],
      [10_000, 10_000],
      [10_000, 10_000],
      [10_000, 0],
      [10_000, 0],
      [10_000, 0],
    ])
    expect(p).toMatchObject({ ouvert: 30_000, aRepartir: 0, atteintLe: '2027-01-04' })
    // Le 27 déc. (case 0), le 28 déc. (case 1), le 4 janv. (case 8) : rien les autres jours.
    expect(p.parJour.filter((x) => x > 0)).toEqual([10_000, 10_000, 10_000])
    expect(p.parJour[8]).toBe(10_000)
  })

  it('par semaine : un montant choisi pour une semaine précise remplace le montant par semaine', () => {
    const { p } = plan({ ...moto, semaines: [{ debut: d('2026-12-28'), montant: centimes(5_000) }, { debut: d('2027-01-04'), montant: centimes(0) }] })
    expect(p.semaines.map((x) => [x.ouvert, x.ajuste])).toEqual([
      [10_000, false],
      [5_000, true],
      [0, true],
      [10_000, false],
      [5_000, false],
      [0, false],
    ])
    expect(p.atteintLe).toBe('2027-01-18')
  })

  it('montants trop bas : le reste du budget n’est ouvert par aucune semaine, il reste « à répartir »', () => {
    const { p, cal } = plan({ ...moto, rythme: centimes(2_000) })
    expect(p).toMatchObject({ ouvert: 12_000, aRepartir: 18_000, atteintLe: null })
    expect(suiviDesSemaines(cal, m('2027-01'), { aujourdhui: d('2027-01-06') })).toMatchObject({ budget: 30_000, aRepartir: 18_000 })
  })

  it('par jour : 20 DH chaque jour jusqu’aux 300 DH, atteints le 15e jour', () => {
    const { p, cal } = plan({ ...moto, unite: 'jour', rythme: centimes(2_000) })
    expect(p.parJour.slice(0, 16)).toEqual([...Array(15).fill(2_000), 0])
    expect(p).toMatchObject({ ouvert: 30_000, aRepartir: 0, atteintLe: '2027-01-10' })
    expect(budgetEnveloppesParJour(cal, m('2027-01'))[14]).toBe(2_000)
    const s = suiviDesSemaines(cal, m('2027-01'), { aujourdhui: d('2027-01-06') })
    expect(s.semaines.map((x) => x.budget)).toEqual([2_000, 14_000, 14_000, 0, 0, 0])
    const rythme = rythmeDuMois(cal, m('2027-01'), d('2027-01-06'))
    expect(rythme.find((x) => x.date === '2027-01-10')!.prevu - rythme.find((x) => x.date === '2027-01-09')!.prevu).toBe(2_000)
  })

  it('le budget du mois reste le montant saisi, quel que soit le rythme', () => {
    expect(equivalentMensuelCharge({ nature: 'enveloppe', montant: centimes(30_000), frequence: 'mensuelle', mois: [] })).toBe(30_000)
  })
})

describe('report du reste', () => {
  it('désactivé par défaut ; activé, le reste signé d’une semaine terminée passe à la suivante', () => {
    const avec = suivre('2027-01-12', { report: true, depenses: [...DEPENSES, depense('fete', 110_000, '2026-12-30')] })
    expect(avec.semaines.map((x) => [x.report, x.disponible, x.reste])).toEqual([
      [0, 10_000, 10_000],
      [10_000, 80_000, -30_000],
      [-30_000, 40_000, 5_000],
      // Semaine en cours : son reste n'est pas encore connu, rien ne passe à la suivante.
      [5_000, 75_000, 75_000],
      [0, 70_000, 70_000],
      [0, 20_000, 20_000],
    ])
    expect(suivre('2027-01-12').semaines.every((x) => x.report === 0)).toBe(true)
  })

  it('jamais d’un mois à l’autre : la première semaine part de zéro', () => {
    const fevrier = suivre('2027-02-10', { report: true, cle: '2027-02', paies: [paie('2027-01', '2026-12-27'), paie('2027-02', '2027-01-27')] })
    expect(fevrier.semaines[0]!.report).toBe(0)
  })
})

describe('tendance contre les 4 semaines précédentes', () => {
  const historique = [depense('ancienne', 1_000, '2026-11-20'), depense('decembre', 56_000, '2026-12-10', { chargeId: 'courses' })]

  it('dépensé par jour contre la moyenne par jour des 28 jours avant la semaine', () => {
    const s = suivre('2027-01-06', { depenses: [...DEPENSES, ...historique] })
    // 7 déc. → 3 janv. : 560 DH, soit 20 DH par jour (140 DH par semaine) ; cette semaine 350 DH en 3 jours.
    expect(s.semaines[2]!.tendance).toEqual({ moyenneSemaine: 14_000, variation: 35_000 / 3 / 2_000 - 1, sens: 'hausse' })
    expect(s.semaines[0]!.tendance).toMatchObject({ sens: 'baisse', variation: -1 })
  })

  it('pas de tendance sans 28 jours de suivi', () => {
    const s = suivre('2027-01-06', { depenses: [...DEPENSES, historique[1]!] })
    expect(s.semaines[2]!.tendance).toBeNull()
  })
})

describe('mois terminé, à venir, sans enveloppe', () => {
  const paies = [paie('2027-01', '2026-12-27'), paie('2027-02', '2027-01-27')]

  it('mois terminé : marge ou dépassement du budget du mois', () => {
    expect(suivre('2027-01-28', { paies }).reponse).toEqual({ type: 'marge', montant: 275_000 })
    const depasse = suivre('2027-01-28', { paies, depenses: [...DEPENSES, depense('voyage', 300_000, '2027-01-20')] })
    expect(depasse.reponse).toEqual({ type: 'depasse', montant: 25_000 })
    expect(depasse.courante).toBeNull()
    expect(depasse.budgetADate).toBeNull()
  })

  it('mois à venir : budget prévu seul', () => {
    const s = suivre('2027-01-06', { cle: '2027-02' })
    expect(s.reponse).toEqual({ type: 'aVenir' })
    expect(s.semaines.every((x) => x.statut === 'aVenir' && x.ecart === null && x.depense === 0)).toBe(true)
  })

  it('sans enveloppe : pas de réponse, budget nul', () => {
    const s = suivre('2027-01-06', { charges: [loyer] })
    expect(s.reponse).toEqual({ type: 'sansEnveloppe' })
    expect(s.semaines.every((x) => x.budget === 0)).toBe(true)
  })

  it('le dimanche comme début de semaine', () => {
    const s = suivre('2027-01-06', { debutSemaine: 7 })
    expect(s.semaines.map((x) => x.nbJours)).toEqual([7, 7, 7, 7, 3])
  })
})

describe('propriété', () => {
  it('les budgets des semaines font toujours le budget du mois, au centime', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), fc.integer({ min: 1, max: 7 }), (montant, debutSemaine) => {
        const s = suivre('2027-01-06', { charges: [{ ...courses, montant: centimes(montant) }], debutSemaine })
        expect(s.semaines.reduce((t, x) => t + x.budget, 0)).toBe(montant)
      }),
    )
  })
})

describe('page Aujourd’hui (lot 16)', () => {
  it('7 prochains jours : revenus et charges datés, à cheval sur deux mois budgétaires', () => {
    // 22 janv. → 28 janv. : la paie de février tombe le 27 (mois budgétaire suivant).
    const cal = calendrier('2027-01-22')
    expect(prochainsJours(cal, d('2027-01-22')).map((e) => [e.date, e.type, e.libelle, e.statut])).toEqual([['2027-01-27', 'revenu', 'Salaire', 'prevu']])
    // 3 → 9 janv. : le loyer du 5 (déjà payé), rien d'autre.
    expect(prochainsJours(calendrier('2027-01-03'), d('2027-01-03')).map((e) => [e.date, e.libelle, e.statut])).toEqual([['2027-01-05', 'Loyer', 'confirme']])
    expect(prochainsJours(cal, d('2027-01-22'), 3)).toEqual([])
  })

  it('bilan de la semaine passée : le premier jour de la semaine seulement', () => {
    // Lundi 11 janv. : la semaine du 4 au 10 janv. vient de finir.
    expect(semainePassee(calendrier('2027-01-11'), d('2027-01-11'))).toMatchObject({ debut: '2027-01-04', fin: '2027-01-10', statut: 'passe', budget: 70_000, depense: 35_000, ecart: 35_000 })
    expect(semainePassee(calendrier('2027-01-12'), d('2027-01-12'))).toBeNull()
    // Semaines du dimanche : le dimanche 10 janv., la semaine du 3 au 9 vient de finir.
    expect(semainePassee(calendrier('2027-01-10'), d('2027-01-10'), { debutSemaine: 7 })).toMatchObject({ debut: '2027-01-03', fin: '2027-01-09' })
    expect(semainePassee(calendrier('2027-01-11', { charges: [loyer] }), d('2027-01-11'))).toBeNull()
  })
})
