import { centimes, type Centimes } from './argent'
import { estCleMois, type CleMois, type DateCivile } from './dates'

/**
 * Import de l'ancienne app (money-guru, la V0 ; Plan.md § 7.1 bis). L'analyse **propose**, l'utilisateur **décide** ligne
 * par ligne. Tout ce qui est proposé est du prévu : rien n'est jamais importé comme réel, et rien n'est écrit ici.
 * Les montants du fichier sont en dirhams entiers ; ils sont convertis en centimes.
 */

export const ETAPES_IMPORT = { salaire: 3, primes: 4, charges: 5, enveloppes: 6, dettes: 7, ponctuels: 7, epargne: 8, objectifs: 9, info: 2 } as const
export type ThemeImport = keyof typeof ETAPES_IMPORT

/** `propose` : en attente de décision ; `importe` : accepté, à confirmer à son étape ; `ignore` ; `confirme` : créé dans le plan. */
export type StatutImport = 'propose' | 'importe' | 'ignore' | 'confirme'

export type DonneesLigneImport =
  /** Salaire : valeurs contradictoires dans le fichier, aucune n'est retenue d'office. */
  | { type: 'salaire'; options: { montant: Centimes; origine: string }[]; choix: Centimes | null; jour: number | null; financeMoisSuivant: boolean | null }
  | { type: 'prime'; mois: CleMois; montant: Centimes }
  | { type: 'charge'; categorie: string; montant: Centimes }
  | { type: 'enveloppe'; categorie: string; montant: Centimes }
  /** « Savings » : un versement d'épargne, jamais une charge (R11). */
  | { type: 'epargne'; montant: Centimes }
  /** Ligne au nom d'une personne ou inconnue : dette (avec échéancier), aide récurrente, ou ignorée. */
  | { type: 'aClasser'; nom: string; mois: { mois: CleMois; montant: Centimes }[]; destination: 'dette' | 'aide' | null }
  /** Ponctuel prévu : un mois futur qui diffère du modèle. */
  | { type: 'ponctuel'; libelle: string; montant: Centimes; mois: CleMois; categorie: string }
  | { type: 'objectif'; libelle: string; montantCible: Centimes; dateCible: CleMois | null; montantInitial: Centimes; versementMensuel: Centimes | null; typeObjectif: string }
  /** Information seulement (journal, historique des paies) : jamais importée. */
  | { type: 'info' }

export interface LigneImport {
  /** Stable pour un même fichier. */
  id: string
  theme: ThemeImport
  /** Étape de l'onboarding où la ligne se confirme. */
  etape: number
  libelle: string
  /** Pourquoi cette proposition, ou ce qui reste à décider. */
  note: string | null
  statut: StatutImport
  /** `false` : information seulement. */
  importable: boolean
  donnees: DonneesLigneImport
}

export type AnalyseImport = { ok: true; lignes: LigneImport[]; nonImportes: string[]; profil: { prenom: string | null; devise: string | null } } | { ok: false; erreur: string }

export const ERREUR_FICHIER_INCONNU = 'Ce fichier n’est pas un export MySalary ou money-guru.'

const enObjet = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const texte = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
/** Dirhams entiers → centimes ; `null` si absent, négatif ou illisible. */
const dirhams = (v: unknown): Centimes | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10_000_000 ? centimes(Math.round(v * 100)) : null)

/** « Téléphone & internet » → « telephone & internet » : comparaison sans accents ni casse. */
const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const contient = (s: string, mots: string[]) => mots.some((m) => normaliser(s).includes(m))

const MOTS_EPARGNE = ['savings', 'epargne']
const MOTS_ENVELOPPE = ['nourriture', 'transport', 'fun', 'loisir', 'sortie', 'course']
const FIXES: { mots: string[]; categorie: string }[] = [
  { mots: ['telephone', 'telecom', 'internet', 'forfait'], categorie: 'Télécom & internet' },
  { mots: ['gym', 'sport', 'fitness'], categorie: 'Sport' },
  { mots: ['assurance'], categorie: 'Assurances' },
  { mots: ['famil', 'obligation', 'aide'], categorie: 'Famille' },
  { mots: ['loyer', 'logement'], categorie: 'Logement' },
  { mots: ['abonnement', 'netflix', 'spotify'], categorie: 'Abonnements' },
]
const CATEGORIE_ENVELOPPE = (libelle: string) =>
  contient(libelle, ['nourriture', 'course']) ? 'Alimentation' : contient(libelle, ['transport']) ? 'Transport' : 'Loisirs'
const categorieFixe = (libelle: string) => FIXES.find((f) => contient(libelle, f.mots))?.categorie ?? null

const TYPE_OBJECTIF = (libelle: string) => (contient(libelle, ['moto']) ? 'moto' : contient(libelle, ['voiture', 'auto']) ? 'voiture' : contient(libelle, ['voyage']) ? 'voyage' : 'autre')

interface DepenseV0 {
  id: string
  libelle: string
  montant: Centimes
}

function lireDepenses(v: unknown): DepenseV0[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((brut, i) => {
    const o = enObjet(brut)
    const libelle = o && texte(o.libelle)
    const montant = o && dirhams(o.montant)
    return libelle && montant !== null && montant !== undefined ? [{ id: texte(o.id) ?? `ligne-${i}`, libelle, montant }] : []
  })
}

/** « 15 000 DH », « septembre 2026 » : pour les notes lues par l'utilisateur. */
const dh = (c: number) => `${(c / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} DH`
const moisHumain = (cle: string) => new Date(`${cle}-15T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

const cleLigne = (s: string) => normaliser(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function analyserMoneyGuru(brut: unknown, aujourdhui: DateCivile): AnalyseImport {
  const f = enObjet(brut)
  const attendues = ['depenses', 'mois', 'objectifs', 'versementSalaire', 'revenuNet']
  if (!f || !attendues.some((k) => k in f)) return { ok: false, erreur: ERREUR_FICHIER_INCONNU }

  const lignes: LigneImport[] = []
  const ajouter = (l: Omit<LigneImport, 'etape' | 'statut' | 'importable'> & { importable?: boolean; statut?: StatutImport }) => {
    const importable = l.importable ?? true
    lignes.push({ ...l, etape: ETAPES_IMPORT[l.theme], importable, statut: l.statut ?? (importable ? 'propose' : 'ignore') })
  }

  const moisCourant = aujourdhui.slice(0, 7)
  const mois = enObjet(f.mois) ?? {}
  const revenus = Object.entries(mois)
    .filter(([cle]) => estCleMois(cle))
    .flatMap(([cle, v]) => {
      const m = enObjet(v)
      const montant = m && dirhams(m.revenuPercu)
      return montant ? [{ cle: cle as CleMois, montant }] : []
    })
    .sort((a, b) => a.cle.localeCompare(b.cle))

  // --- Salaire : valeurs contradictoires, jamais choisies d'office. ---
  const versement = enObjet(f.versementSalaire)
  const jour = versement && typeof versement.jour === 'number' && versement.jour >= 1 && versement.jour <= 31 ? Math.trunc(versement.jour) : null
  const finance = versement && typeof versement.financeMoisSuivant === 'boolean' ? versement.financeMoisSuivant : null
  const options: { montant: Centimes; origine: string }[] = []
  const net = dirhams(f.revenuNet)
  if (net) options.push({ montant: net, origine: 'revenu net du profil' })
  // Un montant qui revient sur au moins deux mois est un vrai niveau de salaire ; un mois isolé est une prime.
  const parMontant = new Map<number, CleMois[]>()
  for (const r of revenus) parMontant.set(r.montant, [...(parMontant.get(r.montant) ?? []), r.cle])
  const niveaux = [...parMontant.entries()].filter(([, cles]) => cles.length >= 2).sort((a, b) => b[1].at(-1)!.localeCompare(a[1].at(-1)!))
  for (const [montant, cles] of niveaux) {
    if (!options.some((o) => o.montant === montant)) options.push({ montant: centimes(montant), origine: `reçu sur ${cles.length} mois (jusqu'en ${moisHumain(cles.at(-1)!)})` })
  }
  if (options.length > 0 || jour !== null) {
    ajouter({
      id: 'salaire',
      theme: 'salaire',
      libelle: 'Salaire',
      note: options.length > 1 ? 'Le fichier contient plusieurs montants : choisis le bon.' : null,
      donnees: { type: 'salaire', options, choix: options.length === 1 ? options[0]!.montant : null, jour, financeMoisSuivant: finance },
    })
  }

  // --- Primes : l'écart d'un mois au-dessus du dernier niveau de salaire. ---
  const reference = niveaux[0] ? centimes(niveaux[0][0]) : null
  if (reference) {
    for (const r of revenus) {
      if (r.montant > reference) {
        ajouter({
          id: `prime:${r.cle}`,
          theme: 'primes',
          libelle: `Prime de ${moisHumain(r.cle)}`,
          note: `${dh(r.montant)} reçus ce mois-là, moins un salaire de ${dh(reference)} : l'écart est proposé comme prime.`,
          donnees: { type: 'prime', mois: r.cle, montant: centimes(r.montant - reference) },
        })
      }
    }
  }

  // --- Modèle de dépenses : charges fixes, enveloppes, épargne, à classer. ---
  const modele = lireDepenses(f.depenses)
  // Par libellé seulement : l'ancienne app réutilise un identifiant quand on renomme une ligne.
  const dansModele = (d: { libelle: string }) => modele.find((m) => normaliser(m.libelle) === normaliser(d.libelle))
  const classe = (libelle: string): 'epargne' | 'enveloppe' | 'fixe' | 'inconnu' =>
    contient(libelle, MOTS_EPARGNE) ? 'epargne' : contient(libelle, MOTS_ENVELOPPE) ? 'enveloppe' : categorieFixe(libelle) ? 'fixe' : 'inconnu'
  /** Lignes à classer, une par nom : créées dès qu'un montant est prévu (modèle ou mois futur). */
  const aClasser = new Map<string, LigneImport>()
  const ligneAClasser = (nom: string) => {
    const cle = normaliser(nom)
    let ligne = aClasser.get(cle)
    if (!ligne) {
      ajouter({ id: `aclasser:${cleLigne(nom)}`, theme: 'dettes', libelle: nom, note: 'Dette (avec un échéancier) ou aide récurrente ? Tu décides.', donnees: { type: 'aClasser', nom, mois: [], destination: null } })
      ligne = lignes.at(-1)!
      aClasser.set(cle, ligne)
    }
    return ligne.donnees as Extract<DonneesLigneImport, { type: 'aClasser' }>
  }
  for (const d of modele) {
    if (d.montant === 0) continue
    const cle = cleLigne(d.id || d.libelle)
    switch (classe(d.libelle)) {
      case 'epargne':
        ajouter({ id: `epargne:${cle}`, theme: 'epargne', libelle: d.libelle, note: 'Un versement d’épargne, pas une charge : il sert à proposer le versement mensuel de ton objectif.', donnees: { type: 'epargne', montant: d.montant } })
        break
      case 'enveloppe':
        ajouter({ id: `enveloppe:${cle}`, theme: 'enveloppes', libelle: d.libelle, note: 'Budget par mois, que tu consommes comme tu veux.', donnees: { type: 'enveloppe', categorie: CATEGORIE_ENVELOPPE(d.libelle), montant: d.montant } })
        break
      case 'fixe':
        ajouter({ id: `charge:${cle}`, theme: 'charges', libelle: d.libelle, note: 'Le jour de paiement n’est pas dans le fichier : à toi de le donner.', donnees: { type: 'charge', categorie: categorieFixe(d.libelle)!, montant: d.montant } })
        break
      default:
        ligneAClasser(d.libelle).mois.push({ mois: moisCourant as CleMois, montant: d.montant })
    }
  }

  // --- Mois à venir qui diffèrent du modèle : ponctuels prévus, ou charge fixe si le même écart revient chaque mois. ---
  interface Ecart {
    libelle: string
    mois: CleMois
    ecart: Centimes
    existait: boolean
    categorie: string
  }
  const ecarts: Ecart[] = []
  for (const [cle, v] of Object.entries(mois).sort(([a], [b]) => a.localeCompare(b))) {
    const m = enObjet(v)
    if (!estCleMois(cle) || cle < moisCourant || !m) continue
    for (const d of lireDepenses(m.depenses)) {
      if (classe(d.libelle) === 'epargne') continue
      const base = dansModele(d)
      const ecart = d.montant - (base?.montant ?? 0)
      if (ecart <= 0) continue
      // Un nom propre déjà suivi dans le modèle (même à 0) : une décision à poser, pas un ponctuel.
      if (base && classe(d.libelle) === 'inconnu') {
        ligneAClasser(d.libelle).mois.push({ mois: cle, montant: centimes(d.montant) })
        continue
      }
      ecarts.push({ libelle: d.libelle, mois: cle, ecart: centimes(ecart), existait: Boolean(base), categorie: categorieFixe(d.libelle) ?? (classe(d.libelle) === 'enveloppe' ? CATEGORIE_ENVELOPPE(d.libelle) : 'Autre') })
    }
  }
  /** Le même écart sur trois mois au moins : une charge qui revient, pas trois ponctuels. */
  const MOIS_RECURRENT = 3
  const groupes = new Map<string, Ecart[]>()
  for (const e of ecarts) groupes.set(`${normaliser(e.libelle)}|${e.ecart}`, [...(groupes.get(`${normaliser(e.libelle)}|${e.ecart}`) ?? []), e])
  const recurrents = new Set<Ecart>()
  for (const [cle, liste] of groupes) {
    if (liste.length < MOIS_RECURRENT) continue
    liste.forEach((e) => recurrents.add(e))
    const premier = liste[0]!
    ajouter({
      id: `charge:recurrent:${cleLigne(cle)}`,
      theme: 'charges',
      libelle: premier.existait ? `${premier.libelle} (complément)` : premier.libelle,
      note: `${dh(premier.ecart)} par mois entre ${moisHumain(premier.mois)} et ${moisHumain(liste.at(-1)!.mois)} dans ton fichier${premier.existait ? ', en plus du montant habituel' : ''} : proposé comme charge fixe. Le jour de paiement est à toi de le donner.`,
      donnees: { type: 'charge', categorie: premier.categorie, montant: premier.ecart },
    })
  }
  for (const e of ecarts) {
    if (recurrents.has(e)) continue
    ajouter({
      id: `ponctuel:${e.mois}:${cleLigne(e.libelle)}`,
      theme: 'ponctuels',
      libelle: e.libelle,
      note: e.existait ? `${dh(e.ecart)} en plus du montant habituel en ${moisHumain(e.mois)} : proposé comme ponctuel.` : `Ligne absente du modèle, prévue en ${moisHumain(e.mois)}.`,
      donnees: { type: 'ponctuel', libelle: e.libelle, montant: e.ecart, mois: e.mois, categorie: e.categorie },
    })
  }

  // --- Objectifs ---
  const objectifs = Array.isArray(f.objectifs) ? f.objectifs : []
  objectifs.forEach((brutObjectif, i) => {
    const o = enObjet(brutObjectif)
    const libelle = o && texte(o.libelle)
    const cible = o && dirhams(o.montant)
    if (!o || !libelle || !cible) return
    const dateCible = typeof o.moisCible === 'string' && estCleMois(o.moisCible) ? o.moisCible : null
    const initial = dirhams(o.dejaMisDeCote) ?? centimes(0)
    const versementMensuel = dirhams(o.versementMensuel)
    ajouter({
      id: `objectif:${cleLigne(texte(o.id) ?? libelle)}-${i}`,
      theme: 'objectifs',
      libelle,
      note: o.achatEnregistre === true ? 'L’ancienne app avait enregistré l’achat : ici l’objectif reste actif, et l’achat se note quand tu le réalises.' : null,
      donnees: {
        type: 'objectif',
        libelle,
        montantCible: cible,
        dateCible,
        montantInitial: initial > cible ? centimes(0) : initial,
        versementMensuel: versementMensuel && versementMensuel > 0 ? versementMensuel : null,
        typeObjectif: TYPE_OBJECTIF(libelle),
      },
    })
  })

  // --- Informations : journal, historique des paies. Jamais importés. ---
  const journal = Array.isArray(f.journal) ? f.journal : []
  for (const brutAchat of journal) {
    const a = enObjet(brutAchat)
    const libelle = a && texte(a.libelle)
    const montant = a && dirhams(a.montant)
    if (!a || !libelle || !montant) continue
    ajouter({
      id: `journal:${cleLigne(texte(a.id) ?? libelle)}`,
      theme: 'info',
      libelle: `Achat noté : ${libelle}`,
      note: `${dh(montant)} le ${texte(a.date) ?? 'date inconnue'}. Non importé : ici, un achat se note quand l'objectif est réalisé, sans être compté deux fois.`,
      importable: false,
      donnees: { type: 'info' },
    })
  }
  const passes = revenus.filter((r) => r.cle < moisCourant)
  if (passes.length > 0) {
    ajouter({
      id: 'historique-paies',
      theme: 'info',
      libelle: `${passes.length} mois de revenu perçu`,
      note: 'Non importé : une paie est reçue seulement quand tu la confirmes (étape Salaire, ou Mon plan).',
      importable: false,
      donnees: { type: 'info' },
    })
  }

  const nonImportes = ['allocation', 'patrimoine', 'tauxRendementAnnuel', 'soldeFondsUrgence', 'redirectionApresUrgence', 'methode'].filter((k) => k in f)
  return { ok: true, lignes, nonImportes, profil: { prenom: texte(f.prenom), devise: texte(f.devise) } }
}

/** Ce que l'utilisateur peut changer sur une ligne : sa décision, et les valeurs qu'il corrige. */
export interface DecisionImport {
  statut?: StatutImport
  libelle?: string
  /** Montant corrigé : le montant principal de la ligne (cible pour un objectif). */
  montant?: Centimes
  /** Salaire : le montant choisi parmi les valeurs du fichier, ou un autre. */
  choix?: Centimes | null
  destination?: 'dette' | 'aide' | null
}

/**
 * Applique une décision à une ligne (importer, ignorer, modifier, confirmer). Une ligne d'information ne change pas ;
 * un salaire ne s'importe pas sans montant choisi, une ligne à classer sans destination.
 */
export function decider(ligne: LigneImport, decision: DecisionImport): LigneImport {
  if (!ligne.importable) throw new RangeError('Cette ligne est une information : elle ne s’importe pas.')
  const d = ligne.donnees
  const donnees = { ...d } as DonneesLigneImport & Record<string, unknown>
  let libelle = ligne.libelle
  if (decision.libelle !== undefined) {
    libelle = decision.libelle.trim()
    if (!libelle) throw new RangeError('Le libellé ne peut pas être vide.')
    if ('libelle' in donnees) donnees.libelle = libelle
    if ('nom' in donnees) donnees.nom = libelle
  }
  if (decision.montant !== undefined) {
    if (!(decision.montant > 0)) throw new RangeError('Entre un montant supérieur à 0.')
    if (d.type === 'objectif') donnees.montantCible = decision.montant
    else if ('montant' in donnees) donnees.montant = decision.montant
    else throw new RangeError('Cette ligne n’a pas de montant à corriger.')
  }
  if (decision.choix !== undefined) {
    if (d.type !== 'salaire') throw new RangeError('Seul le salaire se choisit.')
    if (decision.choix !== null && !(decision.choix > 0)) throw new RangeError('Entre un salaire supérieur à 0.')
    donnees.choix = decision.choix
  }
  if (decision.destination !== undefined) {
    if (d.type !== 'aClasser') throw new RangeError('Cette ligne n’est pas à classer.')
    donnees.destination = decision.destination
  }
  const statut = decision.statut ?? ligne.statut
  if (statut === 'importe' || statut === 'confirme') {
    if (donnees.type === 'salaire' && donnees.choix === null) throw new RangeError('Choisis d’abord le salaire : le fichier contient plusieurs montants.')
    if (donnees.type === 'aClasser' && donnees.destination === null) throw new RangeError('Dis si c’est une dette ou une aide récurrente.')
  }
  return { ...ligne, donnees: donnees as DonneesLigneImport, libelle, statut }
}
