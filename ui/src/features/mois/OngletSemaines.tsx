import { deMois, formaterDate, formaterMontant, type CategorieDto, type SemainesDto, type SuiviDepensesDto, type SuiviSemaine } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
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
import { dansSemaine, datesSemaine, dateProposee, joursSemaine, plus, reponseSemaines, texteTendance } from './saisie'

const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }
const FONDS: Record<Ton, string> = { positif: 'bg-positif-fond text-positif', alerte: 'bg-alerte-fond text-alerte', info: 'bg-info-fond text-info', neutre: 'bg-teinte text-encre-2' }
const COLONNES = 'grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_28px] items-center gap-3'
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
  const [ouverte, setOuverte] = useState<number | null>(donnees.courante)
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
                  Tes enveloppes réparties jour par jour, face à ce que tu as <span className="font-semibold text-encre-2">vraiment</span> dépensé.
                </>
              }
            />
            <div className="mt-5">
              <div className={cn(COLONNES, 'hidden border-y border-filet px-4 py-4 text-texte-sm text-gris sm:grid')}>
                <span>Semaine</span>
                <span className="text-right">Disponible</span>
                <span className="text-right">Dépensé</span>
                <span className="text-right">Reste</span>
                <span className="text-right">Écart</span>
                <span className="text-right">Tendance</span>
                <span aria-hidden />
              </div>
              <ul className="flex flex-col pt-3">
                {donnees.semaines.map((s) => (
                  <LigneSemaine
                    key={s.numero}
                    semaine={s}
                    ouverte={ouverte === s.numero}
                    onBasculer={() => setOuverte(ouverte === s.numero ? null : s.numero)}
                    suivi={suivi}
                    categories={categories}
                    aujourdhui={aujourdhui}
                    lectureSeule={verrouille || aVenir}
                  />
                ))}
              </ul>
            </div>
          </section>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <h3 className="mb-4 text-titre text-encre">Dépensé par semaine</h3>
              <div className="flex flex-col gap-4 rounded-bouton bg-interne p-5 shadow-bouton">
                {donnees.semaines.map((s) => (
                  <div key={s.numero}>
                    <div className="flex items-baseline justify-between gap-3 text-texte">
                      <span className="truncate font-medium text-encre">
                        Semaine {s.numero} <span className="text-texte-sm font-normal text-gris">· {datesSemaine(s)}</span>
                      </span>
                      <span className="shrink-0 text-texte-sm text-gris">
                        {s.statut === 'aVenir' ? '—' : <Montant valeur={s.depense} className="font-semibold text-encre" />} / <Montant valeur={s.disponible} />
                      </span>
                    </div>
                    <BarreProgression
                      className="mt-2"
                      valeur={part(s.depense, s.disponible)}
                      rythme={s.statut === 'enCours' ? s.joursEcoules / s.nbJours : undefined}
                      libelle={`Semaine ${s.numero} : ${Math.round(part(s.depense, s.disponible) * 100)} % du disponible dépensé`}
                    />
                  </div>
                ))}
              </div>
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
        {courante && <CarteSemaineCourante semaine={courante} />}
        <CarteCalcul donnees={donnees} />
      </motion.div>
    </div>
  )
}

function LigneSemaine({
  semaine: s,
  ouverte,
  onBasculer,
  suivi,
  categories,
  aujourdhui,
  lectureSeule,
}: {
  semaine: SuiviSemaine
  ouverte: boolean
  onBasculer: () => void
  suivi: SuiviDepensesDto
  categories: CategorieDto[]
  aujourdhui: string
  lectureSeule: boolean
}) {
  const aVenir = s.statut === 'aVenir'
  const tendance = texteTendance(s.tendance)
  const partielle = joursSemaine(s)
  const idDetail = `semaine-${s.numero}`
  const tirets = <span className="font-normal text-gris">—</span>
  return (
    <li className={cn('rounded-champ', ouverte ? 'bg-interne' : 'odd:bg-interne')}>
      <button
        type="button"
        onClick={onBasculer}
        aria-expanded={ouverte}
        aria-controls={idDetail}
        aria-label={`Semaine ${s.numero}, ${datesSemaine(s)}`}
        className={cn(COLONNES, 'flex w-full flex-wrap gap-x-4 gap-y-1 rounded-champ px-4 py-3 text-left text-texte focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sauge sm:grid sm:gap-3')}
      >
        <span className="order-1 min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-encre">Semaine {s.numero}</span>
            {s.statut === 'enCours' && <span className="rounded-pilule bg-sauge-100 px-2 py-0.5 text-mention font-medium text-sauge-700">En cours</span>}
          </span>
          <span className="block text-mention text-gris">
            {datesSemaine(s)}
            {partielle && ` · ${partielle}`}
          </span>
        </span>
        {/* Sous 640 px : tendance à droite du libellé, montants sur la ligne suivante. */}
        <span className={cn('order-2 shrink-0 text-texte-sm font-medium sm:order-6 sm:text-right sm:text-texte', TONS[tendance.ton])} title={tendance.detail}>
          <span className="sr-only">Tendance : </span>
          {tendance.texte}
        </span>
        <ChevronDown className={cn('order-2 h-4 w-4 shrink-0 self-center text-gris transition-transform sm:order-7 sm:justify-self-end', ouverte && 'rotate-180')} aria-hidden />
        <span className="order-3 basis-full sm:hidden" aria-hidden />
        <span className="order-4 text-texte-sm text-gris sm:order-2 sm:text-right sm:text-texte">
          <span className="sm:hidden">Dispo. </span>
          <Montant valeur={s.disponible} />
          {s.report !== 0 && (
            <span className="block text-mention">
              dont report {plus(s.report)}
              <Montant valeur={s.report} />
            </span>
          )}
        </span>
        <span className="order-4 text-texte-sm font-semibold text-encre sm:order-3 sm:text-right sm:text-texte">
          <span className="font-normal text-gris sm:hidden">Dépensé </span>
          {aVenir ? tirets : <Montant valeur={s.depense} />}
        </span>
        <span className={cn('order-4 text-texte-sm sm:order-4 sm:text-right sm:text-texte', !aVenir && s.reste < 0 ? 'font-semibold text-alerte' : 'text-encre')}>
          <span className="font-normal text-gris sm:hidden">Reste </span>
          {aVenir ? tirets : <Montant valeur={s.reste} />}
        </span>
        <span
          className={cn(
            'order-4 text-texte-sm sm:order-5 sm:text-right sm:text-texte',
            s.ecart === null || s.ecart === 0 ? 'text-gris' : s.ecart > 0 ? 'text-positif' : 'text-alerte',
            s.ecart === null && 'hidden sm:block',
          )}
        >
          <span className="sm:hidden">Écart </span>
          {s.ecart === null ? (
            '—'
          ) : (
            <>
              {plus(s.ecart)}
              <Montant valeur={s.ecart} />
            </>
          )}
        </span>
      </button>
      {ouverte && <DetailSemaine id={idDetail} semaine={s} suivi={suivi} categories={categories} aujourdhui={aujourdhui} lectureSeule={lectureSeule || aVenir} />}
    </li>
  )
}

/** Semaine ouverte : charges datées et dépenses, jour par jour (UX.md § 5.4, « ouvrir une semaine »). */
function DetailSemaine({
  id,
  semaine: s,
  suivi,
  categories,
  aujourdhui,
  lectureSeule,
}: {
  id: string
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
    <div id={id} className="grid gap-6 px-4 pb-5 pt-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-8">
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
        </dl>
      </section>
    </div>
  )
}

/** KPI « Reste flexible (semaine) » (Plan.md § 8) et rythme de la semaine en cours. */
function CarteSemaineCourante({ semaine: s }: { semaine: SuiviSemaine }) {
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
        rythme={s.joursEcoules / s.nbJours}
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
    </Carte>
  )
}

/** « Sur quoi repose ce calcul ? » (UX.md § 9) : règles de répartition, de report et de tendance. */
function CarteCalcul({ donnees }: { donnees: SemainesDto }) {
  return (
    <Carte titre="Sur quoi repose ce calcul ?">
      <ul className="flex list-disc flex-col gap-2 pl-4 text-texte-sm text-gris">
        <li>Le budget flexible, ce sont tes enveloppes du mois, réparties jour par jour. Une semaine de 3 jours reçoit 3 jours de budget.</li>
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
