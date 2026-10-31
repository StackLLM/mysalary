import { CODES_ERREUR, FORMAT_EXPORT, VERSION_EXPORT, type Devise, type ExportCompte, type ResultatImportCompte, type Utilisateur } from '@mysalary/partage'
import type { Prisma, PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { ErreurApi, introuvable } from '../../lib/erreurs'
import { reglagesParDefaut, versDto } from '../utilisateurs/depot'

/**
 * Tables d'un compte, des parents aux enfants (ordre d'import ; l'inverse sert à vider).
 * `liens` : colonne → table qu'elle désigne ; `requis` : le lien ne peut pas manquer. `json` : texte qui contient des identifiants.
 */
interface Table {
  cle: string
  liens?: Record<string, { vers: string; requis: boolean }>
  json?: string[]
}
const TABLES: Table[] = [
  { cle: 'contratSalaire' },
  { cle: 'categorie' },
  { cle: 'sourceRevenu' },
  { cle: 'paie' },
  { cle: 'lignePaie', liens: { paieId: { vers: 'paie', requis: true }, sourceId: { vers: 'sourceRevenu', requis: false } } },
  { cle: 'revenuRecu', liens: { sourceId: { vers: 'sourceRevenu', requis: false } } },
  { cle: 'charge', liens: { categorieId: { vers: 'categorie', requis: true } } },
  { cle: 'ponctuel', liens: { categorieId: { vers: 'categorie', requis: true } } },
  { cle: 'dette' },
  { cle: 'paiementDette', liens: { detteId: { vers: 'dette', requis: true } } },
  {
    cle: 'depense',
    liens: { categorieId: { vers: 'categorie', requis: true }, chargeId: { vers: 'charge', requis: false }, ponctuelId: { vers: 'ponctuel', requis: false } },
  },
  { cle: 'clotureMois', json: ['instantane', 'semaines'] },
  { cle: 'journalCloture' },
  // Soldes réels de fin de mois (lot 35).
  { cle: 'correctionCumul' },
  { cle: 'compteEpargne' },
  { cle: 'objectif' },
  // « Pas ce mois-ci » (lot 36).
  { cle: 'versementSaute', liens: { objectifId: { vers: 'objectif', requis: true } } },
  { cle: 'mouvementEpargne', liens: { compteId: { vers: 'compteEpargne', requis: true }, objectifId: { vers: 'objectif', requis: false } } },
  { cle: 'scenario', json: ['ajustements'] },
]
const DATES = new Set(['creeLe', 'modifieLe', 'recueLe', 'clotureLe', 'le'])
const TAILLE_LOT = 200

type Delegue = {
  findMany(args: unknown): Promise<Record<string, unknown>[]>
  createMany(args: unknown): Promise<unknown>
  deleteMany(args: unknown): Promise<unknown>
}
const delegue = (client: Prisma.TransactionClient | PrismaClient, cle: string) => (client as unknown as Record<string, Delegue>)[cle]!

/** Toutes les données du compte. Les identifiants d'origine restent dans le fichier pour relier les lignes entre elles. */
export async function exporter(prisma: PrismaClient, id: string, maintenant: Date): Promise<ExportCompte> {
  const compte = await prisma.utilisateur.findUnique({ where: { id } })
  if (!compte) throw introuvable('Compte')
  const donnees: ExportCompte['donnees'] = {}
  for (const { cle } of TABLES) {
    const lignes = await delegue(prisma, cle).findMany({ where: { utilisateurId: id }, orderBy: { id: 'asc' } })
    donnees[cle] = lignes.map(({ utilisateurId: _u, ...reste }) => reste)
  }
  const reglages = await prisma.reglages.findUnique({ where: { utilisateurId: id } })
  if (reglages) {
    const { utilisateurId: _u, ...reste } = reglages
    donnees.reglages = [reste]
  }
  return { format: FORMAT_EXPORT, version: VERSION_EXPORT, exporteLe: maintenant.toISOString(), compte: { prenom: compte.prenom, devise: compte.devise as Devise }, donnees }
}

const invalide = (message: string) => new ErreurApi(400, CODES_ERREUR.VALIDATION, message)

/** Un compte sans aucune donnée (seules les catégories par défaut, jamais utilisées, peuvent exister). */
export async function estVide(prisma: PrismaClient, id: string): Promise<boolean> {
  for (const { cle } of TABLES) {
    if (cle === 'categorie') continue
    if ((await delegue(prisma, cle).findMany({ where: { utilisateurId: id }, take: 1, select: { id: true } })).length > 0) return false
  }
  return true
}

/**
 * Restaure un export dans le compte connecté, seulement s'il est vide : rien n'est jamais écrasé ni fusionné.
 * Chaque ligne reçoit un nouvel identifiant, les liens sont recopiés d'après les anciens. Tout ou rien.
 */
export async function restaurer(prisma: PrismaClient, utilisateurId: string, fichier: ExportCompte): Promise<ResultatImportCompte> {
  if (fichier.version > VERSION_EXPORT) throw invalide('Cet export vient d’une version plus récente de MySalary.')
  if (!(await estVide(prisma, utilisateurId))) {
    throw new ErreurApi(409, CODES_ERREUR.CONFLIT, 'Ton compte contient déjà des données. Réinitialise-le d’abord (exporte-le avant si besoin).')
  }
  const nouveauxIds = new Map<string, string>()
  const idDe = (ancien: string) => {
    let n = nouveauxIds.get(ancien)
    if (!n) nouveauxIds.set(ancien, (n = randomUUID()))
    return n
  }
  let total = 0

  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.categorie.deleteMany({ where: { utilisateurId } })
        const existantes = new Map<string, Set<string>>()
        // Tous les anciens identifiants d'abord : les textes JSON (clôtures, scénarios) y font référence.
        for (const { cle } of TABLES) {
          const ids = new Set<string>()
          for (const l of fichier.donnees[cle] ?? []) {
            if (typeof l.id !== 'string' || ids.has(l.id)) throw invalide(`Ligne sans identifiant valide (${cle}).`)
            ids.add(l.id)
            idDe(l.id)
          }
          existantes.set(cle, ids)
        }
        const remplacer = (texte: string) => {
          let r = texte
          for (const [ancien, nouveau] of nouveauxIds) if (r.includes(ancien)) r = r.split(ancien).join(nouveau)
          return r
        }
        for (const table of TABLES) {
          const lignes = (fichier.donnees[table.cle] ?? []).map((l) => {
            const sortie: Record<string, unknown> = { ...l, id: idDe(l.id as string), utilisateurId }
            for (const [champ, valeur] of Object.entries(sortie)) if (DATES.has(champ) && typeof valeur === 'string') sortie[champ] = new Date(valeur)
            for (const [champ, lien] of Object.entries(table.liens ?? {})) {
              const ancien = l[champ]
              if (typeof ancien === 'string' && existantes.get(lien.vers)?.has(ancien)) sortie[champ] = idDe(ancien)
              else if (lien.requis) throw invalide(`Lien manquant dans « ${table.cle} ».`)
              else sortie[champ] = null
            }
            for (const champ of table.json ?? []) if (typeof sortie[champ] === 'string') sortie[champ] = remplacer(sortie[champ] as string)
            return sortie
          })
          for (let i = 0; i < lignes.length; i += TAILLE_LOT) await delegue(tx, table.cle).createMany({ data: lignes.slice(i, i + TAILLE_LOT) })
          total += lignes.length
        }
        await tx.reglages.deleteMany({ where: { utilisateurId } })
        const reglages = fichier.donnees.reglages?.[0]
        if (reglages) {
          const { id: _id, creeLe: _c, modifieLe: _m, ...champs } = reglages
          await tx.reglages.create({ data: { ...(champs as object), utilisateurId } as Prisma.ReglagesUncheckedCreateInput })
        } else {
          await tx.reglages.create({ data: { ...reglagesParDefaut(), utilisateurId } })
        }
        // Le compte vide prend la devise de l'export ; son plan est déjà fait : pas de mise en route.
        const compte = await tx.utilisateur.update({ where: { id: utilisateurId }, data: { devise: fichier.compte.devise, onboardingEtape: 10, onboardingTermine: true } })
        return { utilisateur: versDto(compte), lignes: total }
      },
      { timeout: 60_000 },
    )
  } catch (e) {
    if (e instanceof ErreurApi) throw e
    throw invalide('Ce fichier ne peut pas être importé : certaines données sont illisibles.')
  }
}

/** Vide le compte (plan, réel, épargne, import) et le remet au départ : il reste le prénom, l'e-mail, le mot de passe, la devise et les réglages par défaut. */
export async function reinitialiser(prisma: PrismaClient, id: string): Promise<Utilisateur> {
  if (!(await prisma.utilisateur.findUnique({ where: { id } }))) throw introuvable('Compte')
  return prisma.$transaction(async (tx) => {
    for (const { cle } of [...TABLES].reverse()) await delegue(tx, cle).deleteMany({ where: { utilisateurId: id } })
    await tx.importSource.deleteMany({ where: { utilisateurId: id } })
    await tx.reglages.deleteMany({ where: { utilisateurId: id } })
    await tx.reglages.create({ data: { ...reglagesParDefaut(), utilisateurId: id } })
    return versDto(await tx.utilisateur.update({ where: { id }, data: { onboardingEtape: 0, onboardingTermine: false } }))
  })
}
