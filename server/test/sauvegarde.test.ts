import { type ExportCompte } from '@mysalary/partage'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { sauvegarderBase, SAUVEGARDES_GARDEES } from '../src/lib/sauvegardeBase'
import { creerCompte, MOT_DE_PASSE_TEST, pour, preparerApp, url } from './outils'

const ctx = preparerApp()
const appeler = (method: 'GET' | 'POST', chemin: string, payload?: object, id?: string) =>
  ctx.app.inject({ method, url: url(chemin), ...(id ? { headers: pour(id) } : {}), ...(payload ? { payload } : {}) })

/** Un compte avec un peu de tout, écrit directement en base (données fictives). */
async function remplir(utilisateurId: string) {
  const p = ctx.prisma
  const categorie = await p.categorie.create({ data: { utilisateurId, libelle: 'Logement', groupe: 'essentiel' } })
  const charge = await p.charge.create({ data: { utilisateurId, categorieId: categorie.id, libelle: 'Loyer', nature: 'fixe', montant: 350_000, jour: 5, debut: '2026-10' } })
  const ponctuel = await p.ponctuel.create({ data: { utilisateurId, categorieId: categorie.id, libelle: 'Assurance', montant: 45_000, date: '2026-12-10' } })
  await p.depense.create({ data: { utilisateurId, date: '2026-10-05', montant: 350_000, categorieId: categorie.id, chargeId: charge.id, echeance: '2026-10-05' } })
  await p.depense.create({ data: { utilisateurId, date: '2026-12-10', montant: 45_000, categorieId: categorie.id, ponctuelId: ponctuel.id } })
  const source = await p.sourceRevenu.create({ data: { utilisateurId, libelle: 'Prime', type: 'prime', montant: 100_000, frequence: 'annuelle', versement: 'avecPaie', certitude: 'probable', debut: '2026-01' } })
  const paie = await p.paie.create({ data: { utilisateurId, moisFinance: '2026-10' } })
  await p.lignePaie.create({ data: { utilisateurId, paieId: paie.id, type: 'prime', libelle: 'Prime', certitude: 'probable', sourceId: source.id } })
  await p.revenuRecu.create({ data: { utilisateurId, sourceId: source.id, moisOccurrence: '2026-06', date: '2026-06-30', montant: 100_000, libelle: 'Prime' } })
  const dette = await p.dette.create({ data: { utilisateurId, libelle: 'Prêt', montantTotal: 100_000, mensualite: 10_000, premiereEcheance: '2026-11-01' } })
  await p.paiementDette.create({ data: { utilisateurId, detteId: dette.id, date: '2026-11-01', montant: 10_000 } })
  const compte = await p.compteEpargne.create({ data: { utilisateurId, libelle: 'Livret', solde: 500_000, auLe: '2026-10-01' } })
  const objectif = await p.objectif.create({ data: { utilisateurId, libelle: 'Moto', montantCible: 8_600_000, priorite: 1 } })
  await p.mouvementEpargne.create({ data: { utilisateurId, compteId: compte.id, objectifId: objectif.id, type: 'versement', date: '2026-10-02', montant: 40_000 } })
  await p.clotureMois.create({ data: { utilisateurId, cle: '2026-09', debut: '2026-08-28', fin: '2026-09-27', instantane: JSON.stringify({ lignes: [{ id: charge.id }] }) } })
  await p.journalCloture.create({ data: { utilisateurId, cle: '2026-09', action: 'cloture' } })
  await p.scenario.create({ data: { utilisateurId, nom: 'Test', ajustements: '[]' } })
  await p.reglages.update({ where: { utilisateurId }, data: { debutSemaine: 3, reportHebdo: true } })
  await p.importSource.create({ data: { utilisateurId, type: 'moneyGuruV0', fichierBrut: '{}', analyse: '{}' } })
  return { charge, categorie }
}

describe('export, restauration et réinitialisation du compte connecté', () => {
  it('export : toutes les données du compte, sans identifiant de compte ; un autre compte n’y est pas', async () => {
    const a = await creerCompte(ctx.app, 'A')
    const b = await creerCompte(ctx.app, 'B')
    await remplir(a.id)
    await remplir(b.id)
    const r = await appeler('GET', '/compte/export', undefined, a.id)
    expect(r.statusCode, r.body).toBe(200)
    const e = r.json() as ExportCompte
    expect(e).toMatchObject({ format: 'mysalary-export', version: 1, compte: { prenom: 'A', devise: 'MAD' } })
    expect(Object.fromEntries(Object.entries(e.donnees).map(([k, v]) => [k, v.length]))).toMatchObject({
      categorie: 1, charge: 1, ponctuel: 1, depense: 2, lignePaie: 1, mouvementEpargne: 1, clotureMois: 1, reglages: 1,
    })
    expect(JSON.stringify(e)).not.toContain(a.id)
    expect(JSON.stringify(e)).not.toContain('moneyGuruV0')
    expect((await appeler('GET', '/compte/export')).statusCode).toBe(401)
  })

  it('restauration dans un compte vide : tout est relié aux nouveaux identifiants ; la source n’est pas touchée', async () => {
    const a = await creerCompte(ctx.app, 'A')
    const { charge } = await remplir(a.id)
    const e = (await appeler('GET', '/compte/export', undefined, a.id)).json() as ExportCompte
    const b = await creerCompte(ctx.app, 'B')
    const r = await appeler('POST', '/compte/restauration', e, b.id)
    expect(r.statusCode, r.body).toBe(200)
    const { utilisateur, lignes } = r.json() as { utilisateur: { id: string; prenom: string; onboardingTermine: boolean }; lignes: number }
    expect(utilisateur).toMatchObject({ id: b.id, prenom: 'B', onboardingTermine: true })
    expect(lignes).toBeGreaterThan(10)
    const n = utilisateur.id
    const charges = await ctx.prisma.charge.findMany({ where: { utilisateurId: n } })
    expect(charges).toHaveLength(1)
    expect(charges[0]!.id).not.toBe(charge.id)
    const depenses = await ctx.prisma.depense.findMany({ where: { utilisateurId: n } })
    expect(depenses.map((d) => d.chargeId).filter(Boolean)).toEqual([charges[0]!.id])
    expect(depenses.every((d) => d.categorieId !== null)).toBe(true)
    const mouvement = await ctx.prisma.mouvementEpargne.findFirstOrThrow({ where: { utilisateurId: n } })
    expect(mouvement.objectifId).toBe((await ctx.prisma.objectif.findFirstOrThrow({ where: { utilisateurId: n } })).id)
    expect((await ctx.prisma.lignePaie.findFirstOrThrow({ where: { utilisateurId: n } })).sourceId).toBe((await ctx.prisma.sourceRevenu.findFirstOrThrow({ where: { utilisateurId: n } })).id)
    expect((await ctx.prisma.clotureMois.findFirstOrThrow({ where: { utilisateurId: n } })).instantane).toContain(charges[0]!.id)
    expect(await ctx.prisma.reglages.findUnique({ where: { utilisateurId: n } })).toMatchObject({ debutSemaine: 3, reportHebdo: true })
    expect(await ctx.prisma.importSource.count({ where: { utilisateurId: n } })).toBe(0)
    // L'original est intact, et le plan importé est lisible par l'API.
    expect(await ctx.prisma.charge.count({ where: { utilisateurId: a.id } })).toBe(1)
    expect(((await appeler('GET', '/charges', undefined, n)).json() as unknown[]).length).toBeGreaterThan(0)
    // Aller-retour : réexporter donne les mêmes quantités.
    const e2 = (await appeler('GET', '/compte/export', undefined, n)).json() as ExportCompte
    expect(Object.fromEntries(Object.entries(e2.donnees).map(([k, v]) => [k, v.length]))).toEqual(Object.fromEntries(Object.entries(e.donnees).map(([k, v]) => [k, v.length])))
  })

  it('restauration refusée : fichier étranger, version plus récente, lien cassé ; rien n’est écrit', async () => {
    const a = await creerCompte(ctx.app, 'A')
    await remplir(a.id)
    const e = (await appeler('GET', '/compte/export', undefined, a.id)).json() as ExportCompte
    const b = await creerCompte(ctx.app, 'B')
    for (const mauvais of [{}, { format: 'autre', version: 1 }, { ...e, version: 2 }, { ...e, compte: { prenom: '', devise: 'MAD' } }, { ...e, donnees: { charge: [{ id: 'x', categorieId: 'absente', libelle: 'z' }] } }]) {
      const r = await appeler('POST', '/compte/restauration', mauvais, b.id)
      expect(r.statusCode, JSON.stringify(mauvais).slice(0, 80)).toBe(400)
    }
    expect(await ctx.prisma.charge.count({ where: { utilisateurId: b.id } })).toBe(0)
  })

  it('réinitialisation : le plan, le réel et l’import disparaissent, le compte et son prénom restent, réglages par défaut', async () => {
    const a = await creerCompte(ctx.app, 'A')
    const b = await creerCompte(ctx.app, 'B')
    await remplir(a.id)
    await remplir(b.id)
    await ctx.prisma.utilisateur.update({ where: { id: a.id }, data: { onboardingEtape: 10, onboardingTermine: true } })
    const r = await appeler('POST', '/compte/reinitialisation', { motDePasse: MOT_DE_PASSE_TEST }, a.id)
    expect(r.statusCode, r.body).toBe(200)
    expect(r.json()).toMatchObject({ id: a.id, prenom: 'A', onboardingEtape: 0, onboardingTermine: false })
    for (const table of ['categorie', 'charge', 'depense', 'dette', 'objectif', 'mouvementEpargne', 'compteEpargne', 'paie', 'clotureMois', 'scenario', 'importSource'] as const) {
      expect(await (ctx.prisma[table] as unknown as { count(a: object): Promise<number> }).count({ where: { utilisateurId: a.id } }), table).toBe(0)
    }
    expect(await ctx.prisma.reglages.findUnique({ where: { utilisateurId: a.id } })).toMatchObject({ debutSemaine: 1, reportHebdo: false })
    expect(await ctx.prisma.charge.count({ where: { utilisateurId: b.id } })).toBe(1)
  })
})

describe('import d’un export MySalary à l’onboarding', () => {
  it('l’aperçu de l’ancienne app refuse un export MySalary et dit où l’importer', async () => {
    const a = await creerCompte(ctx.app, 'A')
    const r = await appeler('POST', '/import/apercu', { fichier: { format: 'mysalary-export', version: 1 } }, a.id)
    expect(r.statusCode).toBe(422)
    expect(r.json().erreur.message).toContain('Réglages › Sauvegarde')
  })
})

describe('sauvegarde de la base', () => {
  let dossier = ''
  afterAll(async () => dossier && rm(dossier, { recursive: true, force: true }))

  it('copie la base dans un fichier daté et ne garde que les plus récentes', async () => {
    dossier = await mkdtemp(join(tmpdir(), 'mysalary-sauvegarde-'))
    await creerCompte(ctx.app, 'A')
    const premiere = await sauvegarderBase(ctx.prisma, dossier, new Date('2026-10-12T08:30:15Z'))
    expect(premiere.endsWith('mysalary-20261012-083015.db')).toBe(true)
    for (let i = 1; i <= SAUVEGARDES_GARDEES; i++) await sauvegarderBase(ctx.prisma, dossier, new Date(Date.UTC(2026, 9, 12, 9, i)))
    const fichiers = (await readdir(dossier)).sort()
    expect(fichiers).toHaveLength(SAUVEGARDES_GARDEES)
    expect(fichiers).not.toContain('mysalary-20261012-083015.db')
  })
})
