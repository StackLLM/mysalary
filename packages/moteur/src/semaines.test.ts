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
// 3 100 DH sur 31 jours, consommés par jour : 100 DH chaque jour.
const courses: Charge = { ...loyer, id: 'courses', libelle: 'Courses', categorieId: 'alimentation', nature: 'enveloppe', montant: centimes(310_000), jour: null, unite: 'jour', rythme: centimes(10_000) }

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

describe('enveloppes vues depuis chaque semaine', () => {
  it('le reste de l’enveloppe sur le mois, après le dépensé de la semaine et des précédentes', () => {
    const depenses = [...DEPENSES, depense('m2', 20_000, '2027-01-12', { chargeId: 'courses' }), depense('hors', 7_000, '2027-01-12', { chargeId: 'inconnue' })]
    const { semaines } = suivre('2027-01-14', { depenses })
    const lignes = semaines.map((x) => x.enveloppes.map((e) => [e.libelle, e.avant, e.depense, e.reste]))
    // Semaine du 4 au 10 : 300 DH dépensés ; semaine du 11 au 17 : 200 DH de plus. Un lien disparu n'est pas une enveloppe.
    expect(lignes.flat().filter((l) => l[2] !== 0)).toEqual([
      ['Courses', 0, 30_000, 280_000],
      ['Courses', 30_000, 20_000, 260_000],
    ])
    expect(semaines.every((x) => x.enveloppes.every((e) => e.budget === 310_000))).toBe(true)
  })

  it('une enveloppe sans montant mis ni dépense cette semaine n’apparaît pas', () => {
    const { semaines } = suivre('2027-01-14', { depenses: [] })
    expect(semaines.every((x) => x.enveloppes.every((e) => e.depense === 0))).toBe(true)
    const libres = suivre('2027-01-14', { charges: [loyer, { ...courses, unite: 'mois', rythme: null }], depenses: [] })
    expect(libres.semaines.flatMap((x) => x.enveloppes)).toEqual([])
  })
})

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

describe('enveloppe consommée par semaine ou par jour : les semaines ne reçoivent que les montants mis par l’utilisateur', () => {
  // Moto : 300 DH pour le mois. Par semaine, l'utilisateur met un montant différent sur chaque semaine ; MySalary n'invente rien.
  const semaine = (debut: string, montant: number) => ({ debut: d(debut), montant: centimes(montant) })
  const moto: Charge = {
    ...courses,
    id: 'moto',
    libelle: 'Moto',
    montant: centimes(30_000),
    unite: 'semaine',
    rythme: null,
    semaines: [semaine('2026-12-28', 10_000), semaine('2027-01-04', 5_000), semaine('2027-01-18', 12_000)],
  }
  const plan = (charge: Charge, aujourdhui = '2027-01-06') => {
    const cal = calendrier(aujourdhui, { charges: [loyer, charge] })
    const mois = cal.mois(m('2027-01'))
    const e = cal.suiviDuMois(m('2027-01')).enveloppes[0]!
    return { cal, e, p: planEnveloppe(e, mois, semainesDe(mois, 1)) }
  }

  it('par semaine : chaque semaine reçoit son montant dès son premier jour ; sans montant, 0 ; le reste du budget est « à répartir »', () => {
    const { cal, e, p } = plan(moto)
    expect(e).toMatchObject({ budget: 30_000, unite: 'semaine' })
    expect(cal.chargesDuMois(m('2027-01')).totaux.enveloppe).toBe(30_000)
    expect(p.semaines.map((x) => [x.ouvert, x.ajuste])).toEqual([
      [0, false],
      [10_000, true],
      [5_000, true],
      [0, false],
      [12_000, true],
      [0, false],
    ])
    expect(p).toMatchObject({ ouvert: 27_000, aRepartir: 3_000, depassement: 0 })
    // Le 28 déc. (case 1), le 4 janv. (case 8), le 18 janv. (case 22).
    expect([p.parJour[1], p.parJour[8], p.parJour[22]]).toEqual([10_000, 5_000, 12_000])
    const s = suiviDesSemaines(cal, m('2027-01'), { aujourdhui: d('2027-01-06') })
    expect(s.semaines.map((x) => x.budget)).toEqual([0, 10_000, 5_000, 0, 12_000, 0])
    expect(s).toMatchObject({ budget: 27_000, aRepartir: 3_000, libres: [] })
  })

  it('par semaine : des montants au-delà du budget sont gardés tels quels et signalés en dépassement', () => {
    const { p } = plan({ ...moto, semaines: [...moto.semaines!, semaine('2027-01-11', 8_000)] })
    expect(p.semaines.map((x) => x.ouvert)).toEqual([0, 10_000, 5_000, 8_000, 12_000, 0])
    expect(p).toMatchObject({ ouvert: 35_000, aRepartir: 0, depassement: 5_000 })
  })

  it('par jour : 20 DH chaque jour jusqu’aux 300 DH, atteints le 15e jour', () => {
    const { p, cal } = plan({ ...moto, unite: 'jour', rythme: centimes(2_000), semaines: [] })
    expect(p.parJour.slice(0, 16)).toEqual([...Array(15).fill(2_000), 0])
    expect(p).toMatchObject({ ouvert: 30_000, aRepartir: 0, atteintLe: '2027-01-10' })
    expect(budgetEnveloppesParJour(cal, m('2027-01'))[14]).toBe(2_000)
    const s = suiviDesSemaines(cal, m('2027-01'), { aujourdhui: d('2027-01-06') })
    expect(s.semaines.map((x) => x.budget)).toEqual([2_000, 14_000, 14_000, 0, 0, 0])
  })

  it('librement : aucune semaine ne la reçoit, elle est suivie sur le mois ; le rythme du mois (bilan) la compte au fil des jours', () => {
    const { p, cal } = plan({ ...moto, unite: 'mois', semaines: [] })
    expect(p).toMatchObject({ ouvert: 0, aRepartir: 0 })
    const s = suiviDesSemaines(cal, m('2027-01'), { aujourdhui: d('2027-01-06') })
    expect(s.semaines.every((x) => x.budget === 0)).toBe(true)
    expect(s).toMatchObject({ budget: 0, libres: [{ id: 'moto', libelle: 'Moto', budget: 30_000 }] })
    expect(s.reponse.type).not.toBe('sansEnveloppe')
    expect(rythmeDuMois(cal, m('2027-01'), d('2027-01-06')).at(-1)!.prevu).toBe(350_000 + 30_000)
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
  it('les semaines reçoivent exactement les montants mis par l’utilisateur, au centime', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 6, maxLength: 6 }), fc.integer({ min: 1, max: 7 }), (montants, debutSemaine) => {
        const mois = calendrier('2027-01-06').mois(m('2027-01'))
        const debuts = semainesDe(mois, debutSemaine).map((x) => x.debut)
        const semaines = debuts.map((debut, i) => ({ debut, montant: centimes(montants[i] ?? 0) }))
        const s = suivre('2027-01-06', { charges: [{ ...courses, unite: 'semaine', rythme: null, semaines }], debutSemaine })
        expect(s.semaines.map((x) => x.budget)).toEqual(semaines.map((x) => x.montant))
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
