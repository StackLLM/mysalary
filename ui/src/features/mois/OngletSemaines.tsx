import { deMois, formaterDate, formaterMontant, type CategorieDto, type SemainesDto, type SuiviDepensesDto, type SuiviSemaine } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Fenetre } from '../../components/Fenetre'
import { BlocTotaux } from '../../components/Elements'
import { Kpi } from '../../components/Kpi'
import { Montant } from '../../components/Montant'
import { elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { useCategories } from '../charges/requetes'
import { part, STATUTS_ECHEANCE } from '../charges/saisie'
import { useSuiviDepenses } from '../depenses/requetes'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { detailDepense, journal, libelleDepense, libelleJour } from '../depenses/saisie'
import type { Ton } from '../salaire/saisie'
import { EnteteMois } from './EnteteMois'
import { useSemaines } from './requetes'
import { dansSemaine, datesSemaine, dateProposee, joursSemaine, plus, reponseSemaines, rythmeSemaine, texteTendance } from './saisie'

const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }
const FONDS: Record<Ton, string> = { positif: 'bg-positif-fond text-positif', alerte: 'bg-alerte-fond text-alerte', info: 'bg-info-fond text-info', neutre: 'bg-teinte text-encre-2' }
const STATUTS_SEMAINE = { passe: 'Passée', enCours: 'En cours', aVenir: 'À venir' } as const
const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'

/** Mois › Semaines (UX.md § 4.6, § 5.4) : est-ce que je tiens mon rythme ? */
export function OngletSemaines({ cle, verrouille, changerMois }: { cle: string; verrouille: boolean; changerMois: (cle: string) => void }) {
  const semaines = useSemaines(cle)
  const suivi = useSuiviDepenses(cle)
  const categories = useCategories()
  const requetes = [semaines, suivi, categories]

  if (requetes.some((q) => q.isError)) {
    return (
      <Carte espacement="large">
        <div className="rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de charger les semaines de ce mois.</p>
          <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => requetes.forEach((q) => void q.refetch())}>
            Réessayer
          </Bouton>
        </div>
      </Carte>
    )
  }
  if (!semaines.data || !suivi.data || !categories.data) {
    return (
      <div className={GRILLE} aria-label="Chargement des semaines">
        <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
        <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
      </div>
    )
  }
  return <Semaines donnees={semaines.data} suivi={suivi.data} categories={categories.data} verrouille={verrouille} changerMois={changerMois} />
}

function Semaines({
  donnees,
  suivi,
  categories,
  verrouille,
  changerMois,
}: {
  donnees: SemainesDto
  suivi: SuiviDepensesDto
  categories: CategorieDto[]
  verrouille: boolean
  changerMois: (cle: string) => void
}) {
  const { mois, aujourdhui } = donnees
  const [ouverte, setOuverte] = useState<number | null>(null)
  const courante = donnees.semaines.find((s) => s.numero === donnees.courante) ?? null
  const reponse = reponseSemaines(donnees.reponse)
  const titre = `Semaines ${deMois(mois.cle, { annee: false })}`
  const entete = <EnteteMois titre={titre} mois={mois} aujourdhui={aujourdhui} cloture={verrouille} changerMois={changerMois} />

  if (!reponse) {
    return (
      <div className={GRILLE}>
        <motion.div variants={elementApparition} className="min-w-0">
          <Carte espacement="large">
            {entete}
            <div className="mt-7 rounded-bouton bg-interne p-6 shadow-bouton">
              <h3 className="text-titre text-encre">Définis tes enveloppes pour suivre la semaine.</h3>
              <p className="mt-2 max-w-xl text-texte text-gris">
                Le suivi de la semaine compare ce que tu dépenses au budget de tes enveloppes (courses, transport, loisirs), réparti jour par jour. Ce mois-ci, aucune enveloppe n’est définie.
              </p>
              <Link to="/plan?onglet=charges" className={styleBouton({ className: 'mt-5' })}>
                Définir mes enveloppes
              </Link>
            </div>
          </Carte>
        </motion.div>
        <motion.div variants={elementApparition} className="min-w-0">
          <CarteCalcul donnees={donnees} />
        </motion.div>
      </div>
    )
  }

  const aVenir = mois.statut === 'aVenir'
  const index = donnees.semaines.findIndex((s) => s.numero === ouverte)
  const selection = index >= 0 ? donnees.semaines[index]! : null
  const total =
    donnees.reponse.type === 'avance' || donnees.reponse.type === 'marge'
      ? { libelle: donnees.reponse.type === 'avance' ? 'Avance sur le rythme' : 'Marge du mois', valeur: <Montant valeur={donnees.reponse.montant} /> }
      : donnees.reponse.type === 'retard' || donnees.reponse.type === 'depasse'
        ? { libelle: donnees.reponse.type === 'retard' ? 'Au-dessus du rythme' : 'Dépassement', valeur: <Montant valeur={donnees.reponse.montant} /> }
        : { libelle: 'Budget flexible prévu', valeur: <Montant valeur={donnees.budget} /> }

  return (
    <div className={GRILLE}>
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          {entete}

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Budget flexible du mois',
              lignes: [
                { valeur: <Montant valeur={donnees.budget} /> },
                { libelle: 'Dépensé', valeur: <Montant valeur={donnees.depense} /> },
                ...(donnees.budgetADate !== null ? [{ libelle: 'Prévu à date', valeur: <Montant valeur={donnees.budgetADate} /> }] : []),
              ],
            }}
            droite={
              courante
                ? {
                    titre: `Reste cette semaine`,
                    lignes: [
                      { valeur: <Montant valeur={courante.reste} /> },
                      { libelle: 'Par jour', valeur: <Montant valeur={courante.parJour ?? 0} /> },
                      { libelle: 'Jours restants', valeur: String(courante.nbJours - courante.joursEcoules + 1) },
                    ],
                  }
                : {
                    titre: 'Semaines',
                    lignes: [
                      { valeur: `${donnees.semaines.length} semaines` },
                      { libelle: 'Début', valeur: donnees.debutSemaine === 7 ? 'dimanche' : 'lundi' },
                      { libelle: 'Report', valeur: donnees.report ? 'activé' : 'désactivé' },
                    ],
                  }
            }
          />

          <p className={cn('mt-5 rounded-champ px-4 py-3 text-texte-sm', FONDS[reponse.ton])}>
            <span className="text-encre-2">Est-ce que je tiens mon budget ? </span>
            <span className="font-semibold">{reponse.texte}.</span>
            {donnees.budgetADate !== null && (
              <span className="text-encre-2">
                {' '}
                Prévu à date : {formaterMontant(donnees.budgetADate)} (budget des jours écoulés), dépensé : {formaterMontant(donnees.depense)}.
              </span>
            )}
          </p>

          <section className="mt-8">
            <TitreSection
              titre="Semaine par semaine"
              sousTitre={
                <>
                  Tes enveloppes semaine par semaine, face à ce que tu as <span className="font-semibold text-encre-2">vraiment</span> dépensé. Ouvre une semaine pour son détail.
                </>
              }
            />
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" aria-label="Semaines du mois">
              {donnees.semaines.map((s) => (
                <li key={s.numero}>
                  <CarteSemaine semaine={s} onOuvrir={() => setOuverte(s.numero)} />
                </li>
              ))}
            </ul>
            <MessagesEnveloppes aRepartir={donnees.aRepartir} libres={donnees.libres ?? []} />
          </section>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <h3 className="mb-4 text-titre text-encre">Lire une carte</h3>
              <ul className="flex flex-col gap-2.5 rounded-bouton bg-interne p-5 text-texte-sm text-gris shadow-bouton">
                <li>
                  <span className="font-semibold text-encre">Reste</span> : disponible de la semaine moins ce que tu as dépensé. En rouge s’il est dépassé.
                </li>
                <li>
                  <span className="font-semibold text-encre">Barre</span> : part du disponible dépensée ; le petit trait marque où tu devrais être aujourd’hui.
                </li>
                <li>
                  <span className="font-semibold text-encre">Écart</span> : budget des jours écoulés moins dépensé. Positif, tu as de l’avance.
                </li>
                <li>Semaine en cours cerclée ; semaine à venir en pointillés, avec son seul budget prévu.</li>
              </ul>
            </div>
            <BlocTotaux
              lignes={[
                { libelle: 'Budget flexible (prévu)', valeur: <Montant valeur={donnees.budget} />, fort: true },
                ...(donnees.budgetADate !== null ? [{ libelle: 'Prévu à date', valeur: <Montant valeur={donnees.budgetADate} /> }] : []),
                { libelle: 'Dépensé (réel)', valeur: <Montant valeur={donnees.depense} /> },
              ]}
              total={total}
            />
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        {courante && <CarteSemaineCourante semaine={courante} onOuvrir={() => setOuverte(courante.numero)} />}
        <CarteCalcul donnees={donnees} />
      </motion.div>

      {selection && (
        <FenetreSemaine
          semaine={selection}
          suivi={suivi}
          categories={categories}
          aujourdhui={aujourdhui}
          lectureSeule={verrouille || aVenir}
          onFermer={() => setOuverte(null)}
          precedent={index > 0 ? () => setOuverte(donnees.semaines[index - 1]!.numero) : null}
          suivant={index < donnees.semaines.length - 1 ? () => setOuverte(donnees.semaines[index + 1]!.numero) : null}
        />
      )}
    </div>
  )
}

const STYLES_STATUT = {
  passe: 'border border-filet bg-white',
  enCours: 'border border-filet bg-white ring-2 ring-primaire ring-offset-2 ring-offset-white',
  aVenir: 'border border-dashed border-filet-fort bg-interne',
} as const

/** Une semaine en carte (lot 15) : reste, barre de rythme, écart et tendance ; un clic ouvre la fenêtre. */
function CarteSemaine({ semaine: s, onOuvrir }: { semaine: SuiviSemaine; onOuvrir: () => void }) {
  const aVenir = s.statut === 'aVenir'
  const tendance = texteTendance(s.tendance)
  const partielle = joursSemaine(s)
  const statut = STATUTS_SEMAINE[s.statut]
  const depasse = !aVenir && s.reste < 0
  const etiquette = aVenir
    ? `Semaine ${s.numero}, ${datesSemaine(s)} : ${formaterMontant(s.disponible)} disponibles, à venir. Voir le détail.`
    : `Semaine ${s.numero}, ${datesSemaine(s)} : reste ${formaterMontant(s.reste)}, ${statut.toLowerCase()}. Voir le détail.`
  return (
    <button
      type="button"
      onClick={onOuvrir}
      aria-label={etiquette}
      className={cn(
        'group flex h-full w-full flex-col rounded-bouton p-3.5 text-left shadow-bouton transition-all duration-200 hover:-translate-y-0.5 hover:shadow-carte focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sauge sm:p-5',
        STYLES_STATUT[s.statut],
      )}
    >
      <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <span className="min-w-0">
          <span className="block text-titre-carte font-semibold text-encre">Semaine {s.numero}</span>
          <span className="block text-mention text-gris">
            {datesSemaine(s)}
            {partielle && ` · ${partielle}`}
          </span>
        </span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-pilule px-2 py-0.5 text-mention',
            s.statut === 'enCours' ? 'bg-primaire text-white' : s.statut === 'aVenir' ? 'border border-filet-fort text-gris' : 'bg-teinte text-encre-2',
          )}
        >
          {statut}
        </span>
      </span>

      <span className="mt-3 block text-mention text-gris sm:mt-5">{aVenir ? 'Disponible (prévu)' : 'Reste'}</span>
      <Montant
        valeur={aVenir ? s.disponible : s.reste}
        className={cn('mt-0.5 block text-[19px] font-bold leading-7 tracking-tight sm:text-[26px] sm:leading-8', depasse ? 'text-alerte' : 'text-encre', aVenir && 'italic text-encre-2')}
      />

      <span className="relative mt-3 block h-1.5 rounded-pilule bg-teinte-fort" aria-hidden>
        <span className={cn('absolute inset-y-0 left-0 rounded-pilule', depasse ? 'bg-alerte' : 'bg-primaire')} style={{ width: `${Math.round(part(s.depense, s.disponible) * 100)}%` }} />
        {s.statut === 'enCours' && <span className="absolute -inset-y-1 w-0.5 rounded-pilule bg-encre" style={{ left: `${Math.round(rythmeSemaine(s) * 100)}%` }} />}
      </span>

      <span className="mt-3 hidden gap-1.5 text-texte-sm sm:grid sm:mt-4">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-gris">Dépensé</span>
          {aVenir ? <span className="text-gris">—</span> : <Montant valeur={s.depense} className="font-medium text-encre-2" />}
        </span>
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-gris">Disponible</span>
          <Montant valeur={s.disponible} className="text-gris" />
        </span>
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-gris">Écart</span>
          <span className={cn(s.ecart === null || s.ecart === 0 ? 'text-gris' : s.ecart > 0 ? 'text-positif' : 'text-alerte')}>
            {s.ecart === null ? (
              '—'
            ) : (
              <>
                {plus(s.ecart)}
                <Montant valeur={s.ecart} />
              </>
            )}
          </span>
        </span>
      </span>

      <span className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
        {s.tendance && (
          <span className={cn('inline-flex items-center rounded-pilule px-2 py-0.5 text-mention', FONDS[tendance.ton])} title={tendance.detail}>
            <span className="sr-only">Tendance : </span>
            {tendance.texte}
          </span>
        )}
        {s.charges.length > 0 && (
          <span className="inline-flex items-center rounded-pilule bg-info-fond px-2 py-0.5 text-mention text-info">
            {s.charges.length} charge{s.charges.length > 1 ? 's' : ''}
          </span>
        )}
        {s.epargne > 0 && <span className="inline-flex items-center rounded-pilule bg-sauge-100 px-2 py-0.5 text-mention text-sauge-700">Épargne</span>}
      </span>

      <span className="mt-auto hidden pt-4 text-mention font-semibold text-lien opacity-70 transition-opacity group-hover:opacity-100 sm:block">Voir le détail →</span>
    </button>
  )
}

/** Fenêtre d'une semaine (lot 15) : le calcul du reste, puis les dépenses jour par jour et les charges datées. */
function FenetreSemaine({
  semaine: s,
  suivi,
  categories,
  aujourdhui,
  lectureSeule,
  onFermer,
  precedent,
  suivant,
}: {
  semaine: SuiviSemaine
  suivi: SuiviDepensesDto
  categories: CategorieDto[]
  aujourdhui: string
  lectureSeule: boolean
  onFermer: () => void
  precedent: (() => void) | null
  suivant: (() => void) | null
}) {
  const aVenir = s.statut === 'aVenir'
  const restants = s.nbJours - s.joursEcoules + 1
  const tendance = texteTendance(s.tendance)
  const partielle = joursSemaine(s)
  const cases = [
    { cle: 'budget', libelle: 'Budget (prévu)', valeur: s.budget, signe: '' },
    ...(s.report !== 0 ? [{ cle: 'report', libelle: 'Report', valeur: s.report, signe: plus(s.report) }] : []),
    { cle: 'disponible', libelle: 'Disponible', valeur: s.disponible, signe: '' },
    { cle: 'depense', libelle: 'Dépensé', valeur: s.depense, signe: s.depense > 0 ? '−' : '' },
  ]
  const navigation = (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Semaine précédente" disabled={!precedent} onClick={precedent ?? undefined} className="grid h-10 w-10 place-items-center rounded-pilule text-gris hover:bg-teinte hover:text-encre disabled:opacity-30">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Semaine suivante" disabled={!suivant} onClick={suivant ?? undefined} className="grid h-10 w-10 place-items-center rounded-pilule text-gris hover:bg-teinte hover:text-encre disabled:opacity-30">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
  return (
    <Fenetre
      ouvert
      onFermer={onFermer}
      titre={`Semaine ${s.numero}`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-pilule bg-teinte px-2 py-0.5 text-mention text-encre-2">{STATUTS_SEMAINE[s.statut]}</span>
          <span>
            {datesSemaine(s)}
            {partielle && ` · ${partielle}`}
          </span>
        </span>
      }
      entete={navigation}
      pied={
        <Bouton variante="contour" onClick={onFermer}>
          Fermer
        </Bouton>
      }
    >
      <section aria-label="Calcul de la semaine">
        <div className={cn('grid grid-cols-2 gap-2', cases.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
          {cases.map((c) => (
            <div key={c.cle} className="min-w-0 rounded-champ bg-interne px-3 py-2.5 shadow-bouton">
              <span className="block truncate text-mention text-gris">{c.libelle}</span>
              <span className={cn('block text-texte font-semibold tabular-nums', c.cle === 'budget' ? 'italic text-encre-2' : 'text-encre')}>
                {c.signe}
                <Montant valeur={c.valeur} />
              </span>
            </div>
          ))}
        </div>
        <div className={cn('mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-champ px-4 py-3 ring-1', !aVenir && s.reste < 0 ? 'bg-alerte-fond ring-alerte/20' : 'bg-sauge-50 ring-sauge-200')}>
          <span className={cn('text-texte-sm font-semibold', !aVenir && s.reste < 0 ? 'text-alerte' : 'text-sauge-700')}>= Reste de la semaine{aVenir ? ' (prévu)' : ''}</span>
          <Montant valeur={aVenir ? s.disponible : s.reste} className={cn('text-titre font-bold', !aVenir && s.reste < 0 ? 'text-alerte' : 'text-encre')} />
        </div>
        <ul className="mt-3 flex flex-col gap-1 text-texte-sm text-gris">
          {s.statut === 'enCours' && (
            <li>
              Jour {s.joursEcoules} sur {s.nbJours} ·{' '}
              {s.reste > 0 ? (
                <>
                  tu peux dépenser <Montant valeur={s.parJour ?? 0} className="font-semibold text-encre" /> par jour pendant {restants} jour{restants > 1 ? 's' : ''}.
                </>
              ) : (
                'le disponible de la semaine est dépensé.'
              )}
            </li>
          )}
          {s.ecart !== null && (
            <li>
              Écart sur le rythme :{' '}
              <span className={cn('font-semibold', s.ecart === 0 ? 'text-encre' : s.ecart > 0 ? 'text-positif' : 'text-alerte')}>
                {plus(s.ecart)}
                <Montant valeur={s.ecart} />
              </span>{' '}
              ({s.statut === 'enCours' ? 'budget des jours écoulés' : 'budget de la semaine'} moins dépensé).
            </li>
          )}
          <li>
            Tendance : <span className={cn('font-semibold', TONS[tendance.ton])}>{tendance.texte}</span>. {tendance.detail}
          </li>
        </ul>
      </section>
      <Separateur className="my-5" />
      <DetailSemaine semaine={s} suivi={suivi} categories={categories} aujourdhui={aujourdhui} lectureSeule={lectureSeule || aVenir} />
    </Fenetre>
  )
}

/** Semaine ouverte : charges datées et dépenses, jour par jour (UX.md § 5.4, « ouvrir une semaine »). */
function DetailSemaine({
  semaine: s,
  suivi,
  categories,
  aujourdhui,
  lectureSeule,
}: {
  semaine: SuiviSemaine
  suivi: SuiviDepensesDto
  categories: CategorieDto[]
  aujourdhui: string
  lectureSeule: boolean
}) {
  const { ouvrir } = useSaisieRapide()
  const parId = new Map(categories.map((c) => [c.id, c]))
  const dans = dansSemaine(s)
  const liste = journal(suivi.depenses.filter(dans), suivi.paiementsDettes.filter(dans), null)
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-8">
      <section aria-label={`Dépenses de la semaine ${s.numero}`} className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-mention font-semibold uppercase tracking-wide text-gris">Dépenses</h4>
          {!lectureSeule && (
            <Bouton variante="puce" taille="sm" className="h-7 px-2.5" onClick={() => ouvrir(undefined, { date: dateProposee(s, aujourdhui) })}>
              + Ajouter
            </Bouton>
          )}
        </div>
        {liste.nombre === 0 ? (
          <p className="text-texte-sm text-gris">{s.statut === 'aVenir' ? 'Semaine à venir : rien de réel pour l’instant.' : 'Aucune dépense notée cette semaine.'}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {liste.groupes.map((g) => (
              <div key={g.jour}>
                <p className="mb-1.5 flex items-baseline justify-between gap-3 text-texte-sm">
                  <span className="font-semibold text-encre">{libelleJour(g.jour, aujourdhui)}</span>
                  <Montant valeur={g.total} className="text-gris" />
                </p>
                <ul className="flex flex-col gap-1.5">
                  {g.lignes.map((l) => {
                    const cle = l.type === 'depense' ? l.depense.id : l.paiement.id
                    const nom = l.type === 'depense' ? libelleDepense(l.depense, parId) : l.paiement.libelle
                    const detail = l.type === 'depense' ? detailDepense(l.depense, parId) : 'Paiement de dette'
                    const montant = l.type === 'depense' ? l.depense.montant : l.paiement.montant
                    const contenu = (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-texte font-medium text-encre">{nom}</span>
                          <span className="block truncate text-mention text-gris">{detail}</span>
                        </span>
                        <Montant valeur={montant} className="shrink-0 font-semibold text-encre" />
                      </>
                    )
                    return (
                      <li key={cle}>
                        {l.type === 'depense' && !lectureSeule ? (
                          <button
                            type="button"
                            onClick={() => ouvrir(l.depense)}
                            className="flex w-full items-center gap-3 rounded-champ border border-filet bg-white px-3 py-2 text-left hover:border-filet-fort focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sauge"
                            aria-label={`Modifier ${nom}, ${formaterMontant(montant)}`}
                          >
                            {contenu}
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 rounded-champ border border-filet bg-white px-3 py-2">{contenu}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label={`Charges datées de la semaine ${s.numero}`} className="min-w-0">
        <h4 className="mb-3 text-mention font-semibold uppercase tracking-wide text-gris">Charges prévues</h4>
        {s.charges.length === 0 ? (
          <p className="text-texte-sm text-gris">Aucune charge datée cette semaine.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {s.charges.map((c) => {
              const statut = STATUTS_ECHEANCE[c.statut]
              return (
                <li key={`${c.origine}-${c.id}-${c.date}`} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-texte font-medium text-encre">{c.libelle}</span>
                    <span className="block text-mention text-gris">
                      {formaterDate(c.date, 'court')} · <span className={TONS[statut.ton]}>{statut.texte}</span>
                    </span>
                  </span>
                  <Montant valeur={c.montant} className="shrink-0 text-texte text-gris" />
                </li>
              )
            })}
          </ul>
        )}
        <dl className="mt-4 flex flex-col gap-1.5 border-t border-filet pt-3 text-texte-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gris">Prévu</dt>
            <dd>
              <Montant valeur={s.chargesPrevues} className="text-gris" />
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gris">Payé cette semaine</dt>
            <dd>
              <Montant valeur={s.chargesPayees} className="font-semibold text-encre" />
            </dd>
          </div>
          {/* Épargne : jamais une dépense (R11). Absente des semaines figées avant le lot 10. */}
          {typeof s.epargne === 'number' && s.epargne !== 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-gris">Mis de côté cette semaine</dt>
              <dd>
                <Montant valeur={s.epargne} className="font-semibold text-encre" />
              </dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  )
}

/** KPI « Reste flexible (semaine) » (Plan.md § 8) et rythme de la semaine en cours. */
function CarteSemaineCourante({ semaine: s, onOuvrir }: { semaine: SuiviSemaine; onOuvrir: () => void }) {
  const restants = s.nbJours - s.joursEcoules + 1
  const ecart = s.ecart ?? 0
  return (
    <Carte titre="Cette semaine" precision={`(${datesSemaine(s)})`}>
      <Kpi
        libelle="Reste flexible (semaine)"
        valeur={<Montant valeur={s.reste} className={s.reste < 0 ? 'text-alerte' : undefined} />}
        comparaison={ecart >= 0 ? `${formaterMontant(ecart)} d’avance sur le rythme` : `${formaterMontant(-ecart)} au-dessus du rythme`}
        tendance={ecart >= 0 ? 'favorable' : 'defavorable'}
      />
      <BarreProgression
        className="mt-5"
        valeur={part(s.depense, s.disponible)}
        rythme={rythmeSemaine(s)}
        libelle={`${Math.round(part(s.depense, s.disponible) * 100)} % du disponible dépensé, jour ${s.joursEcoules} sur ${s.nbJours}`}
      />
      <p className="mt-2 text-mention text-gris">
        <Montant valeur={s.depense} /> dépensés sur <Montant valeur={s.disponible} /> · jour {s.joursEcoules} sur {s.nbJours}
      </p>
      <Separateur className="my-5" />
      <p className="text-texte text-encre">
        {s.reste > 0 ? (
          <>
            Tu peux dépenser <Montant valeur={s.parJour ?? 0} className="font-semibold" /> par jour pendant {restants} jour{restants > 1 ? 's' : ''}.
          </>
        ) : (
          <>Le disponible de la semaine est dépensé. Il reste {restants} jour{restants > 1 ? 's' : ''}.</>
        )}
      </p>
      <Bouton variante="blanc" className="mt-5 w-full" onClick={onOuvrir}>
        Voir le détail de la semaine
      </Bouton>
    </Carte>
  )
}

/** « Sur quoi repose ce calcul ? » (UX.md § 9) : règles de répartition, de report et de tendance. */
function CarteCalcul({ donnees }: { donnees: SemainesDto }) {
  return (
    <Carte titre="Sur quoi repose ce calcul ?">
      <ul className="flex list-disc flex-col gap-2 pl-4 text-texte-sm text-gris">
        <li>Le budget d’une semaine, ce sont les montants que tu as mis sur elle dans tes enveloppes (Mon plan › Charges), dès son premier jour, ou le montant par jour. Une semaine sans montant reçoit 0. Une enveloppe consommée librement est suivie sur le mois, pas sur les semaines.</li>
        <li>Le dépensé compte les dépenses liées à une enveloppe et les dépenses hors plan. Les charges fixes et les dettes sont à part.</li>
        <li>La tendance compare ton dépensé par jour à la moyenne des 4 semaines précédentes.</li>
        <li>
          {donnees.report
            ? 'Report activé : le reste d’une semaine terminée passe sur la suivante, dans le même mois.'
            : 'Report désactivé : chaque semaine repart de son propre budget.'}{' '}
          <Link to="/reglages" className="font-medium text-sauge-700 underline-offset-2 hover:underline">
            Réglages
          </Link>
        </li>
        {donnees.fige && <li>Mois clôturé : ces semaines sont figées telles qu’à la clôture.</li>}
      </ul>
    </Carte>
  )
}

/** Sous les cartes : budget d'enveloppes pas encore mis sur une semaine, et enveloppes suivies sur le mois seulement. */
function MessagesEnveloppes({ aRepartir, libres }: { aRepartir: number; libres: { id: string; libelle: string }[] }) {
  if (aRepartir <= 0 && libres.length === 0) return null
  const noms = libres.map((e) => e.libelle)
  const liste = noms.length > 1 ? `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}` : noms[0]
  return (
    <div role="status" className="mt-4 flex flex-col gap-1.5 rounded-bouton bg-attention-fond px-4 py-3 text-texte-sm text-attention">
      {aRepartir > 0 && (
        <p>
          <span className="font-semibold">{formaterMontant(aRepartir)}</span> de tes enveloppes ne sont encore mis sur aucune semaine.
        </p>
      )}
      {libres.length > 0 && (
        <p>
          <span className="font-semibold">{liste}</span> {libres.length > 1 ? 'sont consommées' : 'est consommée'} librement : suivi sur le mois, sans montant de semaine.
        </p>
      )}
      <Link to="/plan?onglet=charges" className="self-start font-semibold underline underline-offset-2">
        Mettre mes montants par semaine
      </Link>
    </div>
  )
}
