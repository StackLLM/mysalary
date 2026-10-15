import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import type { MouvementEpargne, Objectif } from './epargne'
import { analyser } from './objectifs'
import { anneeDesObjectifs } from './objectifsAnnee'
import { creerCalendrier } from './periodes'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Salaire 10 000 DH le 27, qui finance le mois suivant ; on est le 10 mars 2027 (mois « mars » : 27 févr. → 26 mars).
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }
const paie = (mois: string, date: string): PaieEnregistree => ({
  moisFinance: m(mois),
  dateReelle: d(date),
  datePrevue: d(date),
  lignes: [{ id: `l${mois}`, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null }],
})
const loyer: Charge = { id: 'loyer', libelle: 'Loyer', categorieId: 'logement', nature: 'fixe', montant: centimes(350_000), frequence: 'mensuelle', mois: [], jour: 5, debut: m('2026-11'), fin: null, essentielle: true }
const objectif = (id: string, modif: Partial<Objectif>): Objectif => ({
  id,
  libelle: id,
  type: 'autre',
  montantCible: centimes(100_000),
  montantInitial: centimes(0),
  dateCible: null,
  priorite: 1,
  versementMensuel: null,
  statut: 'actif',
  realiseLe: null,
  creeLe: d('2026-12-01'),
  ...modif,
})
const moto = objectif('moto', { montantCible: centimes(8_500_000), montantInitial: centimes(200_000), dateCible: m('2027-12'), priorite: 1 })
const permis = objectif('permis', { montantCible: centimes(300_000), dateCible: m('2027-06'), priorite: 2, versementMensuel: centimes(100_000) })
const voyage = objectif('voyage', { montantCible: centimes(1_000_000), montantInitial: centimes(100_000), statut: 'pause', priorite: 3 })
const ordi = objectif('ordi', { montantCible: centimes(500_000), creeLe: d('2027-02-15'), priorite: 4 })
const vers = (id: string, objectifId: string, montant: number, date: string): MouvementEpargne => ({ id, compteId: 'c', objectifId, type: 'versement', date: d(date), montant: centimes(montant), libelle: '' })
const mouvements = [vers('a', 'moto', 50_000, '2026-12-20'), vers('b', 'moto', 100_000, '2027-01-05'), vers('c', 'permis', 100_000, '2027-02-10')]
const AUJOURDHUI = d('2027-03-10')

function cadre(objectifs: Objectif[] = [moto, permis, voyage, ordi]) {
  const calendrier = creerCalendrier({
    mode: 'cyclePaie',
    contrats: [contrat],
    paies: [paie('2027-01', '2026-12-27'), paie('2027-02', '2027-01-27'), paie('2027-03', '2027-02-27')],
    sources: [],
    charges: [loyer],
    objectifs,
    mouvementsEpargne: mouvements,
    aujourdhui: AUJOURDHUI,
  })
  const donnees = { objectifs, comptes: [], mouvementsEpargne: mouvements }
  const analyse = analyser(calendrier, donnees, AUJOURDHUI)
  return { annee: anneeDesObjectifs(calendrier, donnees, analyse), analyse }
}

describe('vue annuelle des objectifs (lot 26)', () => {
  it('passé réel, jonction aujourd’hui, futur projeté (réaliste) ; un objectif créé plus tard ne compte pas avant sa création', () => {
    const { annee } = cadre()
    expect(annee.annee).toBe(2027)
    expect(annee.points.map((p) => p.mois)).toEqual(['2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10', '2027-11', '2027-12'])
    // Fin janvier : moto 2 000 + 500 + 1 000 DH, voyage 1 000 DH (en pause, compté) ; ordi n'existe pas encore.
    expect(annee.points[0]).toEqual({ mois: '2027-01', reel: 450_000, projete: null, aujourdhui: false })
    // Fin février : + 1 000 DH au permis ; ordi (créé le 15 févr.) n'a rien.
    expect(annee.points[1]).toMatchObject({ reel: 550_000, projete: null })
    expect(annee.points[2]).toEqual({ mois: '2027-03', reel: 550_000, projete: 550_000, aujourdhui: true })
    for (const p of annee.points.slice(3)) expect(p.reel).toBeNull()
    const projetes = annee.points.slice(2).map((p) => p.projete!)
    expect(projetes).toEqual([...projetes].sort((a, b) => a - b))
  })

  it('totaux : cible, épargné, restant, progression ; versé depuis janvier ; fin d’année par scénario', () => {
    const { annee } = cadre()
    expect(annee).toMatchObject({ enCours: 4, cible: 10_300_000, epargne: 550_000, restant: 9_750_000, verseCetteAnnee: 200_000 })
    expect(annee.progression).toBeCloseTo(550_000 / 10_300_000)
    expect(annee.finAnnee.realiste).toBe(annee.points.at(-1)!.projete)
    expect(annee.finAnnee.prudent).toBeLessThanOrEqual(annee.finAnnee.realiste)
    expect(annee.finAnnee.realiste).toBeLessThanOrEqual(annee.finAnnee.ambitieux)
  })

  it('par objectif : début d’année, aujourd’hui, fin d’année = la projection de la page ; la pause garde son épargné', () => {
    const { annee, analyse } = cadre()
    const par = new Map(annee.objectifs.map((o) => [o.id, o]))
    expect(par.get('moto')).toMatchObject({ debutAnnee: 250_000, epargne: 350_000 })
    expect(par.get('ordi')).toMatchObject({ debutAnnee: 0, epargne: 0 })
    expect(par.get('voyage')).toMatchObject({ epargne: 100_000, finAnnee: 100_000 })
    // Décembre est 9 mois après mars.
    expect(par.get('moto')!.finAnnee).toBe(analyse.projections.realiste.cumuls.get('moto')![9])
    // Le permis (3 000 DH, 1 000 DH par mois) est atteint dans l'année : même mois que l'estimation de la page.
    expect(par.get('permis')!.atteintCetteAnnee).toBe(analyse.suivi.objectifs.find((o) => o.id === 'permis')!.estimations!.realiste)
  })

  it('à risque : exactement les objectifs dont la date n’est pas tenue en réaliste', () => {
    const { annee, analyse } = cadre()
    const attendus = analyse.suivi.objectifs.filter((o) => o.statut !== 'abandonne' && o.statut !== 'realise' && !o.atteint && (o.dateDepassee || o.risque === 'fragile' || o.risque === 'horsPortee')).map((o) => o.id)
    expect(annee.aRisque).toEqual(attendus)
    expect(annee.aRisque).toContain('moto')
  })

  it('la courbe commence au mois du premier objectif quand il a été créé dans l’année', () => {
    const { annee } = cadre([ordi])
    expect(annee.points[0]).toMatchObject({ mois: '2027-02', reel: 0 })
    expect(annee.points.map((p) => p.mois)).toHaveLength(11)
  })

  it('sans objectif : tout à zéro, pas de division par zéro', () => {
    const { annee } = cadre([])
    expect(annee).toMatchObject({ enCours: 0, cible: 0, epargne: 0, restant: 0, progression: 0, aRisque: [], verseCetteAnnee: 0 })
    expect(annee.finAnnee).toEqual({ prudent: 0, realiste: 0, ambitieux: 0 })
  })
})
