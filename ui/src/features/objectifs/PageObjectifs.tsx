import { formaterMois, formaterMontant, type ObjectifAnnee, type ObjectifsDto, type SuiviObjectif, type TypeObjectif } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, MoreHorizontal, ShieldCheck, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeNature, BadgeRisque } from '../../components/Badges'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, TitreSection } from '../../components/Carte'
import { BlocTotaux } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { Menu } from '../../components/Menu'
import { GraphiqueTrajectoire } from '../../components/graphiques/GraphiqueTrajectoire'
import { Montant } from '../../components/Montant'
import { AnneauProgression } from '../../components/premium/AnneauProgression'
import { TuileIndicateur } from '../../components/premium/TuileIndicateur'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { ListeRecommandations } from '../conseils/Conseils'
import { useConseils } from '../conseils/requetes'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { useObjectifs, useOrdonnerObjectifs, useStatutObjectif } from '../epargne/requetes'
import { phraseObjectif, pointsTrajectoire, SCENARIOS_LIBELLES, texteEstimation, texteRegle, TYPES } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'

/**
 * Objectifs (ux-ui.md (UX) § 5.7 ; lot 26) : une seule vue de l'année pour tous les objectifs.
 * Indicateurs globaux, trajectoire de l'année (réel puis projection), prochaines actions, puis la liste par priorité.
 * Le calendrier mois par mois est dans la page Année ; chaque objectif reste cliquable vers son détail.
 */
export function PageObjectifs() {
  const objectifs = useObjectifs()
  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Objectifs', chemin: '/objectifs' }, { libelle: objectifs.data ? `Année ${objectifs.data.annee.annee}` : 'Tous les objectifs' }]} />
      </motion.div>
      {objectifs.isError ? (
        <Carte espacement="large">
          <div className="rounded-bouton bg-alerte-fond p-5">
            <p className="text-texte font-medium text-alerte">Impossible de charger tes objectifs.</p>
            <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void objectifs.refetch()}>
              Réessayer
            </Bouton>
          </div>
        </Carte>
      ) : objectifs.isPending ? (
        <div className="flex flex-col gap-8" aria-label="Chargement des objectifs">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-carte bg-white shadow-carte" />
            ))}
          </div>
          <div className={GRILLE}>
            <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
            <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
          </div>
        </div>
      ) : (
        <Objectifs donnees={objectifs.data} />
      )}
    </motion.div>
  )
}

function Objectifs({ donnees }: { donnees: ObjectifsDto }) {
  const { epargne, capacite, fondsSecurite, annee } = donnees
  const ordonner = useOrdonnerObjectifs()
  const statut = useStatutObjectif()
  const { ouvrirVersement } = useSaisieRapide()
  const enCours = donnees.objectifs.filter((o) => o.statut === 'actif' || o.statut === 'pause')
  const realises = donnees.objectifs.filter((o) => o.statut === 'realise')
  const abandonnes = donnees.objectifs.filter((o) => o.statut === 'abandonne')
  const aUnFonds = donnees.objectifs.some((o) => o.type === 'securite' && o.statut !== 'abandonne')
  const parId = new Map(annee.objectifs.map((o) => [o.id, o]))
  const aRisque = enCours.filter((o) => annee.aRisque.includes(o.id))
  const pourcentage = Math.round(annee.progression * 100)
  const trajectoire = pointsTrajectoire(annee.points)

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
    <div className="flex flex-col gap-8">
      {enCours.length > 0 && (
        <motion.section variants={elementApparition} aria-label="Indicateurs des objectifs" className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <TuileIndicateur
            libelle="Tu as épargné"
            visuel={
              <AnneauProgression valeur={annee.progression} libelle={`Épargné : ${pourcentage} % de la cible`} taille={52} epaisseur={6}>
                <Target className="h-5 w-5 text-sauge-700" aria-hidden />
              </AnneauProgression>
            }
            icone={null}
            valeur={<Montant valeur={annee.epargne} anime />}
            detail={<>sur <Montant valeur={annee.cible} /> visés · {pourcentage} %</>}
          />
          <TuileIndicateur
            libelle="Dates en danger"
            icone={aRisque.length > 0 ? <AlertTriangle className="h-5 w-5" aria-hidden /> : <ShieldCheck className="h-5 w-5" aria-hidden />}
            ton={aRisque.length > 0 ? 'alerte' : 'positif'}
            nature="projete"
            valeur={aRisque.length === 0 ? 'Aucune' : String(aRisque.length)}
            detail={aRisque.length === 0 ? 'Toutes les dates tiennent' : aRisque.map((o) => o.libelle).join(', ')}
          />
        </motion.section>
      )}

      <div className={GRILLE}>
        <div className="flex min-w-0 flex-col gap-8">
          {enCours.length > 0 && (
            <motion.div variants={elementApparition}>
              <Carte espacement="large" aria-label={`Année ${annee.annee}`}>
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-titre text-encre">Année {annee.annee}</h2>
                    <p className="mt-1 text-texte-sm text-gris">Épargne de tous tes objectifs : réelle jusqu’à aujourd’hui, puis projetée.</p>
                  </div>
                  <span className="flex items-center gap-2 text-texte-sm text-gris">
                    Scénario réaliste <BadgeNature nature="projete" />
                  </span>
                </div>
                <div className="mt-6">
                  <GraphiqueTrajectoire points={trajectoire.points} aujourdhui={trajectoire.aujourdhui} cible={annee.cible} libelle={`Épargne des objectifs en ${annee.annee}`} hauteur={260} />
                </div>
                <dl className="mt-6 grid gap-4 border-t border-filet pt-6 sm:grid-cols-3">
                  <Chiffre libelle="Versé depuis janvier" valeur={<Montant valeur={annee.verseCetteAnnee} />} detail="Réel, hors achats" />
                  <Chiffre
                    libelle={`Fin ${annee.annee} prévue`}
                    valeur={<Montant valeur={annee.finAnnee.realiste} />}
                    detail={
                      annee.finAnnee.prudent === annee.finAnnee.ambitieux ? (
                        'Même montant dans les trois scénarios'
                      ) : (
                        <>
                          De <Montant valeur={annee.finAnnee.prudent} /> à <Montant valeur={annee.finAnnee.ambitieux} />
                        </>
                      )
                    }
                    nature="projete"
                  />
                  <Chiffre libelle="Capacité ce mois-ci" valeur={<Montant valeur={capacite.realiste} />} detail="Ce qui peut aller aux objectifs" nature="projete" />
                </dl>
              </Carte>
            </motion.div>
          )}

          <motion.div variants={elementApparition}>
            <Carte espacement="large">
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
                      annee={annee.annee}
                      suiviAnnee={parId.get(o.id)}
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

              <details className="group mt-8 rounded-bouton bg-interne p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-texte font-semibold text-encre">
                  Sur quoi reposent les projections ?
                  <ChevronDown className="h-4 w-4 text-gris transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="mt-4 flex flex-col gap-2 text-texte-sm text-gris">
                  {(['prudent', 'realiste', 'ambitieux'] as const).map((s) => (
                    <li key={s}>
                      <span className="font-semibold text-encre">{SCENARIOS_LIBELLES[s]}</span> : {texteRegle(donnees.regles[s])} Moins les charges prévues.
                    </li>
                  ))}
                  <li>Chaque mois, le versement choisi passe d’abord, puis le reste va à la priorité 1, puis 2…</li>
                </ul>
              </details>
            </Carte>
          </motion.div>
        </div>

        <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
          <ProchainesActions />
          <Carte titre="Épargne">
            <BlocTotaux
              lignes={[
                { libelle: 'Solde', valeur: epargne.declare ? <Montant valeur={epargne.solde} /> : 'Non déclaré', fort: true },
                { libelle: 'Réservé aux objectifs', valeur: <Montant valeur={epargne.reserve} /> },
              ]}
              total={{ libelle: 'Disponible', valeur: <Montant valeur={epargne.disponible} /> }}
            />
            <Link to="/plan?onglet=epargne" className={styleBouton({ variante: 'blanc', className: 'mt-5 w-full' })}>
              Voir mon épargne
            </Link>
          </Carte>
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
        </motion.div>
      </div>
    </div>
  )
}

/** Un chiffre de la carte de l'année : libellé, valeur, précision. */
function Chiffre({ libelle, valeur, detail, nature = 'reel' }: { libelle: string; valeur: ReactNode; detail: ReactNode; nature?: 'reel' | 'projete' }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-texte-sm text-gris">
        {libelle}
        <BadgeNature nature={nature} />
      </dt>
      <dd className="mt-1 text-titre text-encre">{valeur}</dd>
      <dd className="mt-0.5 text-mention text-gris">{detail}</dd>
    </div>
  )
}

const ALERTES_OBJECTIFS = new Set(['versementPrevu', 'epargneNonDeclaree', 'reserveDepasse'])
const LEVIERS = new Set(['effort', 'reduction', 'prime', 'disponible'])

/**
 * Prochaines actions (lot 26) : versements du mois à noter, épargne à déclarer ou réajuster, puis les leviers chiffrés
 * (effort, réduction, prime, épargne disponible). Tout vient des alertes et recommandations du moteur.
 */
function ProchainesActions() {
  const conseils = useConseils()
  const { ouvrirVersement } = useSaisieRapide()
  if (!conseils.data) return null
  const alertes = conseils.data.alertes.filter((a) => ALERTES_OBJECTIFS.has(a.type))
  const leviers = conseils.data.recommandations.filter((r) => LEVIERS.has(r.type))
  return (
    <Carte titre="Prochaines actions">
      {alertes.length === 0 && leviers.length === 0 ? (
        <p className="flex items-center gap-2 text-texte-sm text-gris">
          <CheckCircle2 className="h-4 w-4 text-positif" aria-hidden />
          Rien à faire : tes versements du mois sont notés.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {alertes.length > 0 && (
            <ul className="flex flex-col gap-3" aria-label="À faire pour tes objectifs">
              {alertes.map((a) => (
                <li key={a.cle} className="flex gap-3 rounded-bouton bg-interne p-4 shadow-bouton">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-texte font-semibold text-encre">{a.titre}</p>
                    <p className="mt-1 text-texte-sm text-gris">{a.message}</p>
                    {a.type === 'versementPrevu' ? (
                      <Bouton variante="puce" taille="sm" className="mt-3 h-8 px-3" onClick={() => ouvrirVersement({ objectifId: a.objectifId, montant: a.reste })}>
                        {a.action.libelle}
                      </Bouton>
                    ) : (
                      <Link to={a.action.chemin} className={styleBouton({ variante: 'puce', taille: 'sm', className: 'mt-3 h-8 px-3' })}>
                        {a.action.libelle}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {leviers.length > 0 && <ListeRecommandations recommandations={leviers} />}
        </div>
      )}
    </Carte>
  )
}

function CarteObjectif({
  objectif: o,
  annee,
  suiviAnnee,
  premier,
  dernier,
  onMonter,
  onDescendre,
  actions,
}: {
  objectif: SuiviObjectif
  annee: number
  /** Ce que l'objectif devient d'ici la fin de l'année (projection réaliste). */
  suiviAnnee?: ObjectifAnnee
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
      {suiviAnnee && o.statut === 'actif' && !o.atteint && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-texte-sm text-gris">
          Fin {annee} : <Montant valeur={suiviAnnee.finAnnee} className="font-medium text-encre-2" />
          {suiviAnnee.finAnnee > suiviAnnee.epargne && (
            <span>
              (+<Montant valeur={suiviAnnee.finAnnee - suiviAnnee.epargne} />)
            </span>
          )}
          {suiviAnnee.atteintCetteAnnee && <span className="rounded-pilule bg-positif-fond px-2 py-0.5 text-mention text-positif">Atteint en {formaterMois(suiviAnnee.atteintCetteAnnee, { annee: false })}</span>}
        </p>
      )}
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
