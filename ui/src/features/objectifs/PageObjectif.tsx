import { formaterDate, formaterMois, formaterMontant, type MoisSimulation, type ObjectifDetailDto, type SimulationObjectif, type SuiviObjectif } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { AlertCircle, Check, CheckCircle2, Info } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeNature } from '../../components/Badges'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Champ } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { Identite } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { GraphiqueTrajectoire } from '../../components/graphiques/GraphiqueTrajectoire'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { Selection } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { dateDuJour } from '../../lib/dates'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { LIBELLES_MOUVEMENT } from '../epargne/saisie'
import { useObjectif, useRealiserObjectif, useStatutObjectif, useSupprimerObjectif } from '../epargne/requetes'
import { moisAbrege, pointsSimulation, texteEcart, TYPES, verdictObjectif } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'
const TONS_VERDICT = {
  positif: { boite: 'bg-positif-fond ring-positif/15', texte: 'text-positif', Icone: CheckCircle2 },
  alerte: { boite: 'bg-alerte-fond ring-alerte/15', texte: 'text-alerte', Icone: AlertCircle },
  neutre: { boite: 'bg-teinte ring-filet', texte: 'text-encre', Icone: Info },
} as const

/** Objectif (UX.md § 5.8) : est-il atteint au mois souhaité, combien reste-t-il, et la simulation avec le cumul. */
export function PageObjectif() {
  const { id } = useParams()
  const detail = useObjectif(id)
  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Objectifs', chemin: '/objectifs' }, { libelle: detail.data?.objectif.libelle ?? 'Objectif' }]} />
      </motion.div>
      {detail.isError ? (
        <Carte espacement="large">
          <div className="rounded-bouton bg-alerte-fond p-5">
            <p className="text-texte font-medium text-alerte">{detail.error instanceof ErreurApi && detail.error.statut === 404 ? 'Cet objectif n’existe pas.' : 'Impossible de charger cet objectif.'}</p>
            <Link to="/objectifs" className={styleBouton({ variante: 'contour', taille: 'sm', className: 'mt-4' })}>
              Retour aux objectifs
            </Link>
          </div>
        </Carte>
      ) : detail.isPending ? (
        <div className={GRILLE} aria-label="Chargement de l’objectif">
          <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
          <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
        </div>
      ) : (
        <Detail detail={detail.data} />
      )}
    </motion.div>
  )
}

function Detail({ detail }: { detail: ObjectifDetailDto }) {
  const { objectif: o, simulation, aujourdhui } = detail
  const navigate = useNavigate()
  const { ouvrirVersement } = useSaisieRapide()
  const statut = useStatutObjectif()
  const supprimer = useSupprimerObjectif()
  const [demande, setDemande] = useState<'realiser' | 'abandonner' | 'supprimer' | null>(null)
  const actif = o.statut === 'actif'
  const ouvert = o.statut === 'actif' || o.statut === 'pause'
  const pourcent = Math.round(o.progression * 100)

  const changer = (nouveau: 'actif' | 'pause' | 'abandonne', message: string) =>
    statut.mutate(
      { id: o.id, statut: nouveau },
      {
        onSuccess: () => {
          toast(message)
          setDemande(null)
        },
        onError: (e) => toast(e instanceof ErreurApi ? e.message : 'Le changement n’a pas abouti.'),
      },
    )

  return (
    <div className={GRILLE}>
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <Identite initiale={o.libelle.charAt(0).toUpperCase()} nom={o.libelle} detail={`${TYPES[o.type].libelle} · priorité ${o.priorite}`} />
            <EtatObjectif o={o} />
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Épargné',
              lignes: [
                { valeur: <Montant valeur={o.epargne} className="text-[28px] font-bold leading-9 tracking-tight" /> },
                { libelle: 'Cible', valeur: <Montant valeur={o.montantCible} /> },
                { libelle: 'Progression', valeur: `${pourcent} %` },
              ],
            }}
            droite={{
              titre: 'Mois souhaité',
              lignes: [
                { valeur: <span className="text-[28px] font-bold leading-9 tracking-tight">{o.dateCible ? formaterMois(o.dateCible, { majuscule: true }) : 'Aucun'}</span> },
                ...(simulation
                  ? [
                      { libelle: 'Atteint', valeur: o.atteint ? 'déjà' : simulation.dateAtteinte ? formaterMois(simulation.dateAtteinte) : 'au-delà de 10 ans' },
                      ...(o.dateCible ? [{ libelle: 'Écart', valeur: texteEcart(o.atteint ? 0 : simulation.ecart).texte }] : []),
                    ]
                  : [{ libelle: 'Statut', valeur: o.statut === 'pause' ? 'en pause' : o.statut === 'realise' ? 'réalisé' : 'abandonné' }]),
              ],
            }}
          />

          <BarreProgression className="mt-6" valeur={o.progression} libelle={`${pourcent} % de la cible épargnés`} />

          {simulation && <Verdict o={o} simulation={simulation} />}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Tuile libelle="Reste à épargner" valeur={<Montant valeur={o.restant} />} detail={o.atteint ? 'Cible couverte' : `sur ${formaterMontant(o.montantCible)}`} />
            <Tuile
              libelle="Effort mensuel"
              valeur={o.effortMensuel !== null ? <Montant valeur={o.effortMensuel} /> : '—'}
              detail={o.effortMensuel !== null ? `pendant ${o.moisRestants} mois, jusqu’à ${formaterMois(o.dateCible!)}` : o.atteint ? 'Rien à mettre de côté' : 'Sans mois souhaité'}
              fort
            />
            <Tuile libelle="Versement choisi" valeur={o.versementMensuel ? <Montant valeur={o.versementMensuel} /> : 'Aucun'} detail="par mois, dans ton plan" />
          </div>

          {simulation && (
            <>
              <Separateur className="my-8" />
              <Simulation detail={detail} simulation={simulation} />
            </>
          )}
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <Carte titre="Actions">
          <div className="flex flex-col gap-3">
            {ouvert && (
              <Bouton className="w-full" onClick={() => ouvrirVersement({ objectifId: o.id })}>
                Verser
              </Bouton>
            )}
            {ouvert && (
              <Bouton variante="blanc" className="w-full" onClick={() => setDemande('realiser')}>
                Marquer comme réalisé
              </Bouton>
            )}
            {o.statut !== 'realise' && (
              <Link to={`/objectifs/${o.id}/modifier`} className={styleBouton({ variante: 'blanc', className: 'w-full' })}>
                Modifier
              </Link>
            )}
            {actif && (
              <Bouton variante="blanc" className="w-full" onClick={() => changer('pause', `« ${o.libelle} » mis en pause.`)}>
                Mettre en pause
              </Bouton>
            )}
            {(o.statut === 'pause' || o.statut === 'abandonne') && (
              <Bouton variante="blanc" className="w-full" onClick={() => changer('actif', `« ${o.libelle} » repris.`)}>
                Reprendre
              </Bouton>
            )}
            {o.statut === 'realise' && (
              <Bouton variante="blanc" className="w-full" onClick={() => changer('actif', `Achat annulé : « ${o.libelle} » est repris avec son épargne.`)}>
                Annuler l’achat
              </Bouton>
            )}
            {ouvert && (
              <Bouton variante="contour" className="w-full" onClick={() => setDemande('abandonner')}>
                Abandonner
              </Bouton>
            )}
            <button type="button" onClick={() => setDemande('supprimer')} className="mt-1 text-texte-sm font-medium text-alerte hover:underline">
              Supprimer l’objectif
            </button>
          </div>
        </Carte>

        <Carte titre="Versements">
          {detail.versements.length === 0 ? (
            <p className="text-texte-sm text-gris">Aucun versement.{o.montantInitial > 0 && ` Épargne de départ : ${formaterMontant(o.montantInitial)}.`}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-filet" aria-label="Versements">
              {detail.versements.map((v) => (
                <li key={v.id} className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block truncate text-texte font-medium text-encre">{LIBELLES_MOUVEMENT[v.type]}</span>
                    <span className="block text-texte-sm text-gris">
                      {formaterDate(v.date)} · {v.compte}
                    </span>
                  </span>
                  <span className={cn('shrink-0 font-semibold tabular-nums', v.montant > 0 ? 'text-positif' : 'text-encre')}>
                    {v.montant > 0 ? '+' : ''}
                    <Montant valeur={v.montant} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </motion.div>

      <PanneauRealisation detail={detail} ouvert={demande === 'realiser'} onFermer={() => setDemande(null)} aujourdhui={aujourdhui} />
      <Confirmation
        ouvert={demande === 'abandonner'}
        onFermer={() => setDemande(null)}
        titre={`Abandonner « ${o.libelle} » ?`}
        description={`Ses ${formaterMontant(o.epargne)} ne seront plus réservés : ils redeviennent disponibles dans ton épargne. Tu pourras le reprendre.`}
        libelleConfirmer="Abandonner"
        ton="principal"
        chargement={statut.isPending}
        onConfirmer={() => changer('abandonne', `« ${o.libelle} » abandonné.`)}
      />
      <Confirmation
        ouvert={demande === 'supprimer'}
        onFermer={() => setDemande(null)}
        titre={`Supprimer « ${o.libelle} » ?`}
        description="L’objectif disparaît. Ses versements restent dans ton épargne, en épargne libre."
        libelleConfirmer="Supprimer"
        chargement={supprimer.isPending}
        onConfirmer={() =>
          supprimer.mutate(o.id, {
            onSuccess: () => {
              toast(`« ${o.libelle} » supprimé.`)
              navigate('/objectifs')
            },
            onError: (e) => toast(e instanceof ErreurApi ? e.message : 'La suppression n’a pas abouti.'),
          })
        }
      />
    </div>
  )
}

function EtatObjectif({ o }: { o: SuiviObjectif }) {
  const pastille = (texte: string, positif = false) => <span className={cn('self-start rounded-pilule px-3 py-1 text-mention font-medium sm:self-auto', positif ? 'bg-positif-fond text-positif' : 'bg-teinte text-gris')}>{texte}</span>
  if (o.statut === 'realise') return pastille(`Réalisé le ${formaterDate(o.realiseLe!)}`, true)
  if (o.statut === 'abandonne') return pastille('Abandonné')
  if (o.statut === 'pause') return pastille('En pause')
  if (o.atteint) return pastille('Cible atteinte', true)
  return pastille('En cours')
}

/** La réponse en une phrase, et les options si le mois souhaité n'est pas tenu. */
function Verdict({ o, simulation }: { o: SuiviObjectif; simulation: SimulationObjectif }) {
  const v = verdictObjectif(o, simulation)
  const { boite, texte, Icone } = TONS_VERDICT[v.ton]
  const options = !o.atteint && simulation.moisSouhaite && !simulation.moisSouhaite.atteint
  return (
    <div role="status" aria-label="Verdict" className={cn('mt-6 rounded-bouton p-5 ring-1', boite)}>
      <div className="flex items-start gap-3">
        <Icone className={cn('mt-0.5 h-5 w-5 shrink-0', texte)} aria-hidden />
        <div className="min-w-0">
          <p className={cn('text-titre-carte font-semibold', texte)}>{v.titre}</p>
          <p className="mt-1 text-texte-sm text-encre-2">{v.detail}</p>
        </div>
      </div>
      {options && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Options">
          {simulation.ajoutParMois !== null && (
            <li className="rounded-champ bg-white/80 px-4 py-3 text-texte-sm text-encre-2 shadow-bouton">
              <span className="block text-mention text-gris">Pour tenir {formaterMois(o.dateCible!)}</span>
              Dégager <Montant valeur={simulation.ajoutParMois} className="font-semibold text-encre" /> de plus par mois
            </li>
          )}
          {simulation.dateAtteinte && (
            <li className="rounded-champ bg-white/80 px-4 py-3 text-texte-sm text-encre-2 shadow-bouton">
              <span className="block text-mention text-gris">Ou garder ton rythme</span>
              Viser <span className="font-semibold text-encre">{formaterMois(simulation.dateAtteinte)}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function Tuile({ libelle, valeur, detail, fort = false }: { libelle: string; valeur: ReactNode; detail: string; fort?: boolean }) {
  return (
    <div className={cn('rounded-bouton p-4 shadow-bouton', fort ? 'bg-sauge-50 ring-1 ring-sauge-200' : 'bg-interne')}>
      <span className="block text-mention text-gris">{libelle}</span>
      <span className="mt-1 block text-titre font-semibold tabular-nums text-encre">{valeur}</span>
      <span className="mt-0.5 block text-mention text-gris">{detail}</span>
    </div>
  )
}

/** Simulation : on choisit un mois, son cumul de fin de mois (calculé par MySalary) rejoint l'objectif. */
function Simulation({ detail, simulation }: { detail: ObjectifDetailDto; simulation: SimulationObjectif }) {
  const o = detail.objectif
  const parDefaut = simulation.moisSouhaite?.cle ?? (simulation.mois.some((m) => m.cle === simulation.dateAtteinte) ? simulation.dateAtteinte! : simulation.mois[0]!.cle)
  const [choisi, setChoisi] = useState(parDefaut)
  const m = simulation.mois.find((x) => x.cle === choisi) ?? simulation.mois[0]!
  const trajectoire = pointsSimulation(detail.trajectoire, simulation.mois)
  const bande = useRef<HTMLDivElement>(null)
  // Le mois choisi d'office (souvent loin) est amené au centre de la bande, sans faire défiler la page.
  useEffect(() => {
    const conteneur = bande.current
    const puce = conteneur?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (conteneur && puce) conteneur.scrollLeft = puce.offsetLeft - conteneur.clientWidth / 2 + puce.clientWidth / 2
  }, [])

  return (
    <section aria-label="Simulation avec le cumul">
      <TitreSection titre="Simuler avec ton cumul" sousTitre="Choisis un mois : son cumul de fin de mois rejoint l’objectif." action={<BadgeNature nature="projete" />} />

      <div ref={bande} role="radiogroup" aria-label="Mois du cumul" className="relative -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-3 pt-1">
        {simulation.mois.map((x) => {
          const actif = x.cle === m.cle
          const souhaite = x.cle === o.dateCible
          return (
            <button
              key={x.cle}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={`${formaterMois(x.cle)}${souhaite ? ', mois souhaité' : ''}${x.atteint ? ', cible atteinte' : ''}`}
              onClick={() => setChoisi(x.cle)}
              className={cn(
                'flex min-w-[64px] shrink-0 flex-col items-center rounded-bouton px-3 py-2 text-center shadow-bouton transition-all duration-200',
                actif ? 'bg-lien text-white shadow-carte' : 'bg-white text-encre hover:-translate-y-0.5 hover:shadow-carte',
                souhaite && !actif && 'ring-1 ring-primaire',
              )}
            >
              <span className="text-texte-sm font-semibold">{moisAbrege(x.cle)}</span>
              <span className={cn('inline-flex items-center gap-0.5 text-mention', actif ? 'text-white/75' : x.atteint ? 'text-positif' : 'text-gris')}>
                {x.atteint && <Check className="h-3 w-3" aria-hidden />}
                {x.cle.slice(0, 4)}
              </span>
            </button>
          )
        })}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-mention text-gris">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] ring-1 ring-primaire" aria-hidden /> Mois souhaité
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-positif" aria-hidden /> Cible atteinte
        </span>
      </p>

      <ResultatMois m={m} o={o} />

      <div className="mt-7">
        <GraphiqueTrajectoire points={trajectoire.points} cible={o.montantCible} aujourdhui={trajectoire.aujourdhui} libelle={`Épargne de ${o.libelle} : réelle, puis simulée avec le cumul`} />
        <p className="mt-2 text-mention text-gris">
          Réel en plein, simulé hachuré. Cumul de fin de mois = revenus − charges − épargne prévue, mois après mois (scénario réaliste). Il suppose que tout ce cumul va à cet objectif.
        </p>
      </div>
    </section>
  )
}

function ResultatMois({ m, o }: { m: MoisSimulation; o: SuiviObjectif }) {
  const ajout = m.epargne - o.epargne
  const ligne = (libelle: ReactNode, valeur: ReactNode, signe = '') => (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-gris">{libelle}</dt>
      <dd className="font-medium tabular-nums text-encre">
        {signe}
        {valeur}
      </dd>
    </div>
  )
  return (
    <div className="mt-5 grid gap-5 rounded-bouton bg-interne p-5 shadow-bouton md:grid-cols-2 md:gap-8 md:p-6" aria-live="polite" aria-label={`Résultat pour ${formaterMois(m.cle)}`}>
      <div className="min-w-0">
        <span className="block text-mention text-gris">Épargne simulée fin {formaterMois(m.cle)}</span>
        <Montant valeur={m.epargne} className="mt-1 block text-[30px] font-bold leading-9 tracking-tight text-encre" />
        <BarreProgression
          className="mt-4"
          valeur={o.montantCible > 0 ? o.epargne / o.montantCible : 1}
          projection={o.montantCible > 0 ? ajout / o.montantCible : 0}
          libelle={`${Math.min(100, Math.round((m.epargne / Math.max(1, o.montantCible)) * 100))} % de la cible`}
        />
        <p className={cn('mt-3 inline-flex items-center gap-1.5 rounded-pilule px-3 py-1 text-texte-sm font-semibold', m.atteint ? 'bg-positif-fond text-positif' : 'bg-alerte-fond text-alerte')}>
          {m.atteint ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <AlertCircle className="h-4 w-4" aria-hidden />}
          {m.atteint ? 'Cible atteinte' : <>Il manque <Montant valeur={m.manque} /></>}
        </p>
      </div>
      <dl className="flex flex-col gap-2.5 text-texte-sm md:border-l md:border-filet md:pl-8">
        {ligne('Épargne actuelle', <Montant valeur={o.epargne} />)}
        {m.versements > 0 && ligne('Versements prévus', <Montant valeur={m.versements} />, '+ ')}
        {ligne(
          <>
            Cumul fin {moisAbrege(m.cle)} <span className="text-mention">({m.nature === 'enCours' ? 'estimation' : 'prévu'})</span>
          </>,
          m.cumul < 0 ? '0 DH' : <Montant valeur={m.cumul} />,
          '+ ',
        )}
        {m.cumul < 0 && <p className="text-mention text-alerte">Cumul négatif ({formaterMontant(m.cumul)}) : rien à ajouter.</p>}
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-filet pt-3">
          <dt className="font-semibold text-encre">Épargne simulée</dt>
          <dd className="font-semibold tabular-nums text-encre">
            <Montant valeur={m.epargne} />
          </dd>
        </div>
        {ligne('Cible', <Montant valeur={o.montantCible} />)}
      </dl>
    </div>
  )
}

/** Achat réalisé (R19) : l'épargné sort du compte choisi à la date de l'achat, sans dépense. */
function PanneauRealisation({ detail, ouvert, onFermer, aujourdhui }: { detail: ObjectifDetailDto; ouvert: boolean; onFermer: () => void; aujourdhui: string }) {
  const realiser = useRealiserObjectif()
  const { objectif: o, comptes } = detail
  const [date, setDate] = useState(dateDuJour())
  const [compteId, setCompteId] = useState(comptes[0]?.id ?? '')
  const [erreur, setErreur] = useState<string | null>(null)

  function soumettre(e: FormEvent) {
    e.preventDefault()
    if (date > aujourdhui) return setErreur('Un achat réalisé ne peut pas être dans le futur.')
    realiser.mutate(
      { id: o.id, date, compteId },
      {
        onSuccess: () => {
          toast(`« ${o.libelle} » réalisé. ${formaterMontant(o.epargne)} ont servi à l’achat.`)
          onFermer()
        },
        onError: (e) => setErreur(e instanceof ErreurApi ? e.message : 'Erreur inattendue. Réessaie.'),
      },
    )
  }

  return (
    <Panneau ouvert={ouvert} onFermer={onFermer} titre={`Réaliser « ${o.libelle} »`} description="L’épargne de l’objectif sert à l’achat. Ce n’est pas une dépense : elle n’est comptée qu’une fois.">
      {comptes.length === 0 ? (
        <div className="rounded-bouton bg-interne p-5">
          <p className="text-texte font-medium text-encre">Aucun compte d’épargne.</p>
          <p className="mt-2 text-texte-sm text-gris">L’argent de l’achat sort d’un compte : déclare d’abord ton épargne.</p>
          <Link to="/plan?onglet=epargne" className={styleBouton({ taille: 'sm', className: 'mt-4' })}>
            Ajouter un compte
          </Link>
        </div>
      ) : (
        <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
          <p className="rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2">
            <Montant valeur={o.epargne} className="font-semibold" /> sortent de ton épargne{o.atteint ? '.' : ` (la cible de ${formaterMontant(o.montantCible)} n’était pas atteinte).`}
          </p>
          <Champ libelle="Date de l’achat" type="date" max={aujourdhui} value={date} onChange={(e) => setDate(e.target.value)} />
          {comptes.length > 1 && (
            <Selection libelle="Compte" value={compteId} onChange={(e) => setCompteId(e.target.value)}>
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </Selection>
          )}
          {erreur && (
            <p role="alert" className="text-texte-sm font-medium text-alerte">
              {erreur}
            </p>
          )}
          <Bouton type="submit" taille="lg" className="w-full" chargement={realiser.isPending}>
            Marquer comme réalisé
          </Bouton>
        </form>
      )}
    </Panneau>
  )
}
