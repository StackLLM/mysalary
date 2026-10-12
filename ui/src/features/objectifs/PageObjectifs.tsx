import { formaterMois, formaterMontant, type ObjectifsDto, type SuiviObjectif, type TypeObjectif } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeNature, BadgeRisque } from '../../components/Badges'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { BlocTotaux, Identite } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { Menu } from '../../components/Menu'
import { Onglets } from '../../components/Onglets'
import { Montant } from '../../components/Montant'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { CalendrierAnnee } from '../annee/CalendrierAnnee'
import { anneeDe } from '../annee/saisie'
import { ListeRecommandations } from '../conseils/Conseils'
import { useConseils } from '../conseils/requetes'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { useObjectifs, useOrdonnerObjectifs, useStatutObjectif } from '../epargne/requetes'
import { useMoisCourant } from '../salaire/requetes'
import { phraseObjectif, SCENARIOS_LIBELLES, texteEstimation, texteRegle, TYPES } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'

const VUES = [
  { valeur: 'liste', libelle: 'Objectifs' },
  { valeur: 'calendrier', libelle: 'Calendrier de l’année' },
] as const

/**
 * Objectifs (ux-ui.md (UX) § 5.7) : tous les objectifs, leur ordre de priorité, quand ils seront atteints.
 * Vue « Calendrier de l'année » (lot 14) : le cumul de chaque mois. La vue et l'année sont gardées dans l'adresse.
 */
export function PageObjectifs() {
  const objectifs = useObjectifs()
  const courant = useMoisCourant()
  const [parametres, setParametres] = useSearchParams()
  const vue = VUES.find((v) => v.valeur === parametres.get('vue')) ?? VUES[0]
  const annee = Number(parametres.get('annee')) || (courant.data ? anneeDe(courant.data.cle) : null)

  const changer = (valeurs: { vue?: string; annee?: number }) => {
    const suite = { vue: valeurs.vue ?? vue.valeur, annee: valeurs.annee ?? (parametres.get('annee') ? annee : null) }
    setParametres(
      Object.fromEntries(Object.entries({ vue: suite.vue === 'liste' ? null : suite.vue, annee: suite.vue === 'liste' || !suite.annee ? null : String(suite.annee) }).filter(([, v]) => v)) as Record<string, string>,
      { replace: true },
    )
  }

  const liste = objectifs.isError ? (
    <Carte espacement="large">
      <div className="rounded-bouton bg-alerte-fond p-5">
        <p className="text-texte font-medium text-alerte">Impossible de charger tes objectifs.</p>
        <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void objectifs.refetch()}>
          Réessayer
        </Bouton>
      </div>
    </Carte>
  ) : objectifs.isPending ? (
    <div className={GRILLE} aria-label="Chargement des objectifs">
      <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
      <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
    </div>
  ) : (
    <Objectifs donnees={objectifs.data} />
  )

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Objectifs', chemin: '/objectifs' }, { libelle: vue.valeur === 'liste' ? 'Tous les objectifs' : 'Calendrier de l’année' }]} />
      </motion.div>
      <motion.div variants={elementApparition} className="-mt-2">
        <Onglets
          valeur={vue.valeur}
          onChange={(v) => changer({ vue: v })}
          onglets={VUES.map((v) => ({
            valeur: v.valeur,
            libelle: v.libelle,
            contenu:
              v.valeur === 'liste' ? (
                liste
              ) : annee === null ? (
                <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" aria-label="Chargement du calendrier" />
              ) : (
                <CalendrierAnnee annee={annee} changerAnnee={(a) => changer({ annee: a })} />
              ),
          }))}
        />
      </motion.div>
    </motion.div>
  )
}

function Objectifs({ donnees }: { donnees: ObjectifsDto }) {
  const { epargne, capacite, fondsSecurite } = donnees
  const ordonner = useOrdonnerObjectifs()
  const statut = useStatutObjectif()
  const { ouvrirVersement } = useSaisieRapide()
  const enCours = donnees.objectifs.filter((o) => o.statut === 'actif' || o.statut === 'pause')
  const realises = donnees.objectifs.filter((o) => o.statut === 'realise')
  const abandonnes = donnees.objectifs.filter((o) => o.statut === 'abandonne')
  const aUnFonds = donnees.objectifs.some((o) => o.type === 'securite' && o.statut !== 'abandonne')

  /** Échange la priorité de deux objectifs voisins ; l'ordre complet est envoyé. */
  function deplacer(o: SuiviObjectif, sens: -1 | 1) {
    const ids = donnees.objectifs.map((x) => x.id)
    const i = ids.indexOf(o.id)
    const j = i + sens
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
    ordonner.mutate(ids, { onError: (e) => toast(e instanceof ErreurApi ? e.message : 'L’ordre n’a pas été enregistré.') })
  }

  function changerStatut(o: SuiviObjectif, nouveau: 'actif' | 'pause' | 'abandonne') {
    const textes = { actif: 'repris', pause: 'mis en pause', abandonne: 'abandonné' }
    statut.mutate(
      { id: o.id, statut: nouveau },
      {
        onSuccess: () => toast(`« ${o.libelle} » ${textes[nouveau]}.`, { action: { label: 'Annuler', onClick: () => statut.mutate({ id: o.id, statut: o.statut === 'pause' ? 'pause' : 'actif' }) } }),
        onError: (e) => toast(e instanceof ErreurApi ? e.message : 'Le changement n’a pas abouti.'),
      },
    )
  }

  return (
    <div className={GRILLE}>
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <div className="flex flex-col justify-between gap-5 sm:flex-row">
            <Identite initiale="O" nom="Objectifs" detail={`${enCours.length} en cours${realises.length ? ` · ${realises.length} réalisé${realises.length > 1 ? 's' : ''}` : ''}`} />
            <div className="flex flex-col gap-1 text-texte text-gris sm:items-end sm:text-right">
              <span>La capacité va d’abord à la priorité 1</span>
              <span>Le futur est une projection</span>
            </div>
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Épargne',
              lignes: [
                { valeur: <Montant valeur={epargne.solde} /> },
                { libelle: 'Réservé', valeur: <Montant valeur={epargne.reserve} /> },
                { libelle: 'Disponible', valeur: <Montant valeur={epargne.disponible} /> },
              ],
            }}
            droite={{
              titre: 'Capacité ce mois (projection)',
              lignes: [
                { valeur: <Montant valeur={capacite.realiste} /> },
                { libelle: 'Prudent', valeur: <Montant valeur={capacite.prudent} /> },
                { libelle: 'Ambitieux', valeur: <Montant valeur={capacite.ambitieux} /> },
              ],
            }}
          />

          {epargne.depassement > 0 && (
            <div role="alert" className="mt-5 rounded-champ bg-alerte-fond px-4 py-3 text-texte-sm text-alerte">
              <p className="font-semibold">Tes objectifs réservent {formaterMontant(epargne.depassement)} de plus que ton épargne déclarée.</p>
              <Link to="/plan?onglet=epargne" className="mt-1 inline-block font-medium text-encre-2 underline-offset-2 hover:underline">
                Réajuster dans Mon plan › Épargne
              </Link>
            </div>
          )}

          <section className="mt-8">
            <TitreSection
              titre="En cours"
              sousTitre={
                <>
                  Dans l’ordre de <span className="font-semibold text-encre-2">priorité</span> : monte un objectif pour qu’il passe avant.
                </>
              }
              action={
                <span className="flex flex-wrap gap-2">
                  <Link to="/simulateur" className={styleBouton({ variante: 'puce', taille: 'sm' })} title="Raccourci : S">
                    Simuler
                  </Link>
                  <Link to="/objectifs/nouveau" className={styleBouton({ variante: 'puce', taille: 'sm' })}>
                    + Nouvel objectif
                  </Link>
                </span>
              }
            />
            {enCours.length === 0 ? (
              <EtatVide />
            ) : (
              <ul className="mt-5 flex flex-col gap-3" aria-label="Objectifs en cours">
                {enCours.map((o, i) => (
                  <CarteObjectif
                    key={o.id}
                    objectif={o}
                    premier={i === 0}
                    dernier={i === enCours.length - 1}
                    onMonter={() => deplacer(o, -1)}
                    onDescendre={() => deplacer(o, 1)}
                    actions={[
                      { libelle: 'Verser', onSelect: () => ouvrirVersement({ objectifId: o.id }) },
                      o.statut === 'pause' ? { libelle: 'Reprendre', onSelect: () => changerStatut(o, 'actif') } : { libelle: 'Mettre en pause', onSelect: () => changerStatut(o, 'pause') },
                      { libelle: 'Abandonner', danger: true, onSelect: () => changerStatut(o, 'abandonne') },
                    ]}
                  />
                ))}
              </ul>
            )}
          </section>

          {(realises.length > 0 || abandonnes.length > 0) && (
            <div className="mt-8 flex flex-col gap-3">
              {[
                { titre: 'Réalisés', liste: realises },
                { titre: 'Abandonnés', liste: abandonnes },
              ]
                .filter((g) => g.liste.length > 0)
                .map((g) => (
                  <details key={g.titre} className="group rounded-bouton bg-interne p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-texte font-semibold text-encre">
                      {g.titre} ({g.liste.length})
                      <ChevronDown className="h-4 w-4 text-gris transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <ul className="mt-4 flex flex-col gap-3">
                      {g.liste.map((o) => (
                        <li key={o.id}>
                          <Link to={`/objectifs/${o.id}`} className="flex items-center justify-between gap-3 hover:text-lien">
                            <span className="min-w-0">
                              <span className="block truncate text-texte font-medium text-encre">{o.libelle}</span>
                              <span className="block text-texte-sm text-gris">{phraseObjectif(o)}</span>
                            </span>
                            <Montant valeur={o.epargne} className="shrink-0 font-semibold text-gris" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
            </div>
          )}

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <h3 className="mb-4 text-titre text-encre">Sur quoi reposent les projections ?</h3>
              <ul className="flex flex-col gap-2 rounded-bouton bg-interne p-5 text-texte-sm text-gris shadow-bouton">
                {(['prudent', 'realiste', 'ambitieux'] as const).map((s) => (
                  <li key={s}>
                    <span className="font-semibold text-encre">{SCENARIOS_LIBELLES[s]}</span> : {texteRegle(donnees.regles[s])} Moins les charges prévues.
                  </li>
                ))}
                <li>Chaque mois, le versement choisi passe d’abord, puis le reste va à la priorité 1, puis 2…</li>
              </ul>
            </div>
            <BlocTotaux
              lignes={[
                { libelle: 'Objectifs en cours', valeur: String(enCours.length), fort: true },
                { libelle: 'Solde', valeur: <Montant valeur={epargne.solde} /> },
                { libelle: 'Déjà mis de côté', valeur: <Montant valeur={epargne.reserve} /> },
              ]}
              total={{ libelle: 'Disponible', valeur: <Montant valeur={epargne.disponible} /> }}
            />
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <CarteSuggestions />
        {fondsSecurite && !aUnFonds && (
          <Carte titre="Fonds de sécurité">
            <p className="text-texte-sm text-gris">
              Tes charges essentielles font {formaterMontant(fondsSecurite.base)} par mois. Un fonds de sécurité couvre 3 à 6 mois :{' '}
              <span className="font-semibold text-encre">
                {formaterMontant(fondsSecurite.min)} à {formaterMontant(fondsSecurite.max)}
              </span>
              .
            </p>
            <Link to="/objectifs/nouveau?type=securite" className={styleBouton({ variante: 'blanc', className: 'mt-5 w-full' })}>
              Créer ce fonds
            </Link>
          </Carte>
        )}
        <Carte titre="Épargne">
          <p className="text-texte-sm text-gris">Ce qui est mis de côté sur un objectif est réservé. Le reste de ton épargne est disponible.</p>
          <Link to="/plan?onglet=epargne" className={styleBouton({ variante: 'blanc', className: 'mt-5 w-full' })}>
            Voir mon épargne
          </Link>
        </Carte>
      </motion.div>
    </div>
  )
}

/** Leviers chiffrés pour le premier objectif à risque (lot 12) ; rien si aucun n'aide. */
function CarteSuggestions() {
  const conseils = useConseils()
  const leviers = (conseils.data?.recommandations ?? []).filter((r) => r.type === 'reduction' || r.type === 'prime' || r.type === 'disponible')
  if (leviers.length === 0) return null
  return (
    <Carte titre="Suggestions">
      <ListeRecommandations recommandations={leviers} />
    </Carte>
  )
}

function CarteObjectif({
  objectif: o,
  premier,
  dernier,
  onMonter,
  onDescendre,
  actions,
}: {
  objectif: SuiviObjectif
  premier: boolean
  dernier: boolean
  onMonter: () => void
  onDescendre: () => void
  actions: { libelle: string; danger?: boolean; onSelect: () => void }[]
}) {
  const navigate = useNavigate()
  const { Icone } = TYPES[o.type]
  const estimation = o.estimations?.realiste
  return (
    <li className="group relative rounded-bouton border border-filet bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-filet-fort hover:shadow-carte has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-sauge sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sauge-100 text-sauge-700" aria-hidden>
          <Icone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* Toute la carte ouvre l'objectif (lien étiré) ; les boutons de priorité et le menu restent au-dessus. */}
            <Link to={`/objectifs/${o.id}`} className="truncate text-texte font-semibold text-encre after:absolute after:inset-0 after:rounded-bouton group-hover:text-lien focus-visible:outline-none">
              {o.libelle}
            </Link>
            {o.statut === 'pause' && <span className="rounded-pilule bg-teinte px-2 py-0.5 text-mention text-gris">En pause</span>}
            {o.atteint && <span className="rounded-pilule bg-positif-fond px-2 py-0.5 text-mention text-positif">Cible atteinte</span>}
            {o.risque && !o.atteint && <BadgeRisque risque={o.risque} />}
          </div>
          <p className="mt-0.5 text-texte-sm text-gris">
            <Montant valeur={o.epargne} className="font-semibold text-encre" /> sur <Montant valeur={o.montantCible} />
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={onMonter} disabled={premier} aria-label={`Monter ${o.libelle} en priorité`} className="rounded-pilule p-1 text-gris-icone hover:text-encre disabled:opacity-30">
            <ChevronUp className="h-5 w-5" />
          </button>
          <button type="button" onClick={onDescendre} disabled={dernier} aria-label={`Descendre ${o.libelle} en priorité`} className="rounded-pilule p-1 text-gris-icone hover:text-encre disabled:opacity-30">
            <ChevronDown className="h-5 w-5" />
          </button>
          <Menu
            declencheur={
              <button type="button" aria-label={`Options de ${o.libelle}`} className="rounded-pilule p-1 text-gris-icone hover:text-encre">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            }
            actions={[...actions.slice(0, 1), { libelle: 'Modifier', onSelect: () => navigate(`/objectifs/${o.id}/modifier`) }, ...actions.slice(1)]}
          />
        </div>
      </div>
      <BarreProgression className="mt-4" valeur={o.progression} libelle={`${o.libelle} : ${Math.round(o.progression * 100)} % de la cible`} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-texte-sm text-gris">
        <span>
          {o.dateCible ? `Souhaité : ${formaterMois(o.dateCible)}` : 'Sans date souhaitée'}
          {o.effortMensuel !== null && ` · ${formaterMontant(o.effortMensuel)} / mois nécessaires`}
        </span>
        {o.statut === 'actif' && !o.atteint && (
          <span className="flex items-center gap-2">
            Estimé : <span className="font-medium text-encre-2">{texteEstimation(estimation ?? null)}</span>
            <BadgeNature nature="projete" />
          </span>
        )}
      </div>
    </li>
  )
}

const EXEMPLES: TypeObjectif[] = ['moto', 'voyage', 'ordinateur', 'securite']

/** État vide (ux-ui.md (UX) § 5.7) : ce qui manque, pourquoi, et l'action. */
function EtatVide() {
  return (
    <div className="mt-5 rounded-bouton bg-interne p-6">
      <h3 className="text-titre text-encre">Crée ton premier objectif.</h3>
      <p className="mt-2 max-w-xl text-texte text-gris">Un objectif dit pour quoi tu mets de côté. MySalary calcule quand tu l’atteindras et combien verser chaque mois.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {EXEMPLES.map((t) => {
          const { Icone, libelle } = TYPES[t]
          return (
            <Link key={t} to={`/objectifs/nouveau?type=${t}`} className="inline-flex h-9 items-center gap-2 rounded-pilule bg-white px-4 text-texte-sm font-medium text-encre shadow-bouton hover:bg-teinte">
              <Icone className="h-4 w-4 text-sauge-700" aria-hidden />
              {libelle}
            </Link>
          )
        })}
      </div>
      <Link to="/objectifs/nouveau" className={styleBouton({ className: 'mt-5' })}>
        Nouvel objectif
      </Link>
    </div>
  )
}
