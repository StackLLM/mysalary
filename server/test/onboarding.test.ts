import type { OnboardingDto } from '@mysalary/partage'
import { describe, expect, it } from 'vitest'
import { creerCompte, pour, preparerApp, url } from './outils'

const ctx = preparerApp()

const appeler = (id: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', chemin: string, payload?: object) =>
  ctx.app.inject({ method, url: url(chemin), headers: pour(id), ...(payload ? { payload } : {}) })

// Fichier fictif de la forme de l'export money-guru (aucune donnée personnelle), en dirhams.
const FICHIER = {
  prenom: 'Test',
  devise: 'MAD',
  revenuNet: 5000,
  depenses: [
    { id: 'nourriture', libelle: 'Nourriture', montant: 300 },
    { id: 'savings', libelle: 'Savings', montant: 500 },
    { id: 'telecom', libelle: 'Téléphone & internet', montant: 120 },
  ],
  versementSalaire: { jour: 28, financeMoisSuivant: true },
  mois: { '2026-10': { revenuPercu: 8000 }, '2026-11': { revenuPercu: 8000 } },
  objectifs: [{ id: 'o1', libelle: 'Voiture', montant: 50000, moisCible: '2027-09', dejaMisDeCote: 10000, versementMensuel: 2500 }],
}

const onboarding = async (id: string) => (await appeler(id, 'GET', '/onboarding')).json() as OnboardingDto

describe('onboarding', () => {
  it('étape et fin sauvegardées par compte ; valeurs refusées', async () => {
    const a = (await creerCompte(ctx.app, 'A')).id
    const b = (await creerCompte(ctx.app, 'B')).id
    expect(await onboarding(a)).toEqual({ etape: 0, termine: false, import: null })
    expect((await appeler(a, 'PUT', '/onboarding', { etape: 4 })).statusCode).toBe(204)
    expect(await onboarding(a)).toMatchObject({ etape: 4, termine: false })
    expect((await appeler(a, 'PUT', '/onboarding', { termine: true })).statusCode).toBe(204)
    expect(await onboarding(a)).toMatchObject({ etape: 4, termine: true })
    expect(await onboarding(b)).toMatchObject({ etape: 0, termine: false })
    for (const mauvais of [{ etape: 11 }, { etape: -1 }, {}, { termine: 'oui' }, { autre: 1 }]) {
      expect((await appeler(a, 'PUT', '/onboarding', mauvais)).statusCode, JSON.stringify(mauvais)).toBe(400)
    }
  })

  it('aperçu d’un fichier : lignes proposées, rien n’est écrit dans le plan ; un nouveau fichier remplace le précédent', async () => {
    ctx.jour = '2026-12-15'
    const id = (await creerCompte(ctx.app, 'A')).id
    const r = await appeler(id, 'POST', '/import/apercu', { fichier: FICHIER })
    expect(r.statusCode, r.body).toBe(200)
    const apercu = r.json() as OnboardingDto['import'] & object
    expect(apercu).toMatchObject({ type: 'moneyGuruV0', profil: { prenom: 'Test', devise: 'MAD' } })
    expect(apercu.lignes.map((l) => [l.id, l.statut])).toEqual([
      ['salaire', 'propose'],
      ['enveloppe:nourriture', 'propose'],
      ['epargne:savings', 'propose'],
      ['charge:telecom', 'propose'],
      ['objectif:o1-0', 'propose'],
      ['historique-paies', 'ignore'],
    ])
    // Le plan reste vide : un import ne crée jamais de charge, de contrat ni d'objectif.
    expect((await appeler(id, 'GET', '/charges')).json()).toEqual([])
    expect((await appeler(id, 'GET', '/salaire/contrats')).json()).toEqual([])
    expect(((await appeler(id, 'GET', '/objectifs')).json() as { objectifs: unknown[] }).objectifs).toEqual([])
    expect((await onboarding(id)).import?.lignes).toHaveLength(6)

    const second = await appeler(id, 'POST', '/import/apercu', { fichier: { ...FICHIER, objectifs: [] } })
    expect((second.json() as { lignes: unknown[] }).lignes).toHaveLength(5)
  })

  it('fichier inconnu : message clair ; corps invalide', async () => {
    const id = (await creerCompte(ctx.app, 'A')).id
    const r = await appeler(id, 'POST', '/import/apercu', { fichier: { rien: 'a voir' } })
    expect(r.statusCode).toBe(422)
    expect(r.json()).toMatchObject({ erreur: { message: 'Ce fichier n’est pas un export MySalary ou money-guru.' } })
    expect((await appeler(id, 'POST', '/import/apercu', { autre: 1 })).statusCode).toBe(400)
    expect((await onboarding(id)).import).toBeNull()
  })

  it('décision par ligne : choisir un salaire avant de l’importer, corriger, ignorer ; persistée par compte', async () => {
    ctx.jour = '2026-12-15'
    const a = (await creerCompte(ctx.app, 'A')).id
    const b = (await creerCompte(ctx.app, 'B')).id
    await appeler(a, 'POST', '/import/apercu', { fichier: FICHIER })

    const sansChoix = await appeler(a, 'PUT', '/import/lignes/salaire', { statut: 'importe' })
    expect(sansChoix.statusCode).toBe(422)
    expect(sansChoix.json()).toMatchObject({ erreur: { message: expect.stringContaining('Choisis d’abord le salaire') } })

    const choisi = await appeler(a, 'PUT', '/import/lignes/salaire', { choix: 800_000, statut: 'importe' })
    expect(choisi.statusCode, choisi.body).toBe(200)
    await appeler(a, 'PUT', '/import/lignes/enveloppe:nourriture', { montant: 35_000, statut: 'importe' })
    await appeler(a, 'PUT', '/import/lignes/epargne:savings', { statut: 'ignore' })

    const lignes = (await onboarding(a)).import!.lignes
    expect(lignes.find((l) => l.id === 'salaire')).toMatchObject({ statut: 'importe', donnees: { choix: 800_000 } })
    expect(lignes.find((l) => l.id === 'enveloppe:nourriture')).toMatchObject({ statut: 'importe', donnees: { montant: 35_000 } })
    expect(lignes.find((l) => l.id === 'epargne:savings')?.statut).toBe('ignore')
    expect(lignes.find((l) => l.id === 'charge:telecom')?.statut).toBe('propose')

    expect((await appeler(a, 'PUT', '/import/lignes/inconnue', { statut: 'ignore' })).statusCode).toBe(404)
    expect((await appeler(a, 'PUT', '/import/lignes/historique-paies', { statut: 'importe' })).statusCode).toBe(422)
    expect((await appeler(a, 'PUT', '/import/lignes/charge:telecom', { montant: 0 })).statusCode).toBe(400)
    expect((await appeler(a, 'PUT', '/import/lignes/charge:telecom', { statut: 'nimporte' })).statusCode).toBe(400)
    expect((await appeler(b, 'PUT', '/import/lignes/salaire', { statut: 'ignore' })).statusCode).toBe(404)
    expect((await onboarding(b)).import).toBeNull()
  })

  it('recommencer : l’import est supprimé', async () => {
    const id = (await creerCompte(ctx.app, 'A')).id
    await appeler(id, 'POST', '/import/apercu', { fichier: FICHIER })
    expect((await appeler(id, 'DELETE', '/import')).statusCode).toBe(204)
    expect((await onboarding(id)).import).toBeNull()
    expect((await appeler(id, 'DELETE', '/import')).statusCode).toBe(204)
  })
})
