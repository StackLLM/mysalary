import { deMois, formaterDate, formaterMontant, type CategorieDto, type SemainesDto, type SuiviDepensesDto, type EnveloppeDeSemaine, type SuiviSemaine } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Fenetre } from '../../components/Fenetre'
import { BlocTotaux } from '../../components/Elements'
import { Montant } from '../../components/Montant'
import { elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { useCategories } from '../charges/requetes'
import { STATUTS_ECHEANCE } from '../charges/saisie'
import { useSuiviDepenses } from '../depenses/requetes'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { detailDepense, journal, libelleDepense, libelleJour } from '../depenses/saisie'
import type { Ton } from '../salaire/saisie'
import { EnteteMois } from './EnteteMois'
import { useSemaines } from './requetes'
import { dansSemaine, datesSemaine, dateProposee, joursSemaine, plus, reponseSemaines, texteTendance } from './saisie'

const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }
const FONDS: Record<Ton, string> = { positif: 'bg-positif-fond text-positif', alerte: 'bg-alerte-fond text-alerte', info: 'bg-info-fond text-info', neutre: 'bg-teinte text-encre-2' }
const STATUTS_SEMAINE = { passe: 'Passée', enCours: 'En cours', aVenir: 'À venir' } as const
const GRILLE = 'grid gap-8'

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
            droite={{
              titre: 'Semaines',
              lignes: [
                { valeur: `${donnees.semaines.length} semaines` },
                { libelle: 'Début', valeur: donnees.debutSemaine === 7 ? 'dimanche' : 'lundi' },
                { libelle: 'Report', valeur: donnees.report ? 'activé' : 'désactivé' },
              ],
            }}
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
                  Ce qu’il reste sur chaque enveloppe, semaine après semaine.
                </>
              }
            />
            {donnees.fige && <p className="mt-3 text-texte-sm text-gris">Mois clôturé : ces semaines sont figées telles qu’à la clôture.</p>}
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3" aria-label="Semaines du mois">
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
                  <span className="font-semibold text-encre">Reste</span> : budget de l’enveloppe moins tout ce que tu as dépensé dessus depuis le début du mois.
                </li>
                <li>
                  <span className="font-semibold text-encre">Barre</span> : en clair, déjà consommé avant la semaine ; en vert, consommé cette semaine.
                </li>
                <li>
                  <span className="font-semibold text-encre">Alerte</span> : tu as mis un montant sur une enveloppe déjà consommée, ou tu l’as dépassée.
                </li>
                <li>Semaine en cours cerclée ; semaine à venir en pointillés.</li>
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

/** Une semaine en carte : ce qu'il reste sur chaque enveloppe, avec ses alertes ; un clic ouvre la fenêtre. */
function CarteSemaine({ semaine: s, onOuvrir }: { semaine: SuiviSemaine; onOuvrir: () => void }) {
  const aVenir = s.statut === 'aVenir'
  const tendance = texteTendance(s.tendance)
  const partielle = joursSemaine(s)
  const statut = STATUTS_SEMAINE[s.statut]
  const etiquette = `Semaine ${s.numero}, ${datesSemaine(s)}, ${statut.toLowerCase()}. Voir le détail.`
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
            s.statut === 'enCours' ? 'bg-primaire text-white' : aVenir ? 'border border-filet-fort text-gris' : 'bg-teinte text-encre-2',
          )}
        >
          {statut}
        </span>
      </span>

      {s.enveloppes.length > 0 && (
        <span className="mt-4 flex flex-col gap-3.5">
          {s.enveloppes.map((e) => (
            <FriseEnveloppe key={e.id} enveloppe={e} />
          ))}
        </span>
      )}

      <span className="mt-4 flex flex-wrap gap-1.5">
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

/** Frise d'une enveloppe : budget du mois en deux temps (déjà consommé, cette semaine), ce qui reste, et ses alertes. */
function FriseEnveloppe({ enveloppe: e }: { enveloppe: EnveloppeDeSemaine }) {
  const depasse = e.reste < 0
  const total = Math.max(e.budget, e.avant + e.depense) || 1
  const pct = (v: number) => `${(Math.max(0, v) / total) * 100}%`
  return (
    <span className="block" role="group" aria-label={`${e.libelle} : reste ${formaterMontant(e.reste)} sur ${formaterMontant(e.budget)}`}>
      <span className="flex items-baseline justify-between gap-2 text-texte-sm">
        <span className="min-w-0 truncate font-medium text-encre">{e.libelle}</span>
        <span className={cn('shrink-0 font-semibold tabular-nums', depasse ? 'text-alerte' : 'text-encre')}>
          <Montant valeur={e.reste} />
        </span>
      </span>
      <span className="mt-1 flex h-2 gap-px overflow-hidden rounded-pilule bg-teinte" aria-hidden>
        <span className="bg-sauge-200" style={{ width: pct(e.avant) }} />
        <span className={depasse ? 'bg-alerte' : 'bg-primaire'} style={{ width: pct(e.depense) }} />
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-mention text-gris">
        {e.depense > 0 && (
          <span>
            −<Montant valeur={e.depense} /> cette semaine
          </span>
        )}
        {e.ecart !== null && e.ecart !== 0 && (
          <span className={e.ecart > 0 ? 'text-positif' : 'text-alerte'}>
            Écart {plus(e.ecart)}
            <Montant valeur={e.ecart} />
          </span>
        )}
        {e.dejaConsommee && (
          <span className="inline-flex items-center gap-1 rounded-pilule bg-attention-fond px-2 py-0.5 font-medium text-attention">
            <AlertCircle className="h-3 w-3" aria-hidden />
            Déjà consommé : <Montant valeur={e.avant} />
          </span>
        )}
        {depasse && (
          <span className="inline-flex items-center gap-1 rounded-pilule bg-alerte-fond px-2 py-0.5 font-medium text-alerte">
            <AlertCircle className="h-3 w-3" aria-hidden />
            Dépassée de <Montant valeur={-e.reste} />
          </span>
        )}
      </span>
    </span>
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
  const tendance = texteTendance(s.tendance)
  const partielle = joursSemaine(s)
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
        <ul className="flex flex-col gap-1 text-texte-sm text-gris">
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
        {s.enveloppes.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {s.enveloppes.map((e) => (
              <FriseEnveloppe key={e.id} enveloppe={e} />
            ))}
          </div>
        )}
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
