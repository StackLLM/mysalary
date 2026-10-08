import type { BilanDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

// Paie le 27 qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv.
const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function ok(id: string, method: 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) {
  const r = await appeler(id, method, chemin, payload)
  expect(r.statusCode, r.body).toBeLessThan(300)
  return r.statusCode === 204 ? null : r.json()
}

/** Janvier 2027 : paie reçue, loyer, courses ; la paie de février reçue le 27 janvier termine janvier. */
async function compte(prenom = 'A') {
  const c = await creerCompte(ctx.app, prenom)
  const id = c.id
  await ok(id, 'POST', '/salaire/contrats', CONTRAT)
  const categories = (await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  const cat = (libelle: string) => categories.find((x) => x.libelle === libelle)!.id
  const loyer = (await ok(id, 'POST', '/charges', { libelle: 'Loyer', categorieId: cat('Logement'), nature: 'fixe', montant: 350_000, jour: 5, debut: '2027-01' })).id
  await ok(id, 'POST', '/charges', { libelle: 'Courses', categorieId: cat('Alimentation'), nature: 'enveloppe', montant: 250_000, debut: '2027-01' })
  ctx.jour = '2027-01-28'
  await ok(id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
  await ok(id, 'POST', '/salaire/paies/2027-02/reception', { dateReelle: '2027-01-27', salaireRecu: 1_000_000 })
  return { id, cat, loyer }
}

const bilan = async (id: string, cle = '2027-01') => {
  const r = await appeler(id, 'GET', `/mois/${cle}/bilan`)
  expect(r.statusCode, r.body).toBe(200)
  return r.json() as BilanDto
}

describe('bilan du mois', () => {
  it('lignes prévu / réel, totaux, rythme, lignes à confirmer', async () => {
    const { id, cat } = await compte()
    await ok(id, 'POST', '/depenses', { date: '2027-01-10', montant: 200_000, categorieId: cat('Alimentation') })
    const b = await bilan(id)
    expect(b.mois).toMatchObject({ debut: '2026-12-27', fin: '2027-01-26', statut: 'passe' })
    expect(b.lignes.map((l) => [l.libelle, l.prevu, l.reel, l.statut])).toEqual([
      ['Salaire', 1_000_000, 1_000_000, 'confirme'],
      ['Loyer', 350_000, null, 'enRetard'],
      ['Courses', 250_000, 0, 'confirme'],
      ['Hors plan', null, 200_000, 'confirme'],
    ])
    expect(b.totaux).toMatchObject({ revenusReels: 1_000_000, chargesPrevues: 600_000, sortiesReelles: 200_000, restePrevu: 400_000, resteReel: 800_000, ecart: 400_000 })
    expect(b.aConfirmer.map((l) => l.libelle)).toEqual(['Loyer'])
    expect(b.rythme).toHaveLength(31)
    expect(b.cloture).toBeNull()
  })

  it('refuse de clôturer un mois en cours, puis un mois avec des lignes non confirmées', async () => {
    const { id } = await compte()
    expect((await appeler(id, 'POST', '/mois/2027-02/cloturer', {})).json().erreur.message).toBe('Février 2027 n’est pas terminé : il se clôture après sa dernière journée.')
    const refus = await appeler(id, 'POST', '/mois/2027-01/cloturer', {})
    expect(refus.statusCode).toBe(422)
    expect(refus.json().erreur.message).toBe('1 ligne n’est pas confirmée. Confirme-les ou clôture quand même.')
  })

  it('clôture : bilan figé, écritures refusées, bornes qui ne bougent plus ; réouverture tracée', async () => {
    const { id, cat, loyer } = await compte()
    await ok(id, 'POST', '/depenses', { date: '2027-01-04', montant: 350_000, categorieId: cat('Logement'), chargeId: loyer, echeance: '2027-01-05' })
    expect((await ok(id, 'POST', '/mois/2027-01/cloturer', {})) as null).toBeNull()

    const fige = await bilan(id)
    expect(fige.cloture).toMatchObject({ forcee: false, nonConfirmees: 0 })
    expect(fige.journal.map((e) => e.action)).toEqual(['cloture'])
    expect((await appeler(id, 'POST', '/mois/2027-01/cloturer', {})).statusCode).toBe(409)

    // Lecture seule : dépense, revenu reçu, paiement de dette, paie.
    const refus = await appeler(id, 'POST', '/depenses', { date: '2027-01-20', montant: 1_000, categorieId: cat('Loisirs') })
    expect(refus.statusCode).toBe(422)
    expect(refus.json().erreur.message).toBe('Janvier 2027 est clôturé. Rouvre-le pour le modifier.')
    expect((await appeler(id, 'POST', '/revenus/recus', { date: '2027-01-20', montant: 1_000, libelle: 'Cadeau' })).statusCode).toBe(422)
    const dette = (await ok(id, 'POST', '/dettes', { libelle: 'Prêt', montantTotal: 100_000, mensualite: 50_000, premiereEcheance: '2027-01-10' })).id
    expect((await appeler(id, 'POST', `/dettes/${dette}/paiements`, { date: '2027-01-10', montant: 50_000 })).statusCode).toBe(422)
    expect((await appeler(id, 'DELETE', '/salaire/paies/2027-01/reception')).statusCode).toBe(422)
    // Le mois suivant reste ouvert.
    await ok(id, 'POST', '/depenses', { date: '2027-01-27', montant: 1_000, categorieId: cat('Loisirs') })

    // Le bilan figé ne bouge plus : la nouvelle charge n'y apparaît pas.
    await ok(id, 'POST', '/ponctuels', { libelle: 'Assurance', categorieId: cat('Assurances'), montant: 240_000, date: '2027-01-15' })
    expect((await bilan(id)).lignes.map((l) => l.libelle)).not.toContain('Assurance')

    // La paie de février corrigée au 24 janvier ne redécoupe pas janvier.
    await ok(id, 'DELETE', '/salaire/paies/2027-02/reception')
    await ok(id, 'POST', '/salaire/paies/2027-02/reception', { dateReelle: '2027-01-24', salaireRecu: 1_000_000 })
    expect(((await appeler(id, 'GET', '/mois/2027-02')).json() as { debut: string }).debut).toBe('2027-01-27')

    await ok(id, 'POST', '/mois/2027-01/rouvrir', {})
    const rouvert = await bilan(id)
    expect(rouvert.cloture).toBeNull()
    expect(rouvert.lignes.map((l) => l.libelle)).toContain('Assurance')
    expect(rouvert.journal.map((e) => e.action)).toEqual(['reouverture', 'cloture'])
    expect((await appeler(id, 'POST', '/mois/2027-01/rouvrir', {})).statusCode).toBe(422)
  })

  it('clôture forcée : le nombre de lignes non confirmées est gardé', async () => {
    const { id } = await compte()
    await ok(id, 'POST', '/mois/2027-01/cloturer', { forcer: true })
    expect((await bilan(id)).cloture).toMatchObject({ forcee: true, nonConfirmees: 1 })
  })

  it('isole les comptes', async () => {
    const a = await compte('A')
    const b = await compte('B')
    await ok(a.id, 'POST', '/mois/2027-01/cloturer', { forcer: true })
    expect((await bilan(b.id)).cloture).toBeNull()
    await ok(b.id, 'POST', '/depenses', { date: '2027-01-20', montant: 1_000, categorieId: b.cat('Loisirs') })
  })
})
