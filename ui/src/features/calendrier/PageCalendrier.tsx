import { deMois, formaterDate, formaterMois, formaterMontant, type CalendrierMoisDto, type SaisiePonctuel } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { AlertCircle, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { FilAriane } from '../../components/FilAriane'
import { Fenetre } from '../../components/Fenetre'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { jalonsDuMois, joursEntete } from '../annee/saisie'
import { useEnregistrerPonctuel } from '../charges/requetes'
import { FormulairePonctuel } from '../charges/FormulaireCharge'
import { useEnregistrerDepense, useSupprimerDepense } from '../depenses/requetes'
import { useObjectifs } from '../epargne/requetes'
import { EnteteMois } from '../mois/EnteteMois'
import { confirmation } from '../mois/saisie'
import type { Ton } from '../salaire/saisie'
import { useMoisCourant } from '../salaire/requetes'
import { useCalendrierMois } from './requetes'
import {
  compterParType,
  evenementsVue,
  filtrer,
  jourLong,
  libelleType,
  lienModifier,
  MAX_PAR_CASE,
  montantSigne,
  parJour,
  phraseSolde,
  reste,
  semainesGrille,
  statutVue,
  titreJour,
  TYPES,
  type EvenementVue,
  type TypeVue,
} from './saisie'

const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }

/** Couleur d'une pastille d'événement : le sens de l'argent, jamais la seule indication (le texte dit le statut). */
function styleEvenement(e: EvenementVue): string {
  if (e.type === 'objectif') return 'bg-info-fond text-info'
  if (e.statut === 'enRetard') return 'bg-alerte-fond text-alerte'
  return e.sens === 'entree' ? 'bg-positif-fond text-positif' : 'bg-teinte text-encre-2'
}

/** Calendrier (UX.md § 5.10) : quand l'argent entre et sort. Le mois, la vue et les filtres sont gardés dans l'adresse. */
export function PageCalendrier() {
  const [parametres, setParametres] = useSearchParams()
  const courant = useMoisCourant()
  const cle = parametres.get('mois') ?? courant.data?.cle ?? null
  const vue = parametres.get('vue') === 'liste' ? 'liste' : 'grille'
  const calendrier = useCalendrierMois(cle)
  const objectifs = useObjectifs()
  const [masques, setMasques] = useState<ReadonlySet<TypeVue>>(new Set())
  const [jourOuvert, setJourOuvert] = useState<string | null>(null)
  const [ajout, setAjout] = useState<string | null>(null)

  const donnees = calendrier.data?.mois.cle === cle ? calendrier.data : null
  const tous = useMemo(
    () => (donnees ? evenementsVue(donnees, jalonsDuMois(objectifs.data?.objectifs ?? [], donnees.mois.cle)) : []),
    [donnees, objectifs.data],
  )
  const visibles = useMemo(() => filtrer(tous, masques), [tous, masques])

  const changer = (valeurs: { mois?: string; vue?: 'grille' | 'liste' }) => {
    const suite = { mois: valeurs.mois ?? cle ?? undefined, vue: valeurs.vue ?? vue }
    setParametres(Object.fromEntries(Object.entries({ mois: suite.mois, vue: suite.vue === 'liste' ? 'liste' : undefined }).filter(([, v]) => v)) as Record<string, string>, {
      replace: valeurs.vue !== undefined,
    })
    setJourOuvert(null)
  }
  const basculer = (type: TypeVue) => setMasques((m) => (m.has(type) ? new Set([...m].filter((t) => t !== type)) : new Set([...m, type])))

  if (courant.isError || calendrier.isError) {
    return (
      <>
        <FilAriane etapes={[{ libelle: 'Calendrier' }]} />
        <Carte espacement="large">
          <div className="rounded-bouton bg-alerte-fond p-5">
            <p className="text-texte font-medium text-alerte">Impossible de charger le calendrier.</p>
            <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => [courant, calendrier].forEach((q) => void q.refetch())}>
              Réessayer
            </Bouton>
          </div>
        </Carte>
      </>
    )
  }
  if (!donnees) {
    return (
      <>
        <FilAriane etapes={[{ libelle: 'Calendrier' }]} />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12" aria-label="Chargement du calendrier">
          <div className="h-[34rem] animate-pulse rounded-carte bg-white shadow-carte" />
          <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
        </div>
      </>
    )
  }

  const { mois, aujourdhui } = donnees
  const fin = donnees.jours.at(-1)!
  const jourChoisi = jourOuvert ? donnees.jours.find((j) => j.date === jourOuvert) : undefined
  const groupes = parJour(visibles)

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Calendrier', chemin: '/calendrier' }, { libelle: vue === 'liste' ? 'Liste' : 'Grille' }]} />
      </motion.div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
        <motion.div variants={elementApparition} className="min-w-0">
          <Carte espacement="large">
            <EnteteMois titre={`Calendrier ${deMois(mois.cle, { annee: false })}`} mois={mois} aujourdhui={aujourdhui} cloture={false} changerMois={(m) => changer({ mois: m })} />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div role="radiogroup" aria-label="Vue" className="flex gap-1 rounded-pilule bg-teinte p-1">
                {(['grille', 'liste'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={vue === v}
                    onClick={() => changer({ vue: v })}
                    className={cn('h-8 rounded-pilule px-4 text-texte-sm font-medium transition-colors', vue === v ? 'bg-white text-encre shadow-bouton' : 'text-gris hover:text-encre')}
                  >
                    {v === 'grille' ? 'Grille' : 'Liste'}
                  </button>
                ))}
              </div>
              <FiltresTypes compte={compterParType(tous)} masques={masques} basculer={basculer} />
            </div>

            <div className="mt-6">
              {tous.length === 0 ? (
                <div className="rounded-bouton bg-interne p-6 text-center shadow-bouton">
                  <p className="text-texte font-medium text-encre">Aucun événement prévu sur ce mois.</p>
                  <p className="mt-1 text-texte-sm text-gris">Ajoute un salaire, des charges ou un ponctuel daté : ils apparaissent ici.</p>
                  <Link to="/plan" className={styleBouton({ taille: 'sm', className: 'mt-4' })}>
                    Ouvrir Mon plan
                  </Link>
                </div>
              ) : vue === 'grille' ? (
                <GrilleMois calendrier={donnees} groupes={groupes} onOuvrir={setJourOuvert} />
              ) : (
                <ListeEvenements evenements={visibles} calendrier={donnees} onOuvrir={setJourOuvert} />
              )}
              {tous.length > 0 && visibles.length === 0 && <p className="mt-4 text-center text-texte-sm text-gris">Aucun événement pour ces filtres.</p>}
            </div>
          </Carte>
        </motion.div>

        <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
          <CarteBandeau
            gauche={{
              titre: fin.projete ? 'Solde projeté en fin de mois' : 'Solde en fin de mois',
              lignes: [
                { valeur: <Montant valeur={fin.solde} anime /> },
                { libelle: fin.projete ? 'Projeté' : 'Réel', valeur: formaterDate(fin.date, 'court') },
              ],
            }}
            droite={{
              titre: 'Ce mois',
              lignes: [
                { libelle: 'Événements', valeur: String(tous.length) },
                { libelle: 'Passés, pas confirmés', valeur: String(tous.filter((e) => e.passeNonConfirme).length) },
              ],
            }}
          />
          <Carte espacement="large">
            <h3 className="text-titre text-encre">Lire le calendrier</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-texte-sm text-gris">
              <li>
                <span className="font-semibold text-encre">Solde du jour</span> : revenus reçus moins sorties réelles depuis le début du mois ; après aujourd’hui, il ajoute les revenus et charges encore datés (projeté). Survole un jour pour le lire.
              </li>
              <li>
                <span className="font-semibold text-encre">Pastille « +2 »</span> : d’autres événements ce jour-là ; ouvre le jour pour tous les voir.
              </li>
              <li className="flex items-start gap-1.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-alerte" aria-hidden />
                <span>Événement passé pas encore confirmé.</span>
              </li>
              <li>Les enveloppes n’ont pas de date : elles n’entrent pas dans le solde avant d’être dépensées.</li>
            </ul>
            <Separateur className="my-5" />
            <Bouton className="w-full" onClick={() => setAjout(jourOuvert ?? aujourdhui)}>
              <Plus className="h-5 w-5" aria-hidden /> Ajouter un ponctuel
            </Bouton>
          </Carte>
        </motion.div>
      </div>

      <FenetreJour
        date={jourOuvert}
        jour={jourChoisi}
        evenements={jourOuvert ? tous.filter((e) => e.date === jourOuvert) : []}
        aujourdhui={aujourdhui}
        onFermer={() => setJourOuvert(null)}
        onAjouter={(date) => setAjout(date)}
      />
      <AjoutPonctuel date={ajout} aujourdhui={aujourdhui} onFermer={() => setAjout(null)} />
    </motion.div>
  )
}

function FiltresTypes({ compte, masques, basculer }: { compte: Record<TypeVue, number>; masques: ReadonlySet<TypeVue>; basculer: (t: TypeVue) => void }) {
  return (
    <div role="group" aria-label="Filtrer par type" className="flex flex-wrap gap-2">
      {TYPES.filter((t) => compte[t.type] > 0).map((t) => {
        const actif = !masques.has(t.type)
        return (
          <button
            key={t.type}
            type="button"
            aria-pressed={actif}
            onClick={() => basculer(t.type)}
            className={cn(
              'h-8 rounded-pilule px-3 text-texte-sm font-medium shadow-bouton transition-colors',
              actif ? 'bg-lien text-white' : 'bg-white text-gris line-through decoration-gris-icone hover:bg-teinte',
            )}
          >
            {t.pluriel} <span className="tabular-nums opacity-80">{compte[t.type]}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Grille du mois budgétaire : une case par jour, ses deux premiers événements, « +N » au-delà. */
function GrilleMois({ calendrier, groupes, onOuvrir }: { calendrier: CalendrierMoisDto; groupes: Map<string, EvenementVue[]>; onOuvrir: (date: string) => void }) {
  const jours = new Map<string, CalendrierMoisDto['jours'][number]>(calendrier.jours.map((j) => [j.date, j]))
  const semaines = semainesGrille(calendrier)
  return (
    <div role="group" aria-label={`Jours de ${formaterMois(calendrier.mois.cle)}`}>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-mention text-gris sm:gap-2" aria-hidden>
        {joursEntete(calendrier.debutSemaine).map((j, i) => (
          <span key={i}>{j}</span>
        ))}
      </div>
      <div className="flex flex-col gap-1 sm:gap-2">
        {semaines.map((semaine, i) => (
          <div key={i} className="grid grid-cols-7 gap-1 sm:gap-2">
            {semaine.map((date, k) => {
              if (!date) return <span key={k} aria-hidden />
              const evenements = groupes.get(date) ?? []
              const jour = jours.get(date)
              const aujourdhui = date === calendrier.aujourdhui
              const autreMois = date.slice(0, 7) !== calendrier.mois.cle
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onOuvrir(date)}
                  aria-label={titreJour(date, jour, evenements.length)}
                  className={cn(
                    'group relative flex min-h-[56px] flex-col items-stretch gap-1 rounded-champ border bg-white p-1.5 text-left transition-colors hover:border-filet-fort hover:bg-interne focus-visible:outline-none focus-visible:shadow-focus sm:min-h-[96px] sm:p-2',
                    aujourdhui ? 'border-primaire ring-1 ring-primaire' : 'border-filet',
                  )}
                >
                  <span className={cn('text-mention tabular-nums', autreMois ? 'text-gris-icone' : 'text-encre-2', aujourdhui && 'font-bold text-lien')}>
                    {Number(date.slice(8))}
                  </span>
                  <span className="hidden flex-col gap-1 sm:flex" aria-hidden>
                    {evenements.slice(0, MAX_PAR_CASE).map((e) => (
                      <PastilleEvenement key={e.cle} e={e} />
                    ))}
                    {reste(evenements.length) > 0 && <span className="w-fit rounded-pilule bg-teinte-fort px-2 text-mention font-semibold text-encre-2">+{reste(evenements.length)}</span>}
                  </span>
                  <span className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                    {evenements.slice(0, 4).map((e) => (
                      <span key={e.cle} className={cn('h-1.5 w-1.5 rounded-full', e.statut === 'enRetard' ? 'bg-alerte' : e.sens === 'entree' ? 'bg-positif' : e.type === 'objectif' ? 'bg-info' : 'bg-encre-2')} />
                    ))}
                  </span>
                  {jour && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-champ bg-encre px-3 py-1.5 text-mention text-white shadow-flottant group-hover:block group-focus-visible:block"
                    >
                      {phraseSolde(jour)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function PastilleEvenement({ e }: { e: EvenementVue }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-1 rounded-champ px-1.5 py-0.5 text-mention', styleEvenement(e), e.statut === 'prevu' && 'italic')}>
      {e.passeNonConfirme && <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />}
      <span className="truncate">{e.libelle}</span>
    </span>
  )
}

/** Vue liste : tous les événements du mois, jour par jour, avec le solde de chaque jour. */
function ListeEvenements({ evenements, calendrier, onOuvrir }: { evenements: EvenementVue[]; calendrier: CalendrierMoisDto; onOuvrir: (date: string) => void }) {
  const jours = new Map<string, CalendrierMoisDto['jours'][number]>(calendrier.jours.map((j) => [j.date, j]))
  const groupes = [...parJour(evenements)]
  return (
    <ul aria-label="Événements du mois" className="flex flex-col divide-y divide-filet rounded-bouton bg-interne shadow-bouton">
      {groupes.map(([date, liste]) => {
        const jour = jours.get(date)
        return (
          <li key={date}>
            <button type="button" onClick={() => onOuvrir(date)} className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-white focus-visible:outline-none focus-visible:shadow-focus sm:px-5" aria-label={`Ouvrir ${jourLong(date)}`}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-texte font-semibold text-encre">{jourLong(date)}</span>
                {jour && <span className="chiffres text-mention text-gris">{phraseSolde(jour)}</span>}
              </span>
              <span className="flex flex-col gap-1.5">
                {liste.map((e) => (
                  <LigneEvenement key={e.cle} e={e} />
                ))}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function LigneEvenement({ e }: { e: EvenementVue }) {
  const statut = statutVue(e)
  return (
    <span className="flex items-center justify-between gap-3 text-texte-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span className={cn('shrink-0 rounded-pilule px-2 text-mention', styleEvenement(e))}>{libelleType(e.type)}</span>
        <span className={cn('truncate text-encre', e.statut === 'prevu' && 'italic')}>{e.libelle}</span>
        {e.passeNonConfirme && <AlertCircle className="h-4 w-4 shrink-0 text-alerte" aria-label="Pas encore confirmé" />}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className={cn('text-mention', TONS[statut.ton])}>{statut.texte}</span>
        <span className="chiffres min-w-[5.5rem] text-right font-semibold text-encre">{montantSigne(e)}</span>
      </span>
    </span>
  )
}

/** Détail d'un jour : ses événements avec prévu, réel et statut, de quoi les confirmer ou les modifier, et le solde. */
function FenetreJour({
  date,
  jour,
  evenements,
  aujourdhui,
  onFermer,
  onAjouter,
}: {
  date: string | null
  jour: CalendrierMoisDto['jours'][number] | undefined
  evenements: EvenementVue[]
  aujourdhui: string
  onFermer: () => void
  onAjouter: (date: string) => void
}) {
  const enregistrer = useEnregistrerDepense()
  const supprimer = useSupprimerDepense()

  function payer(e: EvenementVue) {
    const c = e.ligne ? confirmation(e.ligne, aujourdhui) : null
    if (c?.type !== 'payer') return
    enregistrer.mutate(c.saisie, {
      onSuccess: ({ id }) => toast(`« ${e.libelle} » payé : ${formaterMontant(c.saisie.montant)}.`, { action: { label: 'Annuler', onClick: () => supprimer.mutate(id) } }),
      onError: (erreur) => toast(erreur instanceof ErreurApi ? erreur.message : 'Le paiement n’a pas été noté. Réessaie.'),
    })
  }

  return (
    <Fenetre
      ouvert={date !== null}
      onFermer={onFermer}
      titre={date ? jourLong(date) : ''}
      description={jour ? phraseSolde(jour) : undefined}
      pied={
        date && (
          <Bouton variante="contour" taille="sm" onClick={() => onAjouter(date)}>
            <Plus className="h-4 w-4" aria-hidden /> Ajouter un ponctuel ce jour
          </Bouton>
        )
      }
    >
      {evenements.length === 0 ? (
        <p className="text-texte text-gris">Aucun événement prévu ce jour-là.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Événements du jour">
          {evenements.map((e) => {
            const statut = statutVue(e)
            const c = e.ligne ? confirmation(e.ligne, aujourdhui) : null
            const modifier = lienModifier(e)
            return (
              <li key={e.cle} className="rounded-bouton bg-interne p-4 shadow-bouton">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={cn('rounded-pilule px-2 text-mention', styleEvenement(e))}>{libelleType(e.type)}</span>
                    <p className="mt-1.5 text-texte font-semibold text-encre">{e.jalon ? (e.jalon.type === 'atteint' ? `${e.libelle} atteint (projection)` : `${e.libelle} : date souhaitée`) : e.libelle}</p>
                    <p className={cn('mt-0.5 flex items-center gap-1 text-texte-sm', TONS[statut.ton])}>
                      {e.passeNonConfirme && <AlertCircle className="h-4 w-4" aria-hidden />}
                      {statut.texte}
                      {e.passeNonConfirme && ' · pas encore confirmé'}
                    </p>
                  </div>
                  <span className="chiffres text-titre text-encre">{montantSigne(e)}</span>
                </div>
                {e.ligne && (
                  <p className="mt-2 text-texte-sm text-gris">
                    Prévu : {e.prevu !== null ? formaterMontant(e.prevu) : '—'} · Réel : {e.reel !== null ? formaterMontant(e.reel) : 'pas encore'}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {c?.type === 'payer' && (
                    <Bouton variante="puce" taille="sm" onClick={() => payer(e)} disabled={enregistrer.isPending} aria-label={`Marquer ${e.libelle} payé`}>
                      Marquer payé
                    </Bouton>
                  )}
                  {c?.type === 'lien' && (
                    <Link to={c.chemin} className={styleBouton({ variante: 'puce', taille: 'sm' })} aria-label={`${c.libelle} : ${e.libelle}`}>
                      {c.libelle}
                    </Link>
                  )}
                  <Link to={modifier.chemin} className={styleBouton({ variante: 'contour', taille: 'sm' })} aria-label={`${modifier.libelle} : ${e.libelle}`}>
                    {modifier.libelle}
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Fenetre>
  )
}

/** Un ponctuel daté, ajouté depuis le calendrier (même formulaire que Mon plan). */
function AjoutPonctuel({ date, aujourdhui, onFermer }: { date: string | null; aujourdhui: string; onFermer: () => void }) {
  const enregistrer = useEnregistrerPonctuel()
  return (
    <Panneau ouvert={date !== null} onFermer={onFermer} titre="Ajouter un ponctuel" description="Une dépense unique et datée : elle apparaît dans le calendrier à sa date.">
      {date && (
        <FormulairePonctuel
          key={date}
          aujourdhui={aujourdhui}
          dateInitiale={date}
          chargement={enregistrer.isPending}
          onEnregistrer={async (saisie: SaisiePonctuel) => {
            await enregistrer.mutateAsync(saisie)
            toast(`« ${saisie.libelle} » prévu le ${formaterDate(saisie.date)}.`)
            onFermer()
          }}
        />
      )}
    </Panneau>
  )
}
