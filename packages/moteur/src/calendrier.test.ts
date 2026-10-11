import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge } from './charges'
import { calendrierDuMois } from './calendrier'
import { lireCleMois as m, lireDate as d } from './dates'
import type { Depense } from './depenses'
import { creerCalendrier } from './periodes'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Salaire 10 000 DH le 27, qui finance le mois suivant : « janvier » va du 27 déc. au 26 janv.
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }
const paie = (mois: string, date: string): PaieEnregistree => ({
  moisFinance: m(mois),
  dateReelle: d(date),
  datePrevue: d(date),
  lignes: [{ id: mois, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null }],
})
const fixe = (id: string, montant: number, jour: number): Charge => ({
  id,
  libelle: id,
  categorieId: id,
  nature: 'fixe',
  montant: centimes(montant),
  frequence: 'mensuelle',
  mois: [],
  jour,
  debut: m('2026-11'),
  fin: null,
  essentielle: false,
})
const depense = (id: string, date: string, montant: number, chargeId: string | null, echeance: string | null = null): Depense => ({
  id,
  date: d(date),
  montant: centimes(montant),
  categorieId: chargeId ?? 'x',
  libelle: '',
  chargeId,
  echeance: echeance ? d(echeance) : null,
  ponctuelId: null,
})

const AUJOURDHUI = '2027-01-10'
const calendrier = (aujourdhui = AUJOURDHUI) =>
  creerCalendrier({
    mode: 'cyclePaie',
    contrats: [contrat],
    paies: [paie('2027-01', '2026-12-27')],
    charges: [fixe('Loyer', 350_000, 5), fixe('Internet', 30_000, 8), fixe('Assurance', 120_000, 15)],
    depenses: [depense('d1', '2027-01-05', 350_000, 'Loyer', '2027-01-05'), depense('d2', '2027-01-06', 50_000, null)],
    aujourdhui: d(aujourdhui),
  })
const jour = (c: ReturnType<typeof calendrierDuMois>, date: string) => c.jours.find((j) => j.date === date)!

describe('calendrier d’un mois (lot 17)', () => {
  const c = calendrierDuMois(calendrier(), m('2027-01'), d(AUJOURDHUI))

  it('événements datés et typés, dans l’ordre ; statut et marqueur « passé non confirmé »', () => {
    expect(c.evenements.map((e) => [e.date, e.type, e.sens, e.libelle, e.montant, e.statut, e.passeNonConfirme])).toEqual([
      ['2026-12-27', 'paie', 'entree', 'Salaire', 1_000_000, 'confirme', false],
      ['2027-01-05', 'charge', 'sortie', 'Loyer', 350_000, 'confirme', false],
      // Internet (8 janv.) n'est pas payé : prévu, en retard, marqué.
      ['2027-01-08', 'charge', 'sortie', 'Internet', 30_000, 'enRetard', true],
      ['2027-01-15', 'charge', 'sortie', 'Assurance', 120_000, 'prevu', false],
    ])
    expect(c.evenements[2]!.ligne.cible).toMatchObject({ type: 'charge', id: 'Internet', date: '2027-01-08' })
  })

  it('solde du jour : réel jusqu’à aujourd’hui (dépenses comprises), puis projeté avec le reste daté ; un retard compte dès demain', () => {
    expect(jour(c, '2026-12-27')).toMatchObject({ solde: 1_000_000, projete: false, entrees: 1_000_000, sorties: 0 })
    expect(jour(c, '2027-01-05').solde).toBe(650_000)
    // 50 DH dépensés hors plan le 6 janv. : compté, c'est du réel.
    expect(jour(c, '2027-01-06').solde).toBe(600_000)
    expect(jour(c, '2027-01-10')).toMatchObject({ solde: 600_000, projete: false })
    expect(jour(c, '2027-01-11')).toMatchObject({ solde: 570_000, projete: true, sorties: 30_000 })
    expect(jour(c, '2027-01-15')).toMatchObject({ solde: 450_000, projete: true })
    expect(c.jours.at(-1)).toMatchObject({ date: '2027-01-26', solde: 450_000 })
    expect(c.jours).toHaveLength(31)
  })

  it('mois terminé : tout est réel, rien n’est projeté ; mois à venir : tout est prévu, le solde part de zéro et monte avec la paie prévue', () => {
    const passe = calendrierDuMois(calendrier('2027-02-03'), m('2027-01'), d('2027-02-03'))
    expect(passe.jours.every((j) => !j.projete)).toBe(true)
    // Internet et l'assurance n'ont jamais été payés : rien de réel, rien de projeté.
    expect(passe.jours.at(-1)!.solde).toBe(600_000)
    const avenir = calendrierDuMois(calendrier(), m('2027-02'), d(AUJOURDHUI))
    expect(avenir.jours.every((j) => j.projete)).toBe(true)
    // Février commence le 27 janv., jour de la paie prévue : le solde du premier jour est ce salaire, projeté.
    expect(avenir.jours[0]).toMatchObject({ date: '2027-01-27', solde: 1_000_000, projete: true })
    expect(avenir.jours.at(-1)!.solde).toBe(1_000_000 - 350_000 - 30_000 - 120_000)
    expect(avenir.evenements.every((e) => e.statut === 'prevu' && !e.passeNonConfirme)).toBe(true)
  })
})
