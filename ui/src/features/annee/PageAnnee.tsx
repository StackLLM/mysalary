import { formaterMois, formaterMontant, type SuiviAnnuelDto, type TotalAnnuel } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { RaccourcisPeriode } from '../../components/RaccourcisPeriode'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { FilAriane } from '../../components/FilAriane'
import { GraphiqueAnnee } from '../../components/graphiques/GraphiqueAnnee'
import { Montant } from '../../components/Montant'
import { Onglets } from '../../components/Onglets'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { useSuiviAnnuel } from '../mois/requetes'
import { useMoisCourant } from '../salaire/requetes'
import { CalendrierAnnee } from './CalendrierAnnee'
import { anneeDe, barreObjectifAnnee, ETATS_ANNEE, NATURES_CARTE, phraseObjectifAnnee, phrasePartVariable, pointsAnnee } from './saisie'

const VUES = [
  { valeur: 'synthese', libelle: 'Synthèse' },
  { valeur: 'calendrier', libelle: 'Calendrier' },
] as const

/** Année (ux-ui.md (UX) § 4.8, § 5.6) : l'année sans lire chaque mois. L'année et la vue sont gardées dans l'adresse. */
export function PageAnnee() {
  const [parametres, setParametres] = useSearchParams()
  const courant = useMoisCourant()
  const vue = VUES.find((v) => v.valeur === parametres.get('vue')) ?? VUES[0]
  const annee = Number(parametres.get('annee')) || (courant.data ? anneeDe(courant.data.cle) : null)
  const suivi = useSuiviAnnuel(annee ?? 0)

  const changer = (valeurs: { vue?: string; annee?: number }) => {
    const suite = { vue: valeurs.vue ?? vue.valeur, annee: valeurs.annee ?? (parametres.get('annee') ? annee : null) }
    setParametres(
      Object.fromEntries(Object.entries({ vue: suite.vue === 'synthese' ? null : suite.vue, annee: suite.annee ? String(suite.annee) : null }).filter(([, v]) => v)) as Record<string, string>,
      { replace: true },
    )
  }
  const anneeCourante = courant.data ? anneeDe(courant.data.cle) : null
  const donnees = suivi.data?.annee === annee ? suivi.data : null

  const erreur = (
    <Carte espacement="large">
      <div className="rounded-bouton bg-alerte-fond p-5">
        <p className="text-texte font-medium text-alerte">Impossible de charger l’année.</p>
        <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => [courant, suivi].forEach((q) => void q.refetch())}>
          Réessayer
        </Bouton>
      </div>
    </Carte>
  )
  const chargement = <div className="h-[34rem] animate-pulse rounded-carte bg-white shadow-carte" aria-label="Chargement de l’année" />

  const contenu = (valeur: (typeof VUES)[number]['valeur']) => {
    if (courant.isError || suivi.isError) return erreur
    if (annee === null || !donnees) return chargement
    if (valeur === 'calendrier') return <CalendrierAnnee annee={annee} changerAnnee={(a) => changer({ annee: a })} />
    return (
      <Carte espacement="large">
        <RaccourcisPeriode precedent={() => changer({ annee: annee - 1 })} suivant={() => changer({ annee: annee + 1 })} />
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-titre text-encre">Année {annee}</h2>
            <p className="mt-1 text-texte-sm text-gris">Revenus, dépenses et épargne des douze mois, le réel à date et le projeté séparés.</p>
          </div>
          <div className="flex items-center gap-2">
            {anneeCourante !== null && anneeCourante !== annee && (
              <Bouton variante="puce" taille="sm" onClick={() => changer({ annee: anneeCourante })}>
                Cette année
              </Bouton>
            )}
            <div className="flex items-center gap-1 rounded-pilule bg-teinte p-1">
              <button type="button" aria-label={`Année ${annee - 1}`} onClick={() => changer({ annee: annee - 1 })} className="grid h-8 w-8 place-items-center rounded-pilule text-gris hover:bg-white hover:text-encre">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[3.5rem] text-center text-texte font-semibold tabular-nums text-encre">{annee}</span>
              <button type="button" aria-label={`Année ${annee + 1}`} onClick={() => changer({ annee: annee + 1 })} className="grid h-8 w-8 place-items-center rounded-pilule text-gris hover:bg-white hover:text-encre">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Synthese donnees={donnees} />
        </div>
      </Carte>
    )
  }

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Année', chemin: '/annee' }, { libelle: vue.libelle }]} />
      </motion.div>
      <motion.div variants={elementApparition} className="-mt-2">
        <Onglets valeur={vue.valeur} onChange={(v) => changer({ vue: v })} onglets={VUES.map((v) => ({ valeur: v.valeur, libelle: v.libelle, contenu: contenu(v.valeur) }))} />
      </motion.div>
    </motion.div>
  )
}

/** Un total d'année : le grand chiffre, puis le réel à date et le projeté restant, jamais mélangés sans le dire. */
function CarteTotal({ titre, total, etat, couleur }: { titre: string; total: TotalAnnuel; etat: SuiviAnnuelDto['etat']; couleur: string }) {
  return (
    <div className="rounded-bouton bg-interne p-5 shadow-bouton">
      <p className="flex items-center gap-2 text-texte-sm text-gris">
        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: couleur }} aria-hidden />
        {titre}
      </p>
      <p className="mt-1 text-montant text-encre">
        <Montant valeur={total.total} anime />
      </p>
      <dl className="mt-3 flex flex-col gap-1 text-texte-sm">
        {etat !== 'future' && (
          <div className="flex justify-between gap-3">
            <dt className="text-gris">{etat === 'passee' ? 'Réel' : 'Réel à date'}</dt>
            <dd className="chiffres font-semibold text-encre">{formaterMontant(total.reel)}</dd>
          </div>
        )}
        {etat !== 'passee' && (
          <div className="flex justify-between gap-3">
            <dt className="text-gris">{etat === 'future' ? 'Projeté' : 'Projeté restant'}</dt>
            <dd className="chiffres italic text-encre-2">{formaterMontant(total.projete)}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function Synthese({ donnees }: { donnees: SuiviAnnuelDto }) {
  const etat = ETATS_ANNEE[donnees.etat]
  const toutAvant = donnees.sansDonnees === 12
  const nom = (cle: string) => formaterMois(cle, { majuscule: true })
  return (
    <div>
      <p
        role="status"
        className={cn('rounded-bouton px-4 py-3 text-texte-sm', donnees.etat === 'future' ? 'bg-info-fond text-info' : 'bg-interne text-gris')}
      >
        <span className="font-semibold">{etat.libelle}.</span> {etat.texte}
      </p>

      {toutAvant ? (
        <div className="mt-6 rounded-bouton bg-interne p-6 text-center shadow-bouton">
          <p className="text-texte font-medium text-encre">Pas de données avant ton inscription.</p>
          <p className="mt-1 text-texte-sm text-gris">Ton suivi commence avec ta première paie ou ton solde de départ.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <CarteTotal titre="Revenus" total={donnees.revenus} etat={donnees.etat} couleur="#3A74B8" />
            <CarteTotal titre="Dépenses" total={donnees.charges} etat={donnees.etat} couleur="#D08A2E" />
            <CarteTotal titre="Épargne" total={donnees.epargne} etat={donnees.etat} couleur="#9C4F8C" />
          </div>

          <section className="mt-8" aria-label="Mois par mois">
            <TitreSection titre="Mois par mois" sousTitre="Plein : réel. Hachuré : mois en cours (estimation) ou prévu." />
            <div className="mt-4">
              <GraphiqueAnnee points={pointsAnnee(donnees.mois)} libelle={`Revenus, dépenses et épargne de ${donnees.annee}, mois par mois`} />
            </div>
          </section>
        </>
      )}

      <section className="mt-8" aria-label="Les douze mois">
        <TitreSection titre="Les douze mois" sousTitre="Un clic ouvre le mois." />
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {donnees.mois.map((m) => {
            const avant = m.nature === 'avant'
            return (
              <li key={m.cle}>
                <Link
                  to={`/mois?mois=${m.cle}`}
                  aria-label={`Ouvrir ${nom(m.cle)}`}
                  className={cn(
                    'flex h-full flex-col gap-1 rounded-bouton border border-filet p-3.5 transition-colors hover:bg-interne focus-visible:outline-none focus-visible:shadow-focus',
                    avant ? 'bg-teinte/60 text-gris-icone' : 'bg-white',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn('text-texte font-semibold', avant ? 'text-gris' : 'text-encre')}>{nom(m.cle).replace(/ \d{4}$/, '')}</span>
                    <span className={cn('text-mention', m.nature === 'reel' ? 'text-positif' : 'text-gris')}>{NATURES_CARTE[m.nature].libelle}</span>
                  </span>
                  {avant ? (
                    <span className="text-mention">Pas de données avant ton inscription</span>
                  ) : (
                    <span className={cn('chiffres flex flex-col text-mention text-gris', m.nature !== 'reel' && 'italic')}>
                      <span>Revenus {formaterMontant(m.revenus)}</span>
                      <span>Dépenses {formaterMontant(m.charges)}</span>
                      <span>Épargne {formaterMontant(m.epargne)}</span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {!toutAvant && (
        <>
          <Separateur className="my-8" />
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <section aria-label="Mois les plus coûteux">
              <h3 className="text-titre text-encre">Mois les plus coûteux</h3>
              {donnees.couteux.length === 0 ? (
                <p className="mt-3 text-texte-sm text-gris">Aucun mois suivi cette année.</p>
              ) : (
                <ol className="mt-3 flex flex-col gap-2">
                  {donnees.couteux.map((c, i) => (
                    <li key={c.cle}>
                      <Link to={`/mois?mois=${c.cle}`} className="flex items-center justify-between gap-3 rounded-champ border border-filet bg-white px-3.5 py-2.5 hover:bg-interne">
                        <span className="flex items-center gap-3">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-teinte text-mention font-semibold text-encre-2">{i + 1}</span>
                          <span className="text-texte font-medium text-encre">{nom(c.cle)}</span>
                          {c.nature !== 'reel' && <span className="text-mention italic text-gris">{NATURES_CARTE[c.nature].libelle.toLowerCase()}</span>}
                        </span>
                        <span className={cn('chiffres font-semibold text-encre', c.nature !== 'reel' && 'italic')}>{formaterMontant(c.charges)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section aria-label="Part variable et épargne cumulée" className="flex flex-col gap-6">
              <div>
                <h3 className="text-titre text-encre">Part variable du revenu</h3>
                <p className="mt-2 text-texte-sm text-gris">{phrasePartVariable(donnees.partVariable)}</p>
                {donnees.partVariable.part !== null && <BarreProgression className="mt-3" valeur={donnees.partVariable.part} libelle={`Part variable : ${Math.round(donnees.partVariable.part * 100)} %`} />}
              </div>
              <div>
                <h3 className="text-titre text-encre">Épargne cumulée</h3>
                <p className="mt-2 text-texte-sm text-gris">
                  <span className="text-montant text-encre">
                    <Montant valeur={donnees.epargneCumulee} />
                  </span>{' '}
                  {donnees.etat === 'passee' ? 'mis de côté sur l’année.' : donnees.etat === 'future' ? 'prévus sur l’année (projection).' : 'sur l’année, réel à date puis prévu.'}
                </p>
              </div>
            </section>
          </div>
        </>
      )}

      <Separateur className="my-8" />
      <section aria-label="Objectifs sur l’année">
        <TitreSection titre="Objectifs sur l’année" sousTitre="Épargné au début, aujourd’hui, puis projeté en fin d’année (scénario réaliste)." />
        {donnees.objectifs.length === 0 ? (
          <div className="mt-4 rounded-bouton bg-interne p-5">
            <p className="text-texte font-medium text-encre">Aucun objectif à suivre cette année.</p>
            <Link to="/objectifs/nouveau" className="mt-2 inline-block text-texte-sm font-semibold text-lien hover:underline">
              Créer un objectif
            </Link>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {donnees.objectifs.map((o) => {
              const barre = barreObjectifAnnee(o)
              return (
                <li key={o.id}>
                  <Link to={`/objectifs/${o.id}`} className="block rounded-bouton border border-filet bg-white p-4 hover:bg-interne focus-visible:outline-none focus-visible:shadow-focus" aria-label={`Ouvrir l’objectif ${o.libelle}`}>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-texte font-semibold text-encre">{o.libelle}</span>
                      <span className="chiffres text-mention text-gris">Cible {formaterMontant(o.montantCible)}</span>
                    </span>
                    <BarreProgression className="mt-3" valeur={barre.reel} projection={barre.projection} libelle={`${o.libelle} : ${Math.round(barre.reel * 100)} % de la cible, ${Math.round((barre.reel + barre.projection) * 100)} % en fin d’année`} />
                    <span className="mt-2 block text-texte-sm text-gris">{phraseObjectifAnnee(o, donnees.etat)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
