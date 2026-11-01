import type { BilanDto, ConseilsDto, EpargneDto, ObjectifDetailDto, ObjectifsDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

// Salaire 10 000 DH le 27, qui finance le mois suivant : « janvier 2027 » va du 27 déc. au 26 janv.
const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function ok(id: string, method: 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) {
  const r = await appeler(id, method, chemin, payload)
  expect(r.statusCode, r.body).toBeLessThan(300)
  return r.statusCode === 204 ? null : r.json()
}
const lire = async <T,>(id: string, chemin: string) => {
  const r = await appeler(id, 'GET', chemin)
  expect(r.statusCode, r.body).toBe(200)
  return r.json() as T
}

/** Compte d'épargne de 5 000 DH au 1er janvier ; moto (85 000 DH, 2 000 DH déjà de côté) et permis ; 1 000 DH versés à la moto le 5. */
async function compte(prenom = 'A') {
  const { id } = await creerCompte(ctx.app, prenom)
  await ok(id, 'POST', '/salaire/contrats', CONTRAT)
  const categories = (await appeler(id, 'GET', '/categories')).json() as { id: string; libelle: string }[]
  await ok(id, 'POST', '/charges', { libelle: 'Loyer', categorieId: categories.find((c) => c.libelle === 'Logement')!.id, nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-11', essentielle: true })
  ctx.jour = '2027-01-10'
  await ok(id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
  const cih = (await ok(id, 'POST', '/epargne/comptes', { libelle: 'Compte épargne', solde: 500_000, auLe: '2027-01-01' })).id as string
  const moto = (await ok(id, 'POST', '/objectifs', { libelle: 'Moto', type: 'moto', montantCible: 8_500_000, montantInitial: 200_000, dateCible: '2027-12' })).id as string
  const permis = (await ok(id, 'POST', '/objectifs', { libelle: 'Permis', montantCible: 300_000, dateCible: '2027-03', versementMensuel: 100_000 })).id as string
  await ok(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, objectifId: moto, date: '2027-01-05', montant: 100_000 })
  return { id, cih, moto, permis }
}

describe('épargne', () => {
  it('solde déclaré + mouvements, réservé, disponible ; le versement prend le nom de l’objectif', async () => {
    const { id } = await compte()
    const e = await lire<EpargneDto>(id, '/epargne')
    expect(e.etat).toMatchObject({ solde: 600_000, reserve: 300_000, disponible: 300_000, depassement: 0 })
    expect(e.mouvements.map((m) => [m.libelle, m.montant, m.objectif, m.compte])).toEqual([['Moto', 100_000, 'Moto', 'Compte épargne']])
    expect(e.objectifs.map((o) => o.libelle)).toEqual(['Moto', 'Permis'])
  })

  it('refuse une date future, un retrait plus grand que l’épargné, un compte qui a des mouvements', async () => {
    const { id, cih, moto } = await compte()
    expect((await appeler(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, date: '2027-01-11', montant: 1_000 })).statusCode).toBe(422)
    const retrait = await appeler(id, 'POST', '/epargne/mouvements', { sens: 'retrait', compteId: cih, objectifId: moto, date: '2027-01-10', montant: 400_000 })
    expect(retrait.statusCode).toBe(422)
    expect(retrait.json().erreur.message).toMatch(/n’a que 3\s000\sDH d’épargné/)
    expect((await appeler(id, 'DELETE', `/epargne/comptes/${cih}`)).statusCode).toBe(422)
  })

  it('aucun compte à gérer : le versement se note sans compte ; plus d’alerte de compte à déclarer (lot 37)', async () => {
    const { id } = await creerCompte(ctx.app, 'Sans compte')
    await ok(id, 'POST', '/salaire/contrats', CONTRAT)
    ctx.jour = '2027-01-10'
    await ok(id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
    const moto = (await ok(id, 'POST', '/objectifs', { libelle: 'Moto', type: 'moto', montantCible: 8_300_000, montantInitial: 900_000, dateCible: '2027-09', versementMensuel: 400_000 })).id as string

    const avant = await lire<EpargneDto>(id, '/epargne')
    expect(avant.planMois).toMatchObject({ cle: '2027-01', debut: '2026-12-27', prevue: 400_000, reelle: 0 })
    expect(avant.planMois.lignes).toEqual([{ objectifId: moto, libelle: 'Moto', prevu: 400_000, reel: 0, prevuSaute: null }])
    expect((await lire<ConseilsDto>(id, '/recommandations')).alertes.map((a) => a.type)).toEqual(['versementPrevu'])

    // Sans compte choisi : l'épargne va sur « Mon épargne », créé une seule fois.
    await ok(id, 'POST', '/epargne/mouvements', { sens: 'versement', objectifId: moto, date: '2027-01-10', montant: 400_000 })
    await ok(id, 'POST', '/epargne/mouvements', { sens: 'versement', objectifId: null, date: '2027-01-10', montant: 10_000 })
    const apres = await lire<EpargneDto>(id, '/epargne')
    expect(apres.etat.comptes.map((c) => c.libelle)).toEqual(['Mon épargne'])
    expect(apres.planMois).toMatchObject({ prevue: 400_000, reelle: 410_000 })
    expect((await lire<ConseilsDto>(id, '/recommandations')).alertes.map((a) => a.type)).toEqual([])
    // Même source partout : objectif, bilan du mois.
    expect((await lire<ObjectifDetailDto>(id, `/objectifs/${moto}`)).objectif.epargne).toBe(1_300_000)
    expect((await lire<BilanDto>(id, '/mois/2027-01/bilan')).epargne).toEqual({ prevue: 400_000, reelle: 410_000 })
  })

  it('déclarer un nouveau solde remplace l’ancien à partir de sa date', async () => {
    const { id, cih } = await compte()
    await ok(id, 'PUT', `/epargne/comptes/${cih}`, { libelle: 'CIH', solde: 700_000, auLe: '2027-01-08' })
    expect((await lire<EpargneDto>(id, '/epargne')).etat.solde).toBe(700_000)
  })
})

describe('objectifs', () => {
  it('liste : projections par scénario, risque, fonds de sécurité proposé', async () => {
    const { id } = await compte()
    const o = await lire<ObjectifsDto>(id, '/objectifs')
    const moto = o.objectifs.find((x) => x.libelle === 'Moto')!
    expect(moto).toMatchObject({ priorite: 1, epargne: 300_000, restant: 8_200_000, effortMensuel: 691_667, risque: 'horsPortee' })
    expect(moto.estimations).toEqual({ prudent: '2028-02', realiste: '2028-02', ambitieux: '2028-02' })
    expect(o.objectifs.find((x) => x.libelle === 'Permis')!.risque).toBe('sur')
    expect(o.fondsSecurite).toEqual({ min: 1_050_000, max: 2_100_000, base: 350_000 })
    expect(o.comptes.map((c) => c.libelle)).toEqual(['Compte épargne'])
    // Vue annuelle : mêmes chiffres que la liste (moto 3 000 DH, permis 0), janvier à décembre 2027.
    expect(o.annee).toMatchObject({ annee: 2027, enCours: 2, cible: 8_800_000, epargne: 300_000, restant: 8_500_000, verseCetteAnnee: 100_000, aRisque: [moto.id] })
    expect(o.annee.points).toHaveLength(12)
    expect(o.annee.points[0]).toMatchObject({ mois: '2027-01', reel: 300_000, projete: 300_000, aujourdhui: true })
    expect(o.annee.finAnnee.realiste).toBe(o.annee.points[11]!.projete)
  })

  it('aperçu : projection sans rien écrire', async () => {
    const { id } = await compte()
    const a = await ok(id, 'POST', '/objectifs/apercu', { libelle: 'Voyage', montantCible: 1_000_000 })
    expect(a.objectif).toMatchObject({ id: 'apercu', priorite: 3, restant: 1_000_000 })
    expect(a.objectif.estimations.realiste).toMatch(/^\d{4}-\d{2}$/)
    expect((await lire<ObjectifsDto>(id, '/objectifs')).objectifs).toHaveLength(2)
  })

  it('ordre de priorité : complet, sinon refusé', async () => {
    const { id, moto, permis } = await compte()
    await ok(id, 'PUT', '/objectifs/ordre', { ids: [permis, moto] })
    expect((await lire<ObjectifsDto>(id, '/objectifs')).objectifs.map((o) => o.libelle)).toEqual(['Permis', 'Moto'])
    expect((await appeler(id, 'PUT', '/objectifs/ordre', { ids: [moto] })).statusCode).toBe(422)
  })

  it('achat réalisé (R19) : l’épargné sort du compte, aucune dépense ; annulable', async () => {
    const { id, cih, moto } = await compte()
    await ok(id, 'POST', `/objectifs/${moto}/realiser`, { date: '2027-01-09' })
    const e = await lire<EpargneDto>(id, '/epargne')
    expect(e.etat).toMatchObject({ solde: 300_000, reserve: 0, disponible: 300_000 })
    const achat = e.mouvements.find((m) => m.type === 'achat')!
    expect(achat).toMatchObject({ montant: -300_000, libelle: 'Achat : Moto' })
    expect(((await lire<{ depenses: unknown[] }>(id, '/depenses')).depenses)).toHaveLength(0)
    expect((await appeler(id, 'DELETE', `/epargne/mouvements/${achat.id}`)).statusCode).toBe(422)
    expect((await appeler(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, objectifId: moto, date: '2027-01-10', montant: 1_000 })).statusCode).toBe(422)

    await ok(id, 'POST', `/objectifs/${moto}/statut`, { statut: 'actif' })
    const detail = await lire<ObjectifDetailDto>(id, `/objectifs/${moto}`)
    expect(detail.objectif).toMatchObject({ statut: 'actif', realiseLe: null, epargne: 300_000 })
    expect((await lire<EpargneDto>(id, '/epargne')).etat.solde).toBe(600_000)
  })

  it('détail : trajectoire et versements ; le bilan du mois montre l’épargne hors des charges', async () => {
    const { id, moto } = await compte()
    const d = await lire<ObjectifDetailDto>(id, `/objectifs/${moto}`)
    expect(d.trajectoire.find((p) => p.aujourdhui)).toMatchObject({ mois: '2027-01', reel: 300_000, projete: 300_000 })
    expect(d.versements.map((v) => v.montant)).toEqual([100_000])
    const b = await lire<BilanDto>(id, '/mois/2027-01/bilan')
    expect(b.lignes.filter((l) => l.famille === 'epargne').map((l) => [l.libelle, l.prevu, l.reel])).toEqual([
      ['Moto', null, 100_000],
      ['Permis', 100_000, 0],
    ])
    expect(b.epargne).toEqual({ prevue: 100_000, reelle: 100_000 })
  })

  it('détail : simulation avec le cumul de fin de mois, calculée par MySalary ; l’épargne réelle ne bouge pas', async () => {
    const { id, permis } = await compte()
    await ok(id, 'PUT', '/reglages', { depart: { mois: '2027-01', solde: 700_000 } })
    const d = await lire<ObjectifDetailDto>(id, `/objectifs/${permis}`)
    // Permis : 3 000 DH pour mars, 1 000 DH versés par mois ; le compte courant couvre déjà la cible en janvier.
    expect(d.simulation).toMatchObject({ dateAtteinte: '2027-01', ecart: -2, moisSouhaite: { cle: '2027-03', atteint: true } })
    expect(d.simulation!.mois[0]).toMatchObject({ cle: '2027-01', nature: 'enCours', versements: 100_000 })
    expect(d.objectif.epargne).toBe(0)
    await ok(id, 'POST', `/objectifs/${permis}/statut`, { statut: 'pause' })
    expect((await lire<ObjectifDetailDto>(id, `/objectifs/${permis}`)).simulation).toBeNull()
  })

  it('isole les comptes', async () => {
    const a = await compte('A')
    const b = await compte('B')
    expect((await appeler(b.id, 'GET', `/objectifs/${a.moto}`)).statusCode).toBe(404)
    expect((await appeler(b.id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: a.cih, date: '2027-01-10', montant: 1_000 })).statusCode).toBe(404)
    expect((await appeler(b.id, 'PUT', '/objectifs/ordre', { ids: [a.moto, a.permis] })).statusCode).toBe(422)
  })
})

describe('plan d’épargne du mois (lot 36)', () => {
  const ligne = async (id: string, objectifId: string) => (await lire<EpargneDto>(id, '/epargne')).planMois.lignes.find((l) => l.objectifId === objectifId)

  it('« pas ce mois-ci » : le versement n’est plus attendu, ni dans le plan ni dans le bilan ; puis il se reprend', async () => {
    const { id, permis } = await compte()
    expect(await ligne(id, permis)).toMatchObject({ prevu: 100_000, reel: 0, prevuSaute: null })
    await ok(id, 'PUT', `/epargne/plan/${permis}/saut`)
    expect(await ligne(id, permis)).toMatchObject({ prevu: null, reel: 0, prevuSaute: 100_000 })
    expect((await lire<EpargneDto>(id, '/epargne')).planMois.prevue).toBe(0)
    expect((await lire<BilanDto>(id, '/mois/2027-01/bilan')).cumul.epargneAConfirmer).toBe(0)
    // Deux fois de suite : rien ne change.
    await ok(id, 'PUT', `/epargne/plan/${permis}/saut`)
    await ok(id, 'DELETE', `/epargne/plan/${permis}/saut`)
    expect(await ligne(id, permis)).toMatchObject({ prevu: 100_000, prevuSaute: null })
    expect((await appeler(id, 'DELETE', `/epargne/plan/${permis}/saut`)).statusCode).toBe(404)
  })

  it('refuse « pas ce mois-ci » sans versement prévu, ou quand le versement est déjà noté', async () => {
    const { id, cih, moto, permis } = await compte()
    expect((await appeler(id, 'PUT', `/epargne/plan/${moto}/saut`)).json().erreur.message).toBe('Aucun versement n’est prévu ce mois-ci pour « Moto ».')
    await ok(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, objectifId: permis, date: '2027-01-08', montant: 100_000 })
    expect((await appeler(id, 'PUT', `/epargne/plan/${permis}/saut`)).statusCode).toBe(422)
  })

  it('annuler l’épargne du mois retire les versements du mois de cet objectif, et seulement eux', async () => {
    const { id, cih, moto, permis } = await compte()
    await ok(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, objectifId: permis, date: '2026-12-20', montant: 50_000 })
    await ok(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, objectifId: permis, date: '2027-01-08', montant: 60_000 })
    await ok(id, 'POST', '/epargne/mouvements', { sens: 'versement', compteId: cih, objectifId: permis, date: '2027-01-09', montant: 40_000 })
    expect(await ligne(id, permis)).toMatchObject({ reel: 100_000 })
    await ok(id, 'DELETE', `/epargne/plan/${permis}/versements`)
    expect(await ligne(id, permis)).toMatchObject({ reel: 0, prevu: 100_000 })
    // Le versement de décembre (mois précédent) et celui de la moto restent.
    const mouvements = (await lire<EpargneDto>(id, '/epargne')).mouvements.map((m) => [m.objectif, m.date])
    expect(mouvements).toEqual([['Moto', '2027-01-05'], ['Permis', '2026-12-20']])
    expect((await appeler(id, 'DELETE', `/epargne/plan/${moto}/versements`)).statusCode).toBe(204)
    expect((await appeler(id, 'DELETE', `/epargne/plan/${moto}/versements`)).statusCode).toBe(404)
  })
})
