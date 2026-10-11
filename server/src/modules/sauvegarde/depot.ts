import { CODES_ERREUR, FORMAT_EXPORT, REGLAGES_PAR_DEFAUT, VERSION_EXPORT, type Devise, type ExportCompte, type ResultatImportCompte, type Utilisateur } from '@mysalary/partage'
import type { Prisma, PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { ErreurApi, introuvable } from '../../lib/erreurs'

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
  { cle: 'compteEpargne' },
  { cle: 'objectif' },
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

function versUtilisateur(u: { id: string; prenom: string; devise: string; onboardingEtape: number; onboardingTermine: boolean; creeLe: Date; derniereOuverture: Date | null }): Utilisateur {
  return { id: u.id, prenom: u.prenom, devise: u.devise as Devise, onboardingEtape: u.onboardingEtape, onboardingTermine: u.onboardingTermine, creeLe: u.creeLe.toISOString(), derniereOuverture: u.derniereOuverture?.toISOString() ?? null }
}

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

/**
 * Crée un NOUVEAU compte à partir d'un export : rien n'est écrasé. Chaque ligne reçoit un nouvel identifiant,
 * les liens sont recopiés d'après les anciens. Tout ou rien.
 */
export async function importer(prisma: PrismaClient, fichier: ExportCompte): Promise<ResultatImportCompte> {
  if (fichier.version > VERSION_EXPORT) throw invalide('Cet export vient d’une version plus récente de MySalary.')
  const nouveauxIds = new Map<string, string>()
  const idDe = (ancien: string) => {
    let n = nouveauxIds.get(ancien)
    if (!n) nouveauxIds.set(ancien, (n = randomUUID()))
    return n
  }
  const deMemeNom = await prisma.utilisateur.count({ where: { prenom: fichier.compte.prenom } })
  const prenom = deMemeNom > 0 ? `${fichier.compte.prenom} (import)`.slice(0, 40) : fichier.compte.prenom
  let total = 0

  try {
    return await prisma.$transaction(
      async (tx) => {
        const cree = await tx.utilisateur.create({ data: { prenom, devise: fichier.compte.devise, onboardingEtape: 10, onboardingTermine: true } })
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
            const sortie: Record<string, unknown> = { ...l, id: idDe(l.id as string), utilisateurId: cree.id }
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
        const reglages = fichier.donnees.reglages?.[0]
        if (reglages) {
          const { id: _id, creeLe: _c, modifieLe: _m, ...champs } = reglages
          await tx.reglages.create({ data: { ...(champs as object), utilisateurId: cree.id } as Prisma.ReglagesUncheckedCreateInput })
        } else {
          await tx.reglages.create({ data: reglagesParDefaut(cree.id) })
        }
        return { utilisateur: versUtilisateur(cree), lignes: total }
      },
      { timeout: 60_000 },
    )
  } catch (e) {
    if (e instanceof ErreurApi) throw e
    throw invalide('Ce fichier ne peut pas être importé : certaines données sont illisibles.')
  }
}

function reglagesParDefaut(utilisateurId: string): Prisma.ReglagesUncheckedCreateInput {
  const { reglesScenarios: _r, depart: _d, ...reglages } = REGLAGES_PAR_DEFAUT
  return { ...reglages, utilisateurId }
}

/** Vide le compte (plan, réel, épargne, import) et le remet au départ : il reste le prénom, la devise et les réglages par défaut. */
export async function reinitialiser(prisma: PrismaClient, id: string): Promise<Utilisateur> {
  if (!(await prisma.utilisateur.findUnique({ where: { id } }))) throw introuvable('Compte')
  return prisma.$transaction(async (tx) => {
    for (const { cle } of [...TABLES].reverse()) await delegue(tx, cle).deleteMany({ where: { utilisateurId: id } })
    await tx.importSource.deleteMany({ where: { utilisateurId: id } })
    await tx.reglages.deleteMany({ where: { utilisateurId: id } })
    await tx.reglages.create({ data: reglagesParDefaut(id) })
    return versUtilisateur(await tx.utilisateur.update({ where: { id }, data: { onboardingEtape: 0, onboardingTermine: false } }))
  })
}
