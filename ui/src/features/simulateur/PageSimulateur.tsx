import { formaterMois, formaterMontant, HORIZONS, type ObjectifSimule, type SaisieExecution, type SimulationDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeNature, BadgeRisque } from '../../components/Badges'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Champ, ChampMontant } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { Identite } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { GraphiqueSimulation } from '../../components/graphiques/GraphiqueSimulation'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { Choix, Selection } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { useCharges } from '../charges/requetes'
import { moisSouhaitables, SCENARIOS_LIBELLES, texteEstimation, texteRegle } from '../objectifs/saisie'
import { useAppliquer, useEnregistrerScenario, useScenarios, useSimulation, useSupprimerScenario } from './requetes'
import { aDesLeviers, depuisScenario, moisCourt, LEVIERS_VIDES, pointsSimulation, resumeLeviers, texteAlerte, texteGain, versAjustements, type Leviers } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'
const SCENARIOS = ['prudent', 'realiste', 'ambitieux'] as const
type Question = 'quand' | 'combien' | 'prime'

const QUESTIONS: { valeur: Question; libelle: string }[] = [
  { valeur: 'quand', libelle: 'Si j’épargne X par mois, quand ?' },
  { valeur: 'combien', libelle: 'Combien par mois pour la date ?' },
  { valeur: 'prime', libelle: 'Impact d’une prime ?' },
]

/** Valeur stabilisée après une courte pause de frappe : la simulation n'est pas relancée à chaque touche. */
function useStable(valeur: string, delai = 350): string {
  const [stable, setStable] = useState(valeur)
  useEffect(() => {
    const minuterie = setTimeout(() => setStable(valeur), delai)
    return () => clearTimeout(minuterie)
  }, [valeur, delai])
  return stable
}

/** Simulateur (UX.md § 4.5, § 5.9) : des leviers « et si », sans rien enregistrer tant qu'on n'applique pas. */
export function PageSimulateur() {
  const [parametres] = useSearchParams()
  const [leviers, setLeviers] = useState<Leviers>({ ...LEVIERS_VIDES, objectifId: parametres.get('objectif') ?? '' })
  const { ajustements, erreurs } = versAjustements(leviers)
  const saisie: SaisieExecution = { ajustements, horizon: leviers.horizon }
  const stable = useStable(JSON.stringify(saisie))
  const simulation = useSimulation(useMemo(() => JSON.parse(stable) as SaisieExecution, [stable]))

  // Sans objectif choisi : le premier en cours.
  const premier = simulation.data?.objectifs[0]?.id
  useEffect(() => {
    if (!leviers.objectifId && premier) setLeviers((l) => ({ ...l, objectifId: premier }))
  }, [premier, leviers.objectifId])

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Objectifs', chemin: '/objectifs' }, { libelle: 'Simulateur' }]} />
      </motion.div>
      {simulation.isError ? (
        <Carte espacement="large">
          <div className="rounded-bouton bg-alerte-fond p-5">
            <p className="text-texte font-medium text-alerte">Impossible de lancer la simulation.</p>
            <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void simulation.refetch()}>
              Réessayer
            </Bouton>
          </div>
        </Carte>
      ) : !simulation.data ? (
        <div className={GRILLE} aria-label="Chargement du simulateur">
          <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
          <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
        </div>
      ) : (
        <Simulateur simulation={simulation.data} enCours={simulation.isFetching} leviers={leviers} setLeviers={setLeviers} erreurs={erreurs} />
      )}
    </motion.div>
  )
}

function Simulateur({
  simulation: s,
  enCours,
  leviers,
  setLeviers,
  erreurs,
}: {
  simulation: SimulationDto
  enCours: boolean
  leviers: Leviers
  setLeviers: (l: Leviers | ((l: Leviers) => Leviers)) => void
  erreurs: Record<string, string>
}) {
  const charges = useCharges()
  const scenarios = useScenarios()
  const appliquer = useAppliquer()
  const enregistrer = useEnregistrerScenario()
  const supprimer = useSupprimerScenario()
  const [question, setQuestion] = useState<Question | null>(null)
  const [demande, setDemande] = useState<'appliquer' | 'enregistrer' | null>(null)
  const [nom, setNom] = useState('')

  const changer = (modif: Partial<Leviers>) => setLeviers((l) => ({ ...l, ...modif }))
  const { ajustements } = versAjustements(leviers)
  const choisi = s.objectifs.find((o) => o.id === leviers.objectifId) ?? null
  const reductibles = (charges.data ?? []).filter((c) => c.active && (c.nature === 'fixe' || c.nature === 'enveloppe'))
  const noms = { objectifs: new Map(s.objectifs.map((o) => [o.id, o.libelle])), charges: new Map(reductibles.map((c) => [c.id, c.libelle])) }
  const fin = (sc: (typeof SCENARIOS)[number]) => s.series[sc].at(-1)
  const graphique = pointsSimulation(s)
  const mois = moisSouhaitables(s.moisCourant)
  const leviersActifs = aDesLeviers(ajustements)

  return (
    <div className={GRILLE}>
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large" className={cn(enCours && 'transition-opacity [&_figure]:opacity-70')}>
          <div className="flex flex-col justify-between gap-5 sm:flex-row">
            <Identite initiale="S" nom="Simulateur" detail={leviersActifs ? 'Leviers en cours d’essai' : 'Ton plan actuel, sans levier'} />
            <div className="flex flex-col gap-1 text-texte text-gris sm:items-end sm:text-right">
              <span>Rien n’est enregistré</span>
              <span>tant que tu n’appliques pas</span>
            </div>
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Épargne aujourd’hui',
              lignes: [{ valeur: <Montant valeur={s.epargneActuelle} /> }, { libelle: 'Horizon', valeur: `${s.horizon} mois` }],
            }}
            droite={{
              titre: `Dans ${s.horizon} mois (projection)`,
              lignes: [
                { valeur: <Montant valeur={fin('realiste')?.epargne ?? 0} /> },
                { libelle: 'Prudent', valeur: <Montant valeur={fin('prudent')?.epargne ?? 0} /> },
                { libelle: 'Ambitieux', valeur: <Montant valeur={fin('ambitieux')?.epargne ?? 0} /> },
              ],
            }}
          />

          {s.horizonLong && <p className="mt-5 rounded-champ bg-attention-fond px-4 py-3 text-texte-sm text-attention">Plus l’horizon est long, plus la projection est incertaine.</p>}
          {s.alertes.length > 0 && (
            <ul role="alert" className="mt-5 flex flex-col gap-1 rounded-champ bg-alerte-fond px-4 py-3 text-texte-sm text-alerte">
              {s.alertes.slice(0, 3).map((a) => (
                <li key={`${a.type}-${a.mois}`}>{texteAlerte(a)}</li>
              ))}
            </ul>
          )}

          <section className="mt-8">
            <TitreSection titre="Questions prêtes" sousTitre="Choisis une question : les leviers à régler s’ouvrent à droite." />
            <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Questions prêtes">
              {QUESTIONS.map((q) => (
                <button
                  key={q.valeur}
                  type="button"
                  role="radio"
                  aria-checked={question === q.valeur}
                  onClick={() => setQuestion(q.valeur)}
                  className={cn('h-9 rounded-pilule px-4 text-texte-sm font-medium shadow-bouton transition-colors', question === q.valeur ? 'bg-lien text-white' : 'bg-white text-encre hover:bg-teinte')}
                >
                  {q.libelle}
                </button>
              ))}
            </div>
            {question && <Reponse question={question} objectif={choisi} leviers={leviers} objectifs={s.objectifs} />}
          </section>

          <section className="mt-8">
            <TitreSection
              titre="Trois scénarios"
              sousTitre={
                <>
                  Les mêmes leviers, trois hypothèses de revenus : <span className="font-semibold text-encre-2">projection</span>, jamais une garantie.
                </>
              }
            />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {SCENARIOS.map((sc) => (
                <div key={sc} className={cn('rounded-bouton border p-4', sc === 'realiste' ? 'border-primaire bg-teinte' : 'border-filet bg-white')}>
                  <p className="text-texte font-semibold text-encre">{SCENARIOS_LIBELLES[sc]}</p>
                  <p className="mt-1 text-mention text-gris">{texteRegle(s.regles[sc])}</p>
                  <p className="mt-3 text-texte-sm text-gris">Épargne dans {s.horizon} mois</p>
                  <Montant valeur={fin(sc)?.epargne ?? 0} className="text-titre text-encre" />
                  {choisi && (
                    <p className="mt-2 text-texte-sm text-gris">
                      {choisi.libelle} : <span className="font-medium italic text-encre-2">{texteEstimation(choisi.simule?.[sc] ?? null)}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-titre text-encre">Épargne projetée</h3>
              <BadgeNature nature="projete" />
            </div>
            <GraphiqueSimulation points={graphique.points} aujourdhui={graphique.aujourdhui} libelle={`Épargne réelle puis projetée sur ${s.horizon} mois, par scénario`} />
          </section>

          <Separateur className="my-7" />

          <section>
            <TitreSection titre="Objectifs" sousTitre="Date estimée sans les leviers, puis avec." />
            {s.objectifs.length === 0 ? (
              <p className="mt-5 text-texte-sm text-gris">
                Aucun objectif : le simulateur montre l’épargne cumulée seule.{' '}
                <Link to="/objectifs/nouveau" className="font-medium text-lien hover:underline">
                  Créer un objectif
                </Link>
              </p>
            ) : (
              <ul className="mt-5 flex flex-col gap-3" aria-label="Objectifs simulés">
                {s.objectifs.map((o) => (
                  <li key={o.id} className="rounded-bouton border border-filet bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link to={`/objectifs/${o.id}`} className="text-texte font-semibold text-encre hover:text-lien">
                        {o.libelle}
                      </Link>
                      {o.risque && <BadgeRisque risque={o.risque} />}
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-texte-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-gris">Sans leviers</dt>
                        <dd className="italic text-encre-2">{texteEstimation(o.base?.realiste ?? null)}</dd>
                      </div>
                      <div>
                        <dt className="text-gris">Avec leviers</dt>
                        <dd className="font-semibold italic text-encre">{texteEstimation(o.simule?.realiste ?? null)}</dd>
                      </div>
                      <div>
                        <dt className="text-gris">Écart (réaliste)</dt>
                        <dd className={cn('font-medium', (o.gainMois?.realiste ?? 0) > 0 ? 'text-positif' : (o.gainMois?.realiste ?? 0) < 0 ? 'text-alerte' : 'text-encre-2')}>
                          {texteGain(o.gainMois?.realiste ?? null)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gris">Souhaité</dt>
                        <dd className="text-encre-2">{o.dateCible ? formaterMois(o.dateCible) : 'sans date'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-7 flex flex-wrap gap-3">
            <Bouton onClick={() => setDemande('appliquer')} disabled={!leviersActifs}>
              Appliquer au plan
            </Bouton>
            <Bouton variante="blanc" onClick={() => setDemande('enregistrer')} disabled={!leviersActifs}>
              Enregistrer comme scénario
            </Bouton>
            <Bouton variante="contour" onClick={() => setLeviers({ ...LEVIERS_VIDES, objectifId: leviers.objectifId })} disabled={!leviersActifs && leviers.horizon === 12}>
              Réinitialiser
            </Bouton>
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <Carte titre="Leviers">
          <div className="flex flex-col gap-5">
            {s.objectifs.length > 0 && (
              <>
                <Selection libelle="Objectif" value={leviers.objectifId} onChange={(e) => changer({ objectifId: e.target.value, versement: '', dateCible: '' })}>
                  {s.objectifs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.libelle}
                    </option>
                  ))}
                </Selection>
                <ChampMontant
                  libelle="Versement mensuel"
                  placeholder={choisi?.versementMensuel ? String(choisi.versementMensuel / 100) : 'aucun'}
                  value={leviers.versement}
                  onChange={(e) => changer({ versement: e.target.value })}
                  erreur={erreurs.versement}
                  aide={choisi?.versementMensuel ? `Aujourd’hui : ${formaterMontant(choisi.versementMensuel)} par mois.` : 'Aujourd’hui : aucun versement choisi.'}
                />
                <Selection libelle="Date souhaitée" value={leviers.dateCible} onChange={(e) => changer({ dateCible: e.target.value })}>
                  <option value="">{choisi?.dateCible ? `Inchangée (${formaterMois(choisi.dateCible)})` : 'Inchangée (sans date)'}</option>
                  {mois.map((m) => (
                    <option key={m} value={m}>
                      {formaterMois(m, { majuscule: true })}
                    </option>
                  ))}
                </Selection>
                <Separateur />
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <ChampMontant libelle="Prime en plus" value={leviers.primeMontant} onChange={(e) => changer({ primeMontant: e.target.value, primeMois: leviers.primeMois || (mois[1] ?? '') })} erreur={erreurs.primeMontant} />
              <Selection libelle="Mois" value={leviers.primeMois} onChange={(e) => changer({ primeMois: e.target.value })}>
                <option value="">—</option>
                {mois.slice(0, 36).map((m) => (
                  <option key={m} value={m}>
                    {moisCourt(m)}
                  </option>
                ))}
              </Selection>
            </div>
            <Separateur />
            <Selection libelle="Réduire une charge" value={leviers.reductionChargeId} onChange={(e) => changer({ reductionChargeId: e.target.value })}>
              <option value="">Aucune</option>
              {reductibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle} ({formaterMontant(c.montant)})
                </option>
              ))}
            </Selection>
            {leviers.reductionChargeId && (
              <ChampMontant libelle="De combien par mois" value={leviers.reductionMontant} onChange={(e) => changer({ reductionMontant: e.target.value })} erreur={erreurs.reductionMontant} aide="À partir du mois prochain." />
            )}
            <Separateur />
            <Choix
              libelle="Horizon"
              valeur={String(leviers.horizon)}
              onChange={(v) => changer({ horizon: Number(v) })}
              options={HORIZONS.map((h) => ({ valeur: String(h), libelle: `${h} mois` }))}
            />
          </div>
        </Carte>

        <Carte titre="Scénarios enregistrés">
          {!scenarios.data || scenarios.data.length === 0 ? (
            <p className="text-texte-sm text-gris">Aucun scénario. Règle des leviers puis « Enregistrer comme scénario » pour le retrouver plus tard.</p>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Scénarios enregistrés">
              {scenarios.data.map((sc) => (
                <li key={sc.id} className="flex items-center justify-between gap-3">
                  <button type="button" className="min-w-0 truncate text-left text-texte font-medium text-encre hover:text-lien" onClick={() => setLeviers(depuisScenario(sc, leviers.objectifId))}>
                    {sc.nom}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 text-texte-sm text-gris hover:text-alerte"
                    aria-label={`Supprimer le scénario ${sc.nom}`}
                    onClick={() => supprimer.mutate(sc.id, { onSuccess: () => toast(`Scénario « ${sc.nom} » supprimé.`) })}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Carte>
        <Link to="/reglages" className={styleBouton({ variante: 'blanc', className: 'w-full' })}>
          Modifier les règles des scénarios
        </Link>
      </motion.div>

      <Confirmation
        ouvert={demande === 'appliquer'}
        onFermer={() => setDemande(null)}
        titre="Appliquer ces leviers au plan ?"
        description={
          <>
            <span className="block">Ces changements seront enregistrés dans ton plan :</span>
            <ul className="mt-2 list-disc pl-5">
              {resumeLeviers(ajustements, noms).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        }
        libelleConfirmer="Appliquer"
        ton="principal"
        chargement={appliquer.isPending}
        onConfirmer={() =>
          appliquer.mutate(ajustements, {
            onSuccess: ({ changements }) => {
              toast(`Plan mis à jour : ${changements.length} changement${changements.length > 1 ? 's' : ''}.`, { description: changements.join(' ') })
              setDemande(null)
              setLeviers({ ...LEVIERS_VIDES, objectifId: leviers.objectifId })
            },
            onError: (e) => toast(e instanceof ErreurApi ? e.message : 'Le plan n’a pas été modifié. Réessaie.'),
          })
        }
      />
      <Panneau ouvert={demande === 'enregistrer'} onFermer={() => setDemande(null)} titre="Enregistrer comme scénario" description="Les leviers sont gardés tels quels ; ton plan ne change pas.">
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!nom.trim()) return
            enregistrer.mutate(
              { nom: nom.trim(), ajustements, horizon: leviers.horizon },
              {
                onSuccess: () => {
                  toast(`Scénario « ${nom.trim()} » enregistré.`)
                  setNom('')
                  setDemande(null)
                },
                onError: (err) => toast(err instanceof ErreurApi ? err.message : 'Le scénario n’a pas été enregistré.'),
              },
            )
          }}
        >
          <Champ libelle="Nom du scénario" placeholder="Prime de mars sur la moto…" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} autoFocus />
          <Bouton type="submit" taille="lg" className="w-full" chargement={enregistrer.isPending} disabled={!nom.trim()}>
            Enregistrer
          </Bouton>
        </form>
      </Panneau>
    </div>
  )
}

/** Réponse à la question prête choisie, à partir de la simulation en cours. */
function Reponse({ question, objectif: o, leviers, objectifs }: { question: Question; objectif: ObjectifSimule | null; leviers: Leviers; objectifs: ObjectifSimule[] }) {
  const boite = 'mt-4 rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2'
  if (question !== 'prime' && !o) return <p className={boite}>Crée d’abord un objectif pour poser cette question.</p>
  if (question === 'quand') {
    return (
      <p className={boite} aria-live="polite">
        {leviers.versement ? (
          <>
            En versant <span className="font-semibold">{leviers.versement} DH</span> par mois, « {o!.libelle} » serait atteint en{' '}
            <span className="font-semibold">{texteEstimation(o!.simule?.realiste ?? null)}</span> (réaliste), au lieu de {texteEstimation(o!.base?.realiste ?? null)}.
          </>
        ) : (
          <>Indique un versement mensuel dans les leviers : la date estimée de « {o!.libelle} » s’affiche ici.</>
        )}
      </p>
    )
  }
  if (question === 'combien') {
    return (
      <p className={boite} aria-live="polite">
        {o!.effortMensuel !== null && o!.dateCible ? (
          <>
            Pour « {o!.libelle} » en <span className="font-semibold">{formaterMois(o!.dateCible)}</span> : <Montant valeur={o!.effortMensuel} className="font-semibold" /> par mois, soit{' '}
            <Montant valeur={o!.effortHebdo ?? 0} /> par semaine.
          </>
        ) : (
          <>Choisis une date souhaitée dans les leviers : l’effort mensuel nécessaire s’affiche ici.</>
        )}
      </p>
    )
  }
  return (
    <div className={boite} aria-live="polite">
      {leviers.primeMontant && leviers.primeMois ? (
        <>
          <p>
            Avec une prime de <span className="font-semibold">{leviers.primeMontant} DH</span> en {formaterMois(leviers.primeMois)} (réaliste) :
          </p>
          <ul className="mt-1 list-disc pl-5">
            {objectifs.map((x) => (
              <li key={x.id}>
                {x.libelle} : {texteGain(x.gainMois?.realiste ?? null)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Indique le montant et le mois d’une prime dans les leviers : l’effet sur chaque objectif s’affiche ici.</p>
      )}
    </div>
  )
}
