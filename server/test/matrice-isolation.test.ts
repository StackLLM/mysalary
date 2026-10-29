import { PREFIXE_API } from '@mysalary/partage'
import { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { creerCompte, MOT_DE_PASSE_TEST, pour, preparerApp, url } from './outils'

/**
 * Matrice d'isolation (prod.md § 6.3, lot P1) : deux comptes A et B, des données dans chaque entité de B.
 * A appelle chaque route du compte ; aucune ne lui rend, ne modifie ni ne supprime quoi que ce soit de B,
 * et rien de ce que A crée ne référence B. Une route sans cas ici fait échouer le test.
 */

const ctx = preparerApp()

type Methode = 'GET' | 'POST' | 'PUT' | 'DELETE'
/**
 * lecture : 200, sans rien de B dans la réponse.
 * introuvable : 404 (identifiant de B).
 * refus : 4xx (A vise un élément de B dans sa saisie) ; rien n'est créé.
 * compte : action sur son propre compte ; pas d'erreur 500, rien de B dans la réponse.
 */
type Attendu = 'lecture' | 'introuvable' | 'refus' | 'compte'
interface Appel {
  chemin: string
  payload?: object
  attendu: Attendu
}

const MARQUE = 'Secret B'
const CONTRAT = { moisEffet: '2026-11', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'aucune' }
const SOURCE = { libelle: 'Cours', type: 'variable', montant: 100_000, frequence: 'mensuelle', versement: 'dateSeparee', jour: 10, certitude: 'probable', debut: '2027-01' }
const IMPORT = {
  prenom: 'Test',
  devise: 'MAD',
  revenuNet: 5000,
  depenses: [{ id: 'nourriture', libelle: 'Nourriture', montant: 300 }],
  versementSalaire: { jour: 28, financeMoisSuivant: true },
  mois: { '2026-10': { revenuPercu: 8000 } },
  objectifs: [],
}

const appeler = (id: string, method: Methode, chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

async function ok(id: string, method: Methode, chemin: string, payload?: object) {
  const r = await appeler(id, method, chemin, payload)
  expect(r.statusCode, `${method} ${chemin} : ${r.body}`).toBeLessThan(300)
  return r.statusCode === 204 ? null : r.json()
}
const creer = async (id: string, chemin: string, payload: object) => (await ok(id, 'POST', chemin, payload)).id as string

/** Un compte avec une donnée dans chaque entité. */
async function remplir(prenom: string, marque: string) {
  const { id, email } = await creerCompte(ctx.app, prenom)
  await ctx.app.inject({ method: 'POST', url: url('/auth/mot-de-passe/oubli'), payload: { email } })
  const contrat = await creer(id, '/salaire/contrats', CONTRAT)
  const categorie = await creer(id, '/categories', { libelle: `Catégorie ${marque}`, groupe: 'flexible' })
  const charge = await creer(id, '/charges', { libelle: `Loyer ${marque}`, categorieId: categorie, nature: 'fixe', montant: 350_000, jour: 5, debut: '2027-01' })
  const enveloppe = await creer(id, '/charges', { libelle: `Courses ${marque}`, categorieId: categorie, nature: 'enveloppe', montant: 250_000, debut: '2027-01' })
  const ponctuel = await creer(id, '/ponctuels', { libelle: `Assurance ${marque}`, categorieId: categorie, montant: 240_000, date: '2027-01-15' })
  const dette = await creer(id, '/dettes', { libelle: `Prêt ${marque}`, montantTotal: 300_000, mensualite: 100_000, premiereEcheance: '2027-01-10' })
  const paiement = await creer(id, `/dettes/${dette}/paiements`, { date: '2027-01-10', montant: 100_000 })
  const depense = await creer(id, '/depenses', { date: '2027-01-12', montant: 40_000, categorieId: categorie, chargeId: enveloppe, libelle: `Marché ${marque}` })
  const source = await creer(id, '/revenus/sources', { ...SOURCE, libelle: `Cours ${marque}` })
  const recu = await creer(id, '/revenus/recus', { sourceId: source, moisOccurrence: '2027-01', date: '2027-01-10', montant: 100_000 })
  await ok(id, 'PUT', '/salaire/paies/2027-02/primes', { primes: [{ libelle: `Prime ${marque}`, certitude: 'probable', montantPrevu: 50_000 }] })
  await ok(id, 'POST', '/salaire/paies/2027-01/reception', { dateReelle: '2026-12-27', salaireRecu: 1_000_000 })
  const compte = await creer(id, '/epargne/comptes', { libelle: `Épargne ${marque}`, solde: 500_000, auLe: '2027-01-01' })
  const objectif = await creer(id, '/objectifs', { libelle: `Moto ${marque}`, montantCible: 8_500_000, dateCible: '2027-12' })
  const mouvement = await creer(id, '/epargne/mouvements', { sens: 'versement', compteId: compte, objectifId: objectif, date: '2027-01-05', montant: 100_000 })
  const scenario = await creer(id, '/scenarios', { nom: `Plan ${marque}`, ajustements: { versements: { [objectif]: 300_000 } }, horizon: 12 })
  await ok(id, 'POST', '/mois/2026-12/cloturer', { forcer: true })
  // Suivi dès décembre, puis solde réel de fin de décembre (lot 35).
  await ok(id, 'PUT', '/reglages', { depart: { mois: '2026-12', solde: 0 } })
  await ok(id, 'PUT', '/mois/2026-12/cumul', { solde: 123_400 })
  await ok(id, 'POST', '/import/apercu', { fichier: { ...IMPORT, prenom: marque } })
  return { id, contrat, categorie, charge, enveloppe, ponctuel, dette, paiement, depense, source, recu, compte, objectif, mouvement, scenario }
}
type Comptes = { a: Awaited<ReturnType<typeof remplir>>; b: Awaited<ReturnType<typeof remplir>> }

/** Chaque route du compte et ce que A y tente. Clé : « MÉTHODE chemin » tel que Fastify le déclare. */
const CAS: Record<string, (c: Comptes) => Appel[]> = {
  // Compte et réglages : seulement le compte de la session. Les actions lourdes sont tentées avec un faux mot de passe.
  'PUT /compte': () => [{ chemin: '/compte', payload: { prenom: 'Alice' }, attendu: 'compte' }],
  'PUT /compte/email': () => [{ chemin: '/compte/email', payload: { email: 'b@exemple.test', motDePasse: 'mauvais-mot-de-passe' }, attendu: 'refus' }],
  'POST /compte/email/renvoi': () => [{ chemin: '/compte/email/renvoi', attendu: 'compte' }],
  'PUT /compte/mot-de-passe': () => [{ chemin: '/compte/mot-de-passe', payload: { actuel: 'mauvais-mot-de-passe', nouveau: 'nouveau-mot-de-passe' }, attendu: 'refus' }],
  'GET /compte/export': () => [{ chemin: '/compte/export', attendu: 'lecture' }],
  'POST /compte/restauration': () => [{ chemin: '/compte/restauration', payload: { format: 'mysalary-export', version: 1 }, attendu: 'refus' }],
  'POST /compte/reinitialisation': () => [{ chemin: '/compte/reinitialisation', payload: { motDePasse: 'mauvais-mot-de-passe' }, attendu: 'refus' }],
  'POST /compte/suppression': () => [{ chemin: '/compte/suppression', payload: { motDePasse: 'mauvais-mot-de-passe' }, attendu: 'refus' }],
  'GET /reglages': () => [{ chemin: '/reglages', attendu: 'lecture' }],
  'PUT /reglages': () => [{ chemin: '/reglages', payload: { animations: false }, attendu: 'compte' }],
  'GET /onboarding': () => [{ chemin: '/onboarding', attendu: 'lecture' }],
  'PUT /onboarding': () => [{ chemin: '/onboarding', payload: { termine: true }, attendu: 'compte' }],

  // Salaire.
  'GET /salaire/contrats': () => [{ chemin: '/salaire/contrats', attendu: 'lecture' }],
  'POST /salaire/contrats': () => [{ chemin: '/salaire/contrats', payload: { ...CONTRAT, moisEffet: '2027-06' }, attendu: 'compte' }],
  'PUT /salaire/contrats/:id': ({ b }) => [{ chemin: `/salaire/contrats/${b.contrat}`, payload: { montantNet: 1 }, attendu: 'introuvable' }],
  'DELETE /salaire/contrats/:id': ({ b }) => [{ chemin: `/salaire/contrats/${b.contrat}`, attendu: 'introuvable' }],
  'GET /salaire/paies': () => [{ chemin: '/salaire/paies?du=2026-12&au=2027-03', attendu: 'lecture' }],
  'PUT /salaire/paies/:mois/primes': () => [{ chemin: '/salaire/paies/2027-03/primes', payload: { primes: [] }, attendu: 'compte' }],
  'POST /salaire/paies/:mois/reception': () => [{ chemin: '/salaire/paies/2027-01/reception', payload: { dateReelle: '2026-12-27', salaireRecu: 900_000 }, attendu: 'compte' }],
  'DELETE /salaire/paies/:mois/reception': () => [{ chemin: '/salaire/paies/2027-01/reception', attendu: 'compte' }],

  // Mois, année, cumul : pages calculées.
  'GET /mois/courant': () => [{ chemin: '/mois/courant', attendu: 'lecture' }],
  'GET /mois/:cle': () => [{ chemin: '/mois/2027-01', attendu: 'lecture' }],
  'GET /mois/:cle/bilan': () => ['2026-12', '2027-01', '2027-02'].map((m) => ({ chemin: `/mois/${m}/bilan`, attendu: 'lecture' as const })),
  'GET /mois/:cle/calendrier': () => [{ chemin: '/mois/2027-01/calendrier', attendu: 'lecture' }],
  'GET /mois/:cle/semaines': () => [{ chemin: '/mois/2027-01/semaines', attendu: 'lecture' }],
  'GET /cumul': () => [{ chemin: '/cumul?du=2026-12&au=2027-06', attendu: 'lecture' }],
  'GET /annee/:annee': () => [{ chemin: '/annee/2027', attendu: 'lecture' }],
  'GET /annee/:annee/suivi': () => [{ chemin: '/annee/2027/suivi', attendu: 'lecture' }],
  'POST /mois/:cle/cloturer': () => [{ chemin: '/mois/2026-11/cloturer', payload: { forcer: true }, attendu: 'compte' }],
  'POST /mois/:cle/rouvrir': () => [{ chemin: '/mois/2026-11/rouvrir', attendu: 'compte' }],
  'PUT /mois/:cle/cumul': () => [{ chemin: '/mois/2026-12/cumul', payload: { solde: 1 }, attendu: 'compte' }],
  'DELETE /mois/:cle/cumul': () => [{ chemin: '/mois/2026-12/cumul', attendu: 'compte' }],

  // Autres revenus.
  'GET /revenus/sources': () => [{ chemin: '/revenus/sources', attendu: 'lecture' }],
  'POST /revenus/sources': () => [{ chemin: '/revenus/sources', payload: SOURCE, attendu: 'compte' }],
  'PUT /revenus/sources/:id': ({ b }) => [{ chemin: `/revenus/sources/${b.source}`, payload: { ...SOURCE, montant: 1 }, attendu: 'introuvable' }],
  'DELETE /revenus/sources/:id': ({ b }) => [{ chemin: `/revenus/sources/${b.source}`, attendu: 'introuvable' }],
  'GET /revenus/prevus': () => [{ chemin: '/revenus/prevus?du=2027-01&au=2027-03', attendu: 'lecture' }],
  'GET /revenus/resume': () => [{ chemin: '/revenus/resume', attendu: 'lecture' }],
  'GET /revenus/recus': () => [{ chemin: '/revenus/recus', attendu: 'lecture' }],
  'POST /revenus/recus': ({ b }) => [{ chemin: '/revenus/recus', payload: { sourceId: b.source, moisOccurrence: '2027-01', date: '2027-01-11', montant: 1 }, attendu: 'refus' }],
  'PUT /revenus/recus/:id': ({ b }) => [{ chemin: `/revenus/recus/${b.recu}`, payload: { libelle: 'Cadeau', date: '2027-01-11', montant: 1 }, attendu: 'introuvable' }],
  'DELETE /revenus/recus/:id': ({ b }) => [{ chemin: `/revenus/recus/${b.recu}`, attendu: 'introuvable' }],

  // Catégories, charges, ponctuels, dettes.
  'GET /categories': () => [{ chemin: '/categories', attendu: 'lecture' }],
  'POST /categories': () => [{ chemin: '/categories', payload: { libelle: 'Divers', groupe: 'flexible' }, attendu: 'compte' }],
  'PUT /categories/:id': ({ b }) => [{ chemin: `/categories/${b.categorie}`, payload: { libelle: 'Volée', groupe: 'flexible' }, attendu: 'introuvable' }],
  'DELETE /categories/:id': ({ b }) => [{ chemin: `/categories/${b.categorie}`, attendu: 'introuvable' }],
  'GET /charges/resume': () => [{ chemin: '/charges/resume', attendu: 'lecture' }],
  'GET /charges': () => [{ chemin: '/charges', attendu: 'lecture' }],
  'POST /charges': ({ b }) => [
    { chemin: '/charges', payload: { libelle: 'Loyer', categorieId: b.categorie, nature: 'fixe', montant: 1, jour: 5, debut: '2027-01' }, attendu: 'refus' },
  ],
  'PUT /charges/:id': ({ a, b }) => [
    { chemin: `/charges/${b.charge}`, payload: { libelle: 'Loyer', categorieId: a.categorie, nature: 'fixe', montant: 1, jour: 5, debut: '2027-01' }, attendu: 'introuvable' },
    { chemin: `/charges/${a.charge}`, payload: { libelle: 'Loyer', categorieId: b.categorie, nature: 'fixe', montant: 1, jour: 5, debut: '2027-01' }, attendu: 'refus' },
  ],
  'DELETE /charges/:id': ({ b }) => [{ chemin: `/charges/${b.charge}`, attendu: 'introuvable' }],
  'GET /ponctuels': () => [{ chemin: '/ponctuels', attendu: 'lecture' }],
  'POST /ponctuels': ({ b }) => [{ chemin: '/ponctuels', payload: { libelle: 'Assurance', categorieId: b.categorie, montant: 1, date: '2027-02-10' }, attendu: 'refus' }],
  'PUT /ponctuels/:id': ({ a, b }) => [
    { chemin: `/ponctuels/${b.ponctuel}`, payload: { libelle: 'Assurance', categorieId: a.categorie, montant: 1, date: '2027-02-10' }, attendu: 'introuvable' },
    { chemin: `/ponctuels/${a.ponctuel}`, payload: { libelle: 'Assurance', categorieId: b.categorie, montant: 1, date: '2027-02-10' }, attendu: 'refus' },
  ],
  'DELETE /ponctuels/:id': ({ b }) => [{ chemin: `/ponctuels/${b.ponctuel}`, attendu: 'introuvable' }],
  'GET /dettes': () => [{ chemin: '/dettes', attendu: 'lecture' }],
  'POST /dettes': () => [{ chemin: '/dettes', payload: { libelle: 'Prêt', montantTotal: 2, mensualite: 1, premiereEcheance: '2027-02-10' }, attendu: 'compte' }],
  'PUT /dettes/:id': ({ b }) => [{ chemin: `/dettes/${b.dette}`, payload: { libelle: 'Prêt', montantTotal: 300_000, mensualite: 1_000, premiereEcheance: '2027-01-10' }, attendu: 'introuvable' }],
  'DELETE /dettes/:id': ({ b }) => [{ chemin: `/dettes/${b.dette}`, attendu: 'introuvable' }],
  'POST /dettes/:id/paiements': ({ b }) => [{ chemin: `/dettes/${b.dette}/paiements`, payload: { date: '2027-01-11', montant: 1 }, attendu: 'introuvable' }],
  'DELETE /dettes/:id/paiements/:paiementId': ({ a, b }) => [
    { chemin: `/dettes/${b.dette}/paiements/${b.paiement}`, attendu: 'introuvable' },
    { chemin: `/dettes/${a.dette}/paiements/${b.paiement}`, attendu: 'introuvable' },
  ],

  // Dépenses.
  'GET /depenses': () => ['2027-01', '2027-02'].map((m) => ({ chemin: `/depenses?mois=${m}`, attendu: 'lecture' as const })),
  'GET /depenses/rattachements': () => [{ chemin: '/depenses/rattachements?date=2027-01-15', attendu: 'lecture' }],
  'POST /depenses': ({ a, b }) => [
    { chemin: '/depenses', payload: { date: '2027-01-15', montant: 1, categorieId: b.categorie }, attendu: 'refus' },
    { chemin: '/depenses', payload: { date: '2027-01-15', montant: 1, categorieId: a.categorie, chargeId: b.enveloppe }, attendu: 'refus' },
    { chemin: '/depenses', payload: { date: '2027-01-15', montant: 1, categorieId: a.categorie, ponctuelId: b.ponctuel }, attendu: 'refus' },
  ],
  'PUT /depenses/:id': ({ a, b }) => [
    { chemin: `/depenses/${b.depense}`, payload: { date: '2027-01-15', montant: 1, categorieId: a.categorie }, attendu: 'introuvable' },
    { chemin: `/depenses/${a.depense}`, payload: { date: '2027-01-15', montant: 1, categorieId: a.categorie, chargeId: b.enveloppe }, attendu: 'refus' },
  ],
  'DELETE /depenses/:id': ({ b }) => [{ chemin: `/depenses/${b.depense}`, attendu: 'introuvable' }],

  // Épargne et objectifs.
  'GET /epargne': () => [{ chemin: '/epargne', attendu: 'lecture' }],
  'POST /epargne/comptes': () => [{ chemin: '/epargne/comptes', payload: { libelle: 'Livret', solde: 1, auLe: '2027-01-01' }, attendu: 'compte' }],
  'PUT /epargne/comptes/:id': ({ b }) => [{ chemin: `/epargne/comptes/${b.compte}`, payload: { libelle: 'Volé', solde: 0, auLe: '2027-01-01' }, attendu: 'introuvable' }],
  'DELETE /epargne/comptes/:id': ({ b }) => [{ chemin: `/epargne/comptes/${b.compte}`, attendu: 'introuvable' }],
  'POST /epargne/mouvements': ({ a, b }) => [
    { chemin: '/epargne/mouvements', payload: { sens: 'versement', compteId: b.compte, date: '2027-01-15', montant: 1 }, attendu: 'refus' },
    { chemin: '/epargne/mouvements', payload: { sens: 'versement', compteId: a.compte, objectifId: b.objectif, date: '2027-01-15', montant: 1 }, attendu: 'refus' },
    { chemin: '/epargne/mouvements', payload: { sens: 'retrait', compteId: a.compte, objectifId: b.objectif, date: '2027-01-15', montant: 1 }, attendu: 'refus' },
  ],
  'DELETE /epargne/mouvements/:id': ({ b }) => [{ chemin: `/epargne/mouvements/${b.mouvement}`, attendu: 'introuvable' }],
  'GET /objectifs': () => [{ chemin: '/objectifs', attendu: 'lecture' }],
  'POST /objectifs': () => [{ chemin: '/objectifs', payload: { libelle: 'Voyage', montantCible: 100_000 }, attendu: 'compte' }],
  'POST /objectifs/apercu': ({ b }) => [
    { chemin: '/objectifs/apercu', payload: { libelle: 'Voyage', montantCible: 100_000 }, attendu: 'lecture' },
    { chemin: `/objectifs/apercu?remplace=${b.objectif}`, payload: { libelle: 'Voyage', montantCible: 100_000 }, attendu: 'introuvable' },
  ],
  'PUT /objectifs/ordre': ({ b }) => [{ chemin: '/objectifs/ordre', payload: { ids: [b.objectif] }, attendu: 'refus' }],
  'GET /objectifs/:id': ({ b }) => [{ chemin: `/objectifs/${b.objectif}`, attendu: 'introuvable' }],
  'PUT /objectifs/:id': ({ b }) => [{ chemin: `/objectifs/${b.objectif}`, payload: { libelle: 'Volé', montantCible: 1 }, attendu: 'introuvable' }],
  'DELETE /objectifs/:id': ({ b }) => [{ chemin: `/objectifs/${b.objectif}`, attendu: 'introuvable' }],
  'POST /objectifs/:id/statut': ({ b }) => [{ chemin: `/objectifs/${b.objectif}/statut`, payload: { statut: 'abandonne' }, attendu: 'introuvable' }],
  'POST /objectifs/:id/realiser': ({ a, b }) => [
    { chemin: `/objectifs/${b.objectif}/realiser`, payload: { date: '2027-01-15', compteId: a.compte }, attendu: 'introuvable' },
    { chemin: `/objectifs/${a.objectif}/realiser`, payload: { date: '2027-01-15', compteId: b.compte }, attendu: 'introuvable' },
  ],

  // Simulateur et scénarios. Un scénario ne garde pas les leviers qui visent B.
  'POST /simulations/executer': ({ b }) => [
    { chemin: '/simulations/executer', payload: { ajustements: { versements: { [b.objectif]: 1_000 }, reductions: [{ chargeId: b.charge, montant: 1 }] } }, attendu: 'compte' },
  ],
  'POST /simulations/appliquer': ({ b }) => [
    { chemin: '/simulations/appliquer', payload: { ajustements: { versements: { [b.objectif]: 1_000 } } }, attendu: 'introuvable' },
    { chemin: '/simulations/appliquer', payload: { ajustements: { reductions: [{ chargeId: b.charge, montant: 1 }] } }, attendu: 'introuvable' },
  ],
  'GET /scenarios': () => [{ chemin: '/scenarios', attendu: 'lecture' }],
  'POST /scenarios': ({ b }) => [
    { chemin: '/scenarios', payload: { nom: 'Plan', ajustements: { versements: { [b.objectif]: 1_000 }, reductions: [{ chargeId: b.charge, montant: 1 }] } }, attendu: 'compte' },
  ],
  'PUT /scenarios/:id': ({ a, b }) => [
    { chemin: `/scenarios/${b.scenario}`, payload: { nom: 'Volé', ajustements: {} }, attendu: 'introuvable' },
    { chemin: `/scenarios/${a.scenario}`, payload: { nom: 'Plan', ajustements: { datesCibles: { [b.objectif]: '2027-06' } } }, attendu: 'compte' },
  ],
  'DELETE /scenarios/:id': ({ b }) => [{ chemin: `/scenarios/${b.scenario}`, attendu: 'introuvable' }],

  // Conseils, Aujourd'hui, import.
  'GET /recommandations': () => [{ chemin: '/recommandations', attendu: 'lecture' }],
  'GET /aujourdhui': () => [{ chemin: '/aujourdhui', attendu: 'lecture' }],
  'GET /indicateurs': () => [{ chemin: '/indicateurs', attendu: 'lecture' }],
  'POST /import/apercu': () => [{ chemin: '/import/apercu', payload: { fichier: IMPORT }, attendu: 'compte' }],
  'PUT /import/lignes/:id': () => [{ chemin: '/import/lignes/salaire', payload: { statut: 'ignore' }, attendu: 'compte' }],
  'DELETE /import': () => [{ chemin: '/import', attendu: 'compte' }],

  // En dernier : ferme toutes les sessions de A, celle de ce test comprise.
  'POST /compte/sessions/fermeture': () => [{ chemin: '/compte/sessions/fermeture', attendu: 'compte' }],
}

/** Tables qui portent `utilisateurId` : lues dans le schéma, une nouvelle table est couverte d'office. */
const TABLES = Prisma.dmmf.datamodel.models
  .filter((m) => m.fields.some((f) => f.name === 'utilisateurId'))
  .map((m) => m.name[0]!.toLowerCase() + m.name.slice(1))

type Delegue = { findMany(args: object): Promise<Record<string, unknown>[]> }
async function instantane(utilisateurId: string) {
  const lignes: Record<string, Record<string, unknown>[]> = {}
  for (const table of TABLES) {
    lignes[table] = await (ctx.prisma as unknown as Record<string, Delegue>)[table]!.findMany({ where: { utilisateurId }, orderBy: { id: 'asc' } })
  }
  lignes.utilisateur = [(await ctx.prisma.utilisateur.findUnique({ where: { id: utilisateurId } }))!]
  return lignes
}

describe('matrice d’isolation entre deux comptes', () => {
  it('chaque route du compte a son cas de test, et aucun cas ne vise une route disparue', () => {
    const declarees = [...new Set(ctx.routes)].map((r) => r.replace(PREFIXE_API, '')).sort()
    expect(declarees.length).toBeGreaterThan(80)
    expect(Object.keys(CAS).sort()).toEqual(declarees)
  })

  it('A ne lit, ne modifie, ne supprime ni ne référence rien de B, sur toutes les routes', async () => {
    ctx.jour = '2027-01-20'
    const b = await remplir('B', MARQUE)
    const a = await remplir('A', 'de A')
    const avantB = await instantane(b.id)
    const idsB = new Set(Object.values(avantB).flatMap((lignes) => lignes.map((l) => String(l.id))))
    expect(Object.entries(avantB).filter(([, lignes]) => lignes.length === 0).map(([t]) => t), 'tables vides chez B').toEqual([])

    const nonConformes: string[] = []
    for (const [route, cas] of Object.entries(CAS)) {
      const methode = route.split(' ')[0] as Methode
      for (const { chemin, payload, attendu } of cas({ a, b })) {
        const r = await appeler(a.id, methode, chemin, payload ?? (methode === 'POST' ? {} : undefined))
        const fuite = [...idsB].some((id) => r.body.includes(id)) || r.body.includes(MARQUE)
        const statutOk = {
          lecture: r.statusCode === 200,
          introuvable: r.statusCode === 404,
          refus: r.statusCode >= 400 && r.statusCode < 500,
          compte: r.statusCode < 500,
        }[attendu]
        if (!statutOk || fuite) nonConformes.push(`${methode} ${chemin} → ${r.statusCode}${fuite ? ' (données de B dans la réponse)' : ''} : ${r.body.slice(0, 160)}`)
      }
    }
    expect(nonConformes).toEqual([])

    // B n'a pas changé d'un octet ; rien chez A ne pointe vers B.
    expect(await instantane(b.id)).toEqual(avantB)
    const chezA = JSON.stringify(await instantane(a.id))
    expect([...idsB].filter((id) => chezA.includes(id))).toEqual([])
    expect(chezA).not.toContain(MARQUE)

    // B retrouve tout, et sa session marche toujours.
    const objectifsB = (await ok(b.id, 'GET', '/objectifs')) as { objectifs: { id: string }[] }
    expect(JSON.stringify(objectifsB)).toContain(b.objectif)
    expect((await appeler(b.id, 'POST', '/compte/suppression', { motDePasse: MOT_DE_PASSE_TEST })).statusCode).toBe(204)
  })
})
