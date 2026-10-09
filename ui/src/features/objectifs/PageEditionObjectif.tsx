import { formaterMois, formaterMontant, TYPES_OBJECTIF, type ObjectifDetailDto, type ObjectifsDto, type SaisieObjectif, type TypeObjectif } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeNature, BadgeRisque } from '../../components/Badges'
import { Bouton } from '../../components/Bouton'
import { Carte, Separateur } from '../../components/Carte'
import { Champ, ChampMontant } from '../../components/Champ'
import { FilAriane } from '../../components/FilAriane'
import { Montant } from '../../components/Montant'
import { Selection } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { useApercuObjectif, useEnregistrerObjectif, useObjectif, useObjectifs } from '../epargne/requetes'
import { lireMontant, versSaisie } from '../salaire/saisie'
import { moisSouhaitables, propositions, RISQUES_PHRASES, SCENARIOS_LIBELLES, texteEstimation, texteRegle, TYPES } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'

/** Valeur stabilisée après une courte pause de frappe : l'aperçu n'est pas recalculé à chaque touche. */
function useStable<T>(valeur: T, delai = 350): T {
  const [stable, setStable] = useState(valeur)
  useEffect(() => {
    const minuterie = setTimeout(() => setStable(valeur), delai)
    return () => clearTimeout(minuterie)
  }, [valeur, delai])
  return stable
}

/** Nouvel objectif ou modification (UX.md § 4.4) : formulaire à gauche, aperçu projeté à droite. */
export function PageEditionObjectif() {
  const { id } = useParams()
  const existant = useObjectif(id)
  const liste = useObjectifs()
  const titre = id ? 'Modifier l’objectif' : 'Nouvel objectif'

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Objectifs', chemin: '/objectifs' }, { libelle: titre }]} />
      </motion.div>
      {(id && existant.isPending) || liste.isPending ? (
        <div className={GRILLE} aria-label="Chargement">
          <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
          <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
        </div>
      ) : (
        <Edition
          key={id ?? 'nouveau'}
          titre={titre}
          existant={id ? existant.data : undefined}
          moisCourant={liste.data?.moisCourant ?? ''}
          fondsSecurite={liste.data?.fondsSecurite ?? null}
          regles={liste.data?.regles}
        />
      )}
    </motion.div>
  )
}

function Edition({
  titre,
  existant,
  moisCourant,
  fondsSecurite,
  regles,
}: {
  titre: string
  existant?: ObjectifDetailDto
  moisCourant: string
  fondsSecurite: { min: number; max: number; base: number } | null
  regles?: ObjectifsDto['regles']
}) {
  const navigate = useNavigate()
  const [parametres] = useSearchParams()
  const o = existant?.objectif
  const typeDemande = parametres.get('type') as TypeObjectif | null
  const typeInitial: TypeObjectif = o?.type ?? (typeDemande && TYPES_OBJECTIF.includes(typeDemande) ? typeDemande : 'autre')
  const enregistrer = useEnregistrerObjectif()

  const [type, setType] = useState<TypeObjectif>(typeInitial)
  const [libelle, setLibelle] = useState(o?.libelle ?? TYPES[typeInitial].exemple)
  const [cible, setCible] = useState(o ? versSaisie(o.montantCible) : typeInitial === 'securite' && fondsSecurite ? versSaisie(fondsSecurite.min) : '')
  const [initial, setInitial] = useState(o ? versSaisie(o.montantInitial) : '')
  const [dateCible, setDateCible] = useState(o?.dateCible ?? '')
  const [versement, setVersement] = useState(o?.versementMensuel ? versSaisie(o.versementMensuel) : '')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  const lus = { cible: lireMontant(cible), initial: initial.trim() ? lireMontant(initial, 0) : { valeur: 0 }, versement: versement.trim() ? lireMontant(versement) : null }
  const saisie: SaisieObjectif | null =
    libelle.trim() && 'valeur' in lus.cible && 'valeur' in lus.initial && (lus.versement === null || 'valeur' in lus.versement) && lus.initial.valeur <= lus.cible.valeur
      ? {
          libelle: libelle.trim(),
          type,
          montantCible: lus.cible.valeur,
          montantInitial: lus.initial.valeur,
          dateCible: dateCible || null,
          versementMensuel: lus.versement && 'valeur' in lus.versement ? lus.versement.valeur : null,
        }
      : null
  // Comparée sous forme de texte : un nouvel objet à chaque rendu ne relance pas l'aperçu.
  const saisieStable = useStable(JSON.stringify(saisie))
  const apercu = useApercuObjectif(JSON.parse(saisieStable) as SaisieObjectif | null, o?.id)
  const mois = useMemo(() => {
    const liste = moisSouhaitables(moisCourant)
    return o?.dateCible && !liste.includes(o.dateCible) ? [o.dateCible, ...liste] : liste
  }, [moisCourant, o?.dateCible])

  function choisirType(t: TypeObjectif) {
    // Le nom suit le type tant que l'utilisateur ne l'a pas changé.
    if (!libelle.trim() || libelle === TYPES[type].exemple) setLibelle(TYPES[t].exemple)
    if (t === 'securite' && fondsSecurite && !cible.trim()) setCible(versSaisie(fondsSecurite.min))
    setType(t)
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const p: Record<string, string> = {}
    if (!libelle.trim()) p.libelle = 'Nom obligatoire.'
    if ('erreur' in lus.cible) p.montantCible = lus.cible.erreur
    if ('erreur' in lus.initial) p.montantInitial = lus.initial.erreur
    else if ('valeur' in lus.cible && lus.initial.valeur > lus.cible.valeur) p.montantInitial = 'Déjà plus que la cible.'
    if (lus.versement && 'erreur' in lus.versement) p.versementMensuel = lus.versement.erreur
    setErreurs(p)
    if (Object.keys(p).length > 0 || !saisie) return
    try {
      const { id } = await enregistrer.mutateAsync({ ...saisie, id: o?.id })
      toast(o ? `« ${saisie.libelle} » modifié.` : `Objectif « ${saisie.libelle} » créé.`)
      navigate(`/objectifs/${id}`)
    } catch (erreur) {
      setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' })
    }
  }

  const projection = saisie ? apercu.data?.objectif : undefined

  return (
    <div className={GRILLE}>
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <h1 className="text-titre text-encre">{titre}</h1>
          <p className="mt-1 text-texte text-gris">Le type ne sert qu’à l’icône et aux suggestions.</p>
          <form onSubmit={soumettre} noValidate className="mt-7 flex flex-col gap-6">
            <fieldset>
              <legend className="mb-2 text-texte-sm text-gris">Type</legend>
              <div role="radiogroup" aria-label="Type" className="flex flex-wrap gap-2">
                {TYPES_OBJECTIF.map((t) => {
                  const { Icone, libelle: nom } = TYPES[t]
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={type === t}
                      onClick={() => choisirType(t)}
                      className={cn(
                        'inline-flex h-9 items-center gap-2 rounded-pilule px-4 text-texte-sm font-medium shadow-bouton transition-colors',
                        type === t ? 'bg-lien text-white' : 'bg-white text-encre hover:bg-teinte',
                      )}
                    >
                      <Icone className="h-4 w-4" aria-hidden />
                      {nom}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <Champ libelle="Nom" placeholder="Moto, voyage…" value={libelle} onChange={(e) => setLibelle(e.target.value)} erreur={erreurs.libelle} maxLength={60} />
              <ChampMontant libelle="Montant cible" value={cible} onChange={(e) => setCible(e.target.value)} erreur={erreurs.montantCible} />
              <ChampMontant
                libelle="Déjà mis de côté (facultatif)"
                value={initial}
                onChange={(e) => setInitial(e.target.value)}
                erreur={erreurs.montantInitial}
                aide="Compris dans ton épargne déclarée : il est réservé à cet objectif."
              />
              <Selection libelle="Date souhaitée (facultatif)" value={dateCible} onChange={(e) => setDateCible(e.target.value)}>
                <option value="">Sans date</option>
                {mois.map((m) => (
                  <option key={m} value={m}>
                    {formaterMois(m, { majuscule: true })}
                  </option>
                ))}
              </Selection>
              <ChampMontant
                libelle="Versement mensuel (facultatif)"
                value={versement}
                onChange={(e) => setVersement(e.target.value)}
                erreur={erreurs.versementMensuel}
                aide="Versé en premier chaque mois. Sans versement, l’objectif reçoit ce qui reste selon sa priorité."
              />
            </div>
            {type === 'securite' && fondsSecurite && (
              <div className="rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2">
                <p>
                  Tes charges essentielles font {formaterMontant(fondsSecurite.base)} par mois. Cible proposée : 3 à 6 mois.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { libelle: '3 mois', valeur: fondsSecurite.min },
                    { libelle: '6 mois', valeur: fondsSecurite.max },
                  ].map((p) => (
                    <Bouton key={p.libelle} type="button" variante="puce" taille="sm" onClick={() => setCible(versSaisie(p.valeur))}>
                      {p.libelle} : {formaterMontant(p.valeur)}
                    </Bouton>
                  ))}
                </div>
              </div>
            )}
            {erreurs._ && (
              <p role="alert" className="text-texte-sm font-medium text-alerte">
                {erreurs._}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Bouton type="submit" taille="md" chargement={enregistrer.isPending}>
                {o ? 'Enregistrer les changements' : 'Créer l’objectif'}
              </Bouton>
              <Bouton type="button" variante="blanc" taille="md" onClick={() => navigate(o ? `/objectifs/${o.id}` : '/objectifs')}>
                Annuler
              </Bouton>
            </div>
          </form>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <Carte titre="Aperçu" precision="(projection)">
          {!projection ? (
            <p className="text-texte-sm text-gris">Indique un nom et un montant cible : la date estimée s’affiche ici.</p>
          ) : (
            <div aria-live="polite" className={cn(apercu.isFetching && 'opacity-60 transition-opacity')}>
              <dl className="flex flex-col gap-3">
                {(['prudent', 'realiste', 'ambitieux'] as const).map((s) => (
                  <div key={s} className="flex items-baseline justify-between gap-3">
                    <dt className="text-texte-sm text-gris" title={regles ? texteRegle(regles[s]) : undefined}>
                      {SCENARIOS_LIBELLES[s]}
                    </dt>
                    <dd className={cn('text-texte', s === 'realiste' ? 'font-semibold text-encre' : 'italic text-encre-2')}>{texteEstimation(projection.estimations?.[s] ?? null)}</dd>
                  </div>
                ))}
              </dl>
              <Separateur className="my-5" />
              {projection.effortMensuel !== null && (
                <p className="text-texte text-encre">
                  Pour {formaterMois(projection.dateCible!)} : <Montant valeur={projection.effortMensuel} className="font-semibold" /> par mois, soit{' '}
                  <Montant valeur={projection.effortHebdo ?? 0} /> par semaine.
                </p>
              )}
              {projection.risque && (
                <div className="mt-4 flex flex-col gap-2">
                  <BadgeRisque risque={projection.risque} className="self-start" />
                  <p className="text-texte-sm text-gris">{RISQUES_PHRASES[projection.risque]}</p>
                </div>
              )}
              {propositions(projection).length > 0 && (
                <div className="mt-4 rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2">
                  <p className="font-semibold">Deux façons d’y arriver :</p>
                  <ul className="mt-1 list-disc pl-4">
                    {propositions(projection).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-4 flex items-center gap-2 text-mention text-gris">
                <BadgeNature nature="projete" /> Si tes revenus et tes charges restent conformes au plan.
              </p>
            </div>
          )}
        </Carte>
      </motion.div>
    </div>
  )
}
