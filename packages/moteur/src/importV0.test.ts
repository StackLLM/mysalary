import { describe, expect, it } from 'vitest'
import { lireDate as d } from './dates'
import { centimes } from './argent'
import { analyserMoneyGuru, decider, ERREUR_FICHIER_INCONNU, type LigneImport } from './importV0'

// Fichier fictif de la même forme que l'export money-guru (aucune donnée personnelle). Montants en dirhams.
const modele = [
  { id: 'nourriture', libelle: 'Nourriture', montant: 300 },
  { id: 'transport', libelle: 'Transport', montant: 150 },
  { id: 'sante', libelle: 'Savings', montant: 500 },
  { id: 'assurance', libelle: 'Assurances', montant: 0 },
  { id: 'telecom', libelle: 'Téléphone & internet', montant: 120 },
  { id: 'famille', libelle: 'Obligations familiales', montant: 400 },
  { id: 'gym', libelle: 'Gym', montant: 250 },
  { id: 'fun', libelle: 'Fun', montant: 800 },
  { id: 'karim', libelle: 'Karim', montant: 0 },
]
const fichier = {
  prenom: 'Test',
  devise: 'MAD',
  revenuNet: 5000,
  depenses: modele,
  allocation: { maintenance: 50 },
  patrimoine: { liquide: 0 },
  soldeFondsUrgence: 0,
  versementSalaire: { jour: 28, financeMoisSuivant: true },
  mois: {
    '2026-01': { revenuPercu: 3000 },
    '2026-02': { revenuPercu: 3000 },
    '2026-03': { revenuPercu: 3000 },
    '2026-09': { revenuPercu: 12000 },
    '2026-10': { revenuPercu: 8000 },
    '2026-11': { revenuPercu: 8000 },
    '2026-12': {
      revenuPercu: 8000,
      depenses: modele.map((x) => (x.id === 'assurance' ? { ...x, montant: 450 } : x.id === 'famille' ? { ...x, montant: 700 } : x.id === 'karim' ? { ...x, montant: 1500 } : x)).concat([{ id: 'studio', libelle: 'Studio', montant: 200 }]),
    },
    '2027-01': { revenuPercu: 8000, depenses: modele.concat([{ id: 'studio', libelle: 'Studio', montant: 200 }]) },
    '2027-02': { revenuPercu: null, depenses: modele.concat([{ id: 'studio', libelle: 'Studio', montant: 200 }]) },
  },
  objectifs: [
    { id: 'o1', libelle: 'Voiture', montant: 50000, moisCible: '2027-09', dejaMisDeCote: 10000, versementMensuel: 2500, achatEnregistre: true },
    { id: 'o2', libelle: 'Voyage', montant: 3000, moisCible: 'bientôt', dejaMisDeCote: 5000, versementMensuel: 0 },
  ],
  journal: [{ id: 'achat-o1', date: '2027-05-01', montant: 25000, libelle: 'Voiture', note: 'Objectif réalisé' }],
}

const AUJOURDHUI = d('2026-10-12')
const analyse = () => {
  const r = analyserMoneyGuru(fichier, AUJOURDHUI)
  if (!r.ok) throw new Error(r.erreur)
  return r
}
const ligne = (lignes: LigneImport[], id: string) => lignes.find((l) => l.id === id)!

describe('import de la V0 (money-guru)', () => {
  const { lignes, nonImportes, profil } = analyse()

  it('salaire : les valeurs contradictoires sont proposées, aucune n’est retenue d’office ; jour et mois suivant repris', () => {
    const salaire = ligne(lignes, 'salaire')
    expect(salaire).toMatchObject({ theme: 'salaire', etape: 3, statut: 'propose', importable: true })
    expect(salaire.donnees).toMatchObject({ type: 'salaire', choix: null, jour: 28, financeMoisSuivant: true })
    // 5 000 (profil), 8 000 (reçu sur 3 mois) et 3 000 (reçu sur 3 mois) ; le 12 000 isolé est une prime.
    expect(salaire.donnees.type === 'salaire' && salaire.donnees.options.map((o) => o.montant)).toEqual([500_000, 800_000, 300_000])
    expect(salaire.note).toBe('Le fichier contient plusieurs montants : choisis le bon.')
  })

  it('prime : l’écart d’un mois au-dessus du dernier niveau de salaire ; jamais les mois isolés sous le salaire', () => {
    expect(lignes.filter((l) => l.theme === 'primes').map((l) => [l.id, l.donnees])).toEqual([['prime:2026-09', { type: 'prime', mois: '2026-09', montant: 400_000 }]])
  })

  it('modèle de dépenses : fixes, enveloppes, épargne ; le « Savings » n’est jamais une charge ; les montants à 0 sont ignorés', () => {
    const types = lignes.filter((l) => ['charges', 'enveloppes', 'epargne'].includes(l.theme)).map((l) => [l.libelle, l.theme, (l.donnees as { montant: number }).montant])
    expect(types).toEqual([
      ['Nourriture', 'enveloppes', 30_000],
      ['Transport', 'enveloppes', 15_000],
      ['Savings', 'epargne', 50_000],
      ['Téléphone & internet', 'charges', 12_000],
      ['Obligations familiales', 'charges', 40_000],
      ['Gym', 'charges', 25_000],
      ['Fun', 'enveloppes', 80_000],
      ['Studio', 'charges', 20_000],
    ])
    expect(ligne(lignes, 'charge:telecom').donnees).toMatchObject({ categorie: 'Télécom & internet' })
    expect(ligne(lignes, 'enveloppe:nourriture').donnees).toMatchObject({ categorie: 'Alimentation' })
    expect(lignes.some((l) => l.libelle === 'Assurances' && l.theme === 'charges')).toBe(false)
    expect(lignes.filter((l) => l.theme === 'charges').every((l) => l.note?.includes('jour de paiement'))).toBe(true)
  })

  it('mois futurs qui diffèrent du modèle : ponctuels prévus ; un nom propre suivi dans le modèle est « à classer »', () => {
    const ponctuels = lignes.filter((l) => l.theme === 'ponctuels').map((l) => [l.id, l.donnees])
    // Studio revient au même montant trois mois de suite : une charge fixe proposée, pas trois ponctuels.
    expect(ponctuels).toEqual([
      ['ponctuel:2026-12:assurances', { type: 'ponctuel', libelle: 'Assurances', montant: 45_000, mois: '2026-12', categorie: 'Assurances' }],
      ['ponctuel:2026-12:obligations-familiales', { type: 'ponctuel', libelle: 'Obligations familiales', montant: 30_000, mois: '2026-12', categorie: 'Famille' }],
    ])
    const karim = ligne(lignes, 'aclasser:karim')
    expect(karim).toMatchObject({ theme: 'dettes', etape: 7, importable: true })
    expect(karim.donnees).toEqual({ type: 'aClasser', nom: 'Karim', mois: [{ mois: '2026-12', montant: 150_000 }], destination: null })
    const studio = lignes.find((l) => l.id.startsWith('charge:recurrent:'))!
    expect(studio).toMatchObject({ theme: 'charges', libelle: 'Studio', donnees: { type: 'charge', categorie: 'Autre', montant: 20_000 } })
    expect(studio.note).toContain('par mois entre décembre 2026 et février 2027')
    expect(studio.note).toContain('200 DH')
    expect(lignes.some((l) => l.id.includes('studio') && l.theme === 'ponctuels')).toBe(false)
  })

  it('objectifs : cible, date, déjà mis de côté, versement ; l’achat enregistré n’achève pas l’objectif', () => {
    expect(ligne(lignes, 'objectif:o1-0').donnees).toEqual({ type: 'objectif', libelle: 'Voiture', montantCible: 5_000_000, dateCible: '2027-09', montantInitial: 1_000_000, versementMensuel: 250_000, typeObjectif: 'voiture' })
    expect(ligne(lignes, 'objectif:o1-0').note).toContain('l’objectif reste actif')
    // Date illisible : pas de date ; déjà plus que la cible : départ à 0 ; versement à 0 : aucun.
    expect(ligne(lignes, 'objectif:o2-1').donnees).toMatchObject({ dateCible: null, montantInitial: 0, versementMensuel: null, typeObjectif: 'voyage' })
  })

  it('journal et historique des paies : informations seulement, jamais importées ; le reste du fichier est listé comme non importé', () => {
    const infos = lignes.filter((l) => l.theme === 'info')
    expect(infos.map((l) => [l.libelle, l.importable, l.statut])).toEqual([
      ['Achat noté : Voiture', false, 'ignore'],
      ['4 mois de revenu perçu', false, 'ignore'],
    ])
    expect(nonImportes).toEqual(['allocation', 'patrimoine', 'soldeFondsUrgence'])
    expect(profil).toEqual({ prenom: 'Test', devise: 'MAD' })
  })

  it('rien n’arrive comme confirmé : toute ligne importable est « proposée »', () => {
    expect(lignes.filter((l) => l.importable).every((l) => l.statut === 'propose')).toBe(true)
    expect(new Set(lignes.map((l) => l.id)).size).toBe(lignes.length)
  })

  it('fichier inconnu ou abîmé : message clair, jamais d’exception ; lignes incohérentes ignorées', () => {
    for (const mauvais of [null, 12, 'texte', [], {}, { autre: 1 }]) expect(analyserMoneyGuru(mauvais, AUJOURDHUI)).toEqual({ ok: false, erreur: ERREUR_FICHIER_INCONNU })
    const abime = analyserMoneyGuru({ depenses: [{ libelle: 'Gym', montant: -5 }, { libelle: '', montant: 10 }, 'x', { libelle: 'Gym', montant: 'beaucoup' }], objectifs: [{ libelle: 'Sans cible' }], mois: { 'pas-un-mois': { revenuPercu: 5 } } }, AUJOURDHUI)
    expect(abime).toMatchObject({ ok: true, lignes: [] })
  })

  it('décider : importer, ignorer, corriger ; un salaire exige un choix, une ligne à classer une destination ; une information ne bouge pas', () => {
    const salaire = ligne(lignes, 'salaire')
    expect(() => decider(salaire, { statut: 'importe' })).toThrow('Choisis d’abord le salaire')
    const choisi = decider(salaire, { choix: centimes(800_000), statut: 'importe' })
    expect(choisi).toMatchObject({ statut: 'importe', donnees: { choix: 800_000 } })
    // Le choix peut être un autre montant que ceux du fichier.
    expect(decider(salaire, { choix: centimes(900_000) }).donnees).toMatchObject({ choix: 900_000 })

    const gym = ligne(lignes, 'charge:gym')
    expect(decider(gym, { montant: centimes(30_000), libelle: ' Salle ', statut: 'importe' })).toMatchObject({ libelle: 'Salle', statut: 'importe', donnees: { montant: 30_000 } })
    expect(decider(gym, { statut: 'ignore' }).statut).toBe('ignore')
    expect(() => decider(gym, { montant: centimes(0) })).toThrow('supérieur à 0')
    expect(() => decider(gym, { libelle: '  ' })).toThrow('libellé')
    expect(() => decider(gym, { choix: centimes(1) })).toThrow('Seul le salaire')

    const karim = ligne(lignes, 'aclasser:karim')
    expect(() => decider(karim, { statut: 'importe' })).toThrow('dette ou une aide')
    expect(decider(karim, { destination: 'dette', statut: 'importe' })).toMatchObject({ statut: 'importe', donnees: { destination: 'dette' } })
    expect(decider(ligne(lignes, 'objectif:o1-0'), { montant: centimes(6_000_000) }).donnees).toMatchObject({ montantCible: 6_000_000 })
    expect(() => decider(ligne(lignes, 'historique-paies'), { statut: 'importe' })).toThrow('information')
    // La ligne d'origine n'est jamais modifiée.
    expect(gym.statut).toBe('propose')
  })
})
