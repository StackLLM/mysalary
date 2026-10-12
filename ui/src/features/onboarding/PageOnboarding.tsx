import { formaterDate, formaterMois, formaterMontant, type ImportDto, type OnboardingDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { FileUp, Sprout } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte, Separateur } from '../../components/Carte'
import { Confirmation } from '../../components/Confirmation'
import { Montant } from '../../components/Montant'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { useObjectifs } from '../epargne/requetes'
import { useBilan } from '../mois/requetes'
import { useContrats, useMoisCourant } from '../salaire/requetes'
import { EtapeChargesFixes, EtapeDettes, EtapeEnveloppes, EtapeEpargne, EtapeObjectif, EtapePrimes, EtapeSalaire, type ProprietesEtape } from './EtapesPlan'
import { CarteLigneImport } from './LigneImport'
import { useApercuImport, useEnregistrerEtape, useOnboarding, useSupprimerImport } from './requetes'
import { ETAPE_FINALE, ETAPES, etapeDeReprise, GROUPES_IMPORT, lignesDe, NOMS_NON_IMPORTES, progression } from './saisie'

/**
 * Onboarding (ux-ui.md (UX) § 4.1, § 5.1) : une première vue utile en moins de 5 minutes, en dix étapes que l'on peut passer.
 * Chaque étape écrit dans le plan avec les formulaires de Mon plan ; l'étape atteinte est sauvegardée par compte,
 * et revenir en arrière ne perd rien. Les valeurs importées restent « à confirmer » jusqu'à leur étape.
 */
export function PageOnboarding() {
  const onboarding = useOnboarding()
  const mois = useMoisCourant()
  const naviguer = useNavigate()
  const enregistrer = useEnregistrerEtape()
  const [etape, setEtape] = useState<number | null>(null)
  const [quitter, setQuitter] = useState(false)

  // Reprise : l'étape sauvegardée, lue une seule fois.
  useEffect(() => {
    if (etape === null && onboarding.data) setEtape(etapeDeReprise(onboarding.data.etape))
  }, [etape, onboarding.data])

  if (onboarding.isError || mois.isError) {
    return (
      <Carte espacement="large" className="mx-auto max-w-2xl">
        <div className="rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de charger la mise en route.</p>
          <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => [onboarding, mois].forEach((q) => void q.refetch())}>
            Réessayer
          </Bouton>
        </div>
      </Carte>
    )
  }
  if (!onboarding.data || !mois.data || etape === null) return <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-carte bg-white shadow-carte" aria-label="Chargement de la mise en route" />

  const donnees = onboarding.data
  const aujourdhui = mois.data.aujourdhui
  const aller = (n: number) => {
    const suite = Math.min(ETAPE_FINALE, Math.max(1, n))
    setEtape(suite)
    // Sauvegarde à chaque étape ; un échec n'empêche pas d'avancer, la saisie est déjà dans le plan.
    enregistrer.mutate({ etape: suite }, { onError: () => toast('Cette étape n’a pas pu être sauvegardée. Tu pourras la reprendre ici.') })
  }
  async function terminer() {
    try {
      await enregistrer.mutateAsync({ etape: ETAPE_FINALE, termine: true })
      toast('Ta mise en route est terminée.')
      naviguer('/')
    } catch {
      toast('Impossible de terminer pour l’instant. Réessaie.')
    }
  }

  const proprietes: ProprietesEtape = { onboarding: donnees, aujourdhui, moisCourant: mois.data.cle, aller }
  const courante = ETAPES[etape - 1]!

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible" className="mx-auto max-w-3xl">
      <motion.div variants={elementApparition}>
        <Carte espacement="large">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-texte-sm font-semibold text-encre">
              Étape {etape} sur {ETAPE_FINALE} <span className="font-normal text-gris">· {courante.nom}</span>
            </p>
            <button type="button" onClick={() => setQuitter(true)} className="text-texte-sm font-medium text-lien hover:underline">
              Reprendre plus tard
            </button>
          </div>
          <div role="progressbar" aria-label={`Étape ${etape} sur ${ETAPE_FINALE}`} aria-valuemin={1} aria-valuemax={ETAPE_FINALE} aria-valuenow={etape} className="mt-3 h-1.5 w-full overflow-hidden rounded-pilule bg-sauge-100">
            <motion.div className="h-full rounded-pilule bg-sauge" initial={false} animate={{ width: `${progression(etape) * 100}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
          </div>
          <ol className="sr-only" aria-label="Les étapes">
            {ETAPES.map((e) => (
              <li key={e.n} aria-current={e.n === etape ? 'step' : undefined}>
                {e.n}. {e.nom}
              </li>
            ))}
          </ol>

          <div className="mt-7" key={etape}>
            {etape === 1 && <EtapeBienvenue aller={aller} />}
            {etape === 2 && <EtapeImport importe={donnees.import} />}
            {etape === 3 && <EtapeSalaire {...proprietes} />}
            {etape === 4 && <EtapePrimes {...proprietes} />}
            {etape === 5 && <EtapeChargesFixes {...proprietes} />}
            {etape === 6 && <EtapeEnveloppes {...proprietes} />}
            {etape === 7 && <EtapeDettes {...proprietes} />}
            {etape === 8 && <EtapeEpargne {...proprietes} />}
            {etape === 9 && <EtapeObjectif {...proprietes} />}
            {etape === 10 && <EtapeResume aller={aller} cle={mois.data.cle} />}
          </div>

          {etape > 1 && (
            <>
              <Separateur className="my-7" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Bouton variante="contour" taille="md" onClick={() => aller(etape - 1)}>
                  Retour
                </Bouton>
                {etape < ETAPE_FINALE ? (
                  <Bouton variante="teinte" taille="md" onClick={() => aller(etape + 1)}>
                    {etape === 2 && !donnees.import ? 'Continuer sans importer' : 'Suivant'}
                  </Bouton>
                ) : (
                  <Bouton taille="md" chargement={enregistrer.isPending} onClick={() => void terminer()}>
                    Terminer et ouvrir Aujourd’hui
                  </Bouton>
                )}
              </div>
              {etape >= 3 && etape < ETAPE_FINALE && <p className="mt-3 text-right text-mention text-gris">Tu peux passer cette étape et la compléter plus tard dans Mon plan.</p>}
            </>
          )}
        </Carte>
      </motion.div>

      <Confirmation
        ouvert={quitter}
        onFermer={() => setQuitter(false)}
        titre="Reprendre plus tard ?"
        description="Ce que tu as saisi est enregistré. Tu pourras reprendre à l’étape où tu t’arrêtes depuis la page Aujourd’hui."
        libelleConfirmer="Aller à Aujourd’hui"
        ton="principal"
        onConfirmer={() => naviguer('/')}
      />
    </motion.div>
  )
}

function EtapeBienvenue({ aller }: { aller: (n: number) => void }) {
  return (
    <div>
      <h1 className="text-titre text-encre">Bienvenue dans MySalary.</h1>
      <p className="mt-2 max-w-xl text-texte text-gris">MySalary sépare toujours le réel, le prévu et les projections. En quelques minutes, tu auras une première vue claire de ton mois. Chaque étape peut être passée et complétée plus tard.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => aller(3)} className="flex flex-col gap-2 rounded-bouton border border-filet bg-white p-5 text-left transition-colors hover:bg-interne focus-visible:outline-none focus-visible:shadow-focus">
          <Sprout className="h-6 w-6 text-primaire" aria-hidden />
          <span className="text-texte font-semibold text-encre">Partir de zéro</span>
          <span className="text-texte-sm text-gris">Tu saisis ton salaire, tes charges et ton premier objectif.</span>
        </button>
        <button type="button" onClick={() => aller(2)} className="flex flex-col gap-2 rounded-bouton border border-filet bg-white p-5 text-left transition-colors hover:bg-interne focus-visible:outline-none focus-visible:shadow-focus">
          <FileUp className="h-6 w-6 text-primaire" aria-hidden />
          <span className="text-texte font-semibold text-encre">Importer mon ancien fichier</span>
          <span className="text-texte-sm text-gris">Tu déposes ton export money-guru : MySalary propose, tu décides ligne par ligne.</span>
        </button>
      </div>
    </div>
  )
}

/** Étape 2 : dépôt du fichier, puis aperçu groupé par thème. Rien n'est créé : les lignes importées se confirment à leur étape. */
function EtapeImport({ importe }: { importe: ImportDto | null }) {
  const apercu = useApercuImport()
  const supprimer = useSupprimerImport()
  const champ = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string>()
  const [survol, setSurvol] = useState(false)

  async function lire(fichier: File | undefined) {
    if (!fichier) return
    setErreur(undefined)
    try {
      await apercu.mutateAsync(JSON.parse(await fichier.text()))
    } catch (e) {
      setErreur(e instanceof ErreurApi ? e.message : e instanceof SyntaxError ? 'Ce fichier n’est pas un fichier JSON lisible.' : 'Impossible de lire ce fichier. Réessaie.')
    } finally {
      if (champ.current) champ.current.value = ''
    }
  }
  const deposer = (e: DragEvent) => {
    e.preventDefault()
    setSurvol(false)
    void lire(e.dataTransfer.files[0])
  }

  if (!importe) {
    return (
      <div>
        <h2 className="text-titre text-encre">Importer ton ancien fichier</h2>
        <p className="mt-1 max-w-2xl text-texte-sm text-gris">Dépose l’export JSON de money-guru. Tu verras ce qu’il contient, ligne par ligne, avant que quoi que ce soit n’entre dans ton plan. Tout ce qui est importé reste du prévu, jamais du réel.</p>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setSurvol(true)
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={deposer}
          className={cn('mt-5 flex flex-col items-center gap-3 rounded-bouton border-2 border-dashed p-8 text-center transition-colors', survol ? 'border-primaire bg-teinte' : 'border-filet-fort bg-interne')}
        >
          <FileUp className="h-8 w-8 text-gris-icone" aria-hidden />
          <p className="text-texte text-encre">Glisse ton fichier ici</p>
          <label className="cursor-pointer">
            <span className="inline-flex h-10 items-center rounded-pilule bg-white px-5 text-texte-sm font-semibold text-encre shadow-bouton hover:bg-teinte">{apercu.isPending ? 'Lecture…' : 'Choisir un fichier'}</span>
            <input ref={champ} type="file" accept="application/json,.json" aria-label="Fichier à importer" className="sr-only" onChange={(e) => void lire(e.target.files?.[0])} />
          </label>
        </div>
        {erreur && (
          <p role="alert" className="mt-3 rounded-champ bg-alerte-fond p-3 text-texte-sm font-medium text-alerte">
            {erreur} Tu peux continuer sans importer.
          </p>
        )}
      </div>
    )
  }

  const importables = importe.lignes.filter((l) => l.importable)
  const decidees = importables.filter((l) => l.statut !== 'propose').length
  return (
    <div>
      <h2 className="text-titre text-encre">Ce que contient ton fichier</h2>
      <p className="mt-1 max-w-2xl text-texte-sm text-gris">
        Pour chaque ligne : <span className="font-semibold text-encre-2">Importer</span>, <span className="font-semibold text-encre-2">Modifier</span> ou <span className="font-semibold text-encre-2">Ignorer</span>. Les lignes importées arrivent pré-remplies aux étapes suivantes, marquées « importé · à confirmer ».
      </p>
      <p className="mt-3 text-texte-sm font-medium text-encre" role="status">
        {decidees} ligne{decidees > 1 ? 's' : ''} sur {importables.length} décidée{decidees > 1 ? 's' : ''}.
      </p>
      <div className="mt-4 flex flex-col gap-6">
        {GROUPES_IMPORT.map((g) => {
          const lignes = lignesDe(importe.lignes, [g.theme])
          if (lignes.length === 0) return null
          return (
            <section key={g.theme} aria-label={g.titre}>
              <h3 className="text-texte font-semibold text-encre">{g.titre}</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {lignes.map((l) => (
                  <CarteLigneImport key={l.id} ligne={l} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      {importe.nonImportes.length > 0 && (
        <p className="mt-6 rounded-champ bg-interne p-3 text-texte-sm text-gris">
          <span className="font-semibold text-encre-2">Non repris :</span> {importe.nonImportes.map((k) => NOMS_NON_IMPORTES[k] ?? k).join(', ')}. Ces éléments restent dans le fichier archivé.
        </p>
      )}
      <Bouton variante="contour" taille="sm" className="mt-5" disabled={supprimer.isPending} onClick={() => supprimer.mutate()}>
        Recommencer avec un autre fichier
      </Bouton>
    </div>
  )
}

/** Étape 10 : « je vois clair ». Prévu et projection sont nommés ; rien d'inventé. */
function EtapeResume({ aller, cle }: { aller: (n: number) => void; cle: string }) {
  const contrats = useContrats()
  const bilan = useBilan(cle)
  const objectifs = useObjectifs()

  if (contrats.isPending || bilan.isPending || objectifs.isPending) return <div className="h-64 animate-pulse rounded-bouton bg-interne" aria-label="Chargement du résumé" />
  if (contrats.isError || bilan.isError || objectifs.isError) {
    return <p className="rounded-bouton bg-alerte-fond p-4 text-texte font-medium text-alerte">Impossible de charger le résumé. Reviens en arrière puis réessaie.</p>
  }
  if ((contrats.data ?? []).length === 0) {
    return (
      <div className="rounded-bouton bg-interne p-6 text-center">
        <p className="text-texte font-medium text-encre">Ajoute ton salaire pour voir ton résumé.</p>
        <p className="mt-1 text-texte-sm text-gris">Le mois budgétaire en cours dépend de ta paie.</p>
        <Bouton variante="teinte" taille="md" className="mt-4" onClick={() => aller(3)}>
          Aller à l’étape Salaire
        </Bouton>
      </div>
    )
  }
  const { mois, totaux } = bilan.data
  const premier = objectifs.data.objectifs.find((o) => o.statut === 'actif')
  const estimation = premier?.estimations?.realiste
  return (
    <div>
      <h2 className="text-titre text-encre">Voilà ta situation</h2>
      <p className="mt-1 text-texte-sm text-gris">Tout ce qui suit est prévu ou projeté : ton réel se construit au fil des paies et des dépenses que tu notes.</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-bouton bg-interne p-4 shadow-bouton sm:col-span-2">
          <dt className="text-texte-sm text-gris">Mois budgétaire en cours</dt>
          <dd className="text-texte font-semibold text-encre">
            {formaterMois(mois.cle, { majuscule: true })} · du {formaterDate(mois.debut, 'long')} au {formaterDate(mois.fin, 'long')}
          </dd>
        </div>
        <div className="rounded-bouton bg-interne p-4 shadow-bouton">
          <dt className="flex items-center gap-2 text-texte-sm text-gris">
            Revenu prévu <span className="text-mention">prévu</span>
          </dt>
          <dd className="chiffres text-montant text-encre">
            <Montant valeur={totaux.revenusPrevus} />
          </dd>
        </div>
        <div className="rounded-bouton bg-interne p-4 shadow-bouton">
          <dt className="flex items-center gap-2 text-texte-sm text-gris">
            Charges prévues <span className="text-mention">prévu</span>
          </dt>
          <dd className="chiffres text-montant text-encre">
            <Montant valeur={totaux.chargesPrevues} />
          </dd>
        </div>
        <div className="rounded-bouton bg-interne p-4 shadow-bouton">
          <dt className="flex items-center gap-2 text-texte-sm text-gris">
            Capacité d’épargne <span className="text-mention italic">projection · réaliste</span>
          </dt>
          <dd className="chiffres text-montant italic text-encre-2">{formaterMontant(Math.max(0, objectifs.data.capacite.realiste))}</dd>
        </div>
        <div className="rounded-bouton bg-interne p-4 shadow-bouton">
          <dt className="flex items-center gap-2 text-texte-sm text-gris">
            Date estimée de ton premier objectif <span className="text-mention italic">projection · réaliste</span>
          </dt>
          <dd className="text-texte font-semibold italic text-encre-2">
            {premier ? (estimation ? `${premier.libelle} : ${formaterMois(estimation, { majuscule: true })}` : `${premier.libelle} : au-delà de 10 ans`) : 'Pas encore d’objectif'}
          </dd>
        </div>
      </dl>
      {!premier && (
        <p className="mt-3 text-texte-sm text-gris">
          Tu n’as pas encore d’objectif : <button type="button" className="font-semibold text-lien hover:underline" onClick={() => aller(9)}>en créer un</button>, ou le faire plus tard dans <Link to="/objectifs" className="font-semibold text-lien hover:underline">Objectifs</Link>.
        </p>
      )}
    </div>
  )
}

export type { OnboardingDto }
