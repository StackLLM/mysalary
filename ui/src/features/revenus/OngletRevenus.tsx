import { formaterDate, formaterMois, type ResumeRevenusDto, type RevenuPrevu, type RevenuRecuDto, type SourceRevenuDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeNature } from '../../components/Badges'
import { Bouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Cellule } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { BlocTotaux, Identite } from '../../components/Elements'
import { IconePlusRond } from '../../components/icones'
import { Menu } from '../../components/Menu'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { useContrats } from '../salaire/requetes'
import { versionPour, type Ton } from '../salaire/saisie'
import { FormulaireSource } from './FormulaireSource'
import { PanneauRevenuRecu } from './PanneauRevenuRecu'
import { useEnregistrerSource, useRecus, useResumeRevenus, useSources, useSupprimerSource } from './requetes'
import { CERTITUDES_INFO, libelleFrequence, libelleVersement, statutRevenu } from './saisie'

const COLONNES = 'grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1.05fr)_minmax(0,1.05fr)_minmax(0,0.8fr)_28px] items-center gap-3'

const TONS_TEXTE: Record<Ton, string> = {
  positif: 'text-positif',
  alerte: 'text-alerte',
  info: 'text-info',
  neutre: 'text-gris',
}

type PanneauSource = { source?: SourceRevenuDto } | null
type PanneauRecu = { recu?: RevenuRecuDto; prevu?: RevenuPrevu } | null

/** Mon plan › Autres revenus (UX.md § 5.11) : sources qui reviennent, versements prévus, revenus reçus. */
export function OngletRevenus() {
  const sources = useSources()
  const resume = useResumeRevenus()
  const recus = useRecus()
  const contrats = useContrats()
  const enregistrer = useEnregistrerSource()
  const [panneauSource, setPanneauSource] = useState<PanneauSource>(null)
  const [panneauRecu, setPanneauRecu] = useState<PanneauRecu>(null)

  if (sources.isPending || resume.isPending || recus.isPending || contrats.isPending) return <Squelette />
  if (sources.isError || resume.isError || recus.isError || contrats.isError) {
    return (
      <Carte espacement="large">
        <div className="rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de charger tes revenus.</p>
          <Bouton
            variante="contour"
            taille="sm"
            className="mt-4"
            onClick={() => [sources, resume, recus, contrats].forEach((q) => void q.refetch())}
          >
            Réessayer
          </Bouton>
        </div>
      </Carte>
    )
  }

  const aujourdhui = resume.data.aujourdhui
  const version = versionPour(contrats.data, resume.data.moisCourant)
  const financeMoisSuivant = version ? version.financeMoisSuivant : null

  const panneaux = (
    <>
      <Panneau
        ouvert={panneauSource !== null}
        onFermer={() => setPanneauSource(null)}
        titre={panneauSource?.source ? `Modifier « ${panneauSource.source.libelle} »` : 'Nouveau revenu'}
        description="Décris-le une fois : MySalary le prévoit aux bons mois."
      >
        {panneauSource && (
          <FormulaireSource
            key={panneauSource.source?.id ?? 'nouvelle'}
            initial={panneauSource.source}
            aujourdhui={aujourdhui}
            financeMoisSuivant={financeMoisSuivant}
            chargement={enregistrer.isPending}
            onEnregistrer={async (saisie) => {
              await enregistrer.mutateAsync({ ...saisie, id: panneauSource.source?.id })
              toast(panneauSource.source ? 'Revenu modifié.' : `« ${saisie.libelle} » ajouté à ton plan.`)
              setPanneauSource(null)
            }}
          />
        )}
      </Panneau>
      <PanneauRevenuRecu
        ouvert={panneauRecu !== null}
        onFermer={() => setPanneauRecu(null)}
        aujourdhui={aujourdhui}
        recu={panneauRecu?.recu}
        prevu={panneauRecu?.prevu}
      />
    </>
  )

  if (sources.data.length === 0 && recus.data.length === 0) {
    return (
      <>
        <EtatVide aujourdhui={aujourdhui} financeMoisSuivant={financeMoisSuivant} onRecu={() => setPanneauRecu({})} />
        {panneaux}
      </>
    )
  }

  return (
    <>
      <Revenus
        sources={sources.data}
        resume={resume.data}
        recus={recus.data}
        onSource={(source) => setPanneauSource({ source })}
        onRecu={(r) => setPanneauRecu(r)}
      />
      {panneaux}
    </>
  )
}

function Squelette() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12" aria-label="Chargement des revenus">
      <div className="flex flex-col gap-4 rounded-carte bg-white p-[30px] shadow-carte">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-bouton bg-teinte" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
    </div>
  )
}

/** État vide : ce qui manque, pourquoi, et le formulaire (UX.md § 8). */
function EtatVide({ aujourdhui, financeMoisSuivant, onRecu }: { aujourdhui: string; financeMoisSuivant: boolean | null; onRecu: () => void }) {
  const enregistrer = useEnregistrerSource()
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <TitreSection
            titre="Tes revenus en plus du salaire"
            sousTitre={
              <>
                Primes, heures sup, à-côtés : décris ceux qui <span className="font-semibold text-encre-2">reviennent</span>, MySalary les prévoit.
              </>
            }
          />
          <div className="mt-6">
            <FormulaireSource
              aujourdhui={aujourdhui}
              financeMoisSuivant={financeMoisSuivant}
              chargement={enregistrer.isPending}
              onEnregistrer={(saisie) => enregistrer.mutateAsync(saisie).then(() => toast(`« ${saisie.libelle} » ajouté à ton plan.`))}
            />
          </div>
        </Carte>
      </motion.div>
      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <CarteCertitude />
        <Bouton variante="blanc" onClick={onRecu}>
          Noter un revenu reçu
        </Bouton>
      </motion.div>
    </div>
  )
}

function CarteCertitude({ resume }: { resume?: ResumeRevenusDto }) {
  const lignes = [
    { scenario: 'Prudent', regle: 'garantis seulement', montant: resume?.douzeMois.totaux.prudent },
    { scenario: 'Réaliste', regle: 'garantis + probables', montant: resume?.douzeMois.totaux.realiste },
    { scenario: 'Ambitieux', regle: 'tout, même incertain', montant: resume?.douzeMois.totaux.ambitieux },
  ]
  return (
    <Carte titre="Certitude">
      <p className="text-texte-sm text-gris">Chaque revenu prévu a une certitude. Les projections s’en servent :</p>
      <ul className="mt-4 flex flex-col gap-3">
        {lignes.map((l) => (
          <li key={l.scenario} className="flex items-baseline justify-between gap-3 text-texte-sm">
            <span>
              <span className="font-semibold text-encre">{l.scenario}</span> <span className="text-gris">· {l.regle}</span>
            </span>
            {l.montant !== undefined && <Montant valeur={l.montant} className="font-semibold text-encre" />}
          </li>
        ))}
      </ul>
      {resume && <p className="mt-3 text-mention text-gris">Montants prévus sur 12 mois, hors salaire.</p>}
    </Carte>
  )
}

interface ProprietesRevenus {
  sources: SourceRevenuDto[]
  resume: ResumeRevenusDto
  recus: RevenuRecuDto[]
  onSource: (source?: SourceRevenuDto) => void
  onRecu: (r: { recu?: RevenuRecuDto; prevu?: RevenuPrevu }) => void
}

function Revenus({ sources, resume, recus, onSource, onRecu }: ProprietesRevenus) {
  const [, setParametres] = useSearchParams()
  const supprimer = useSupprimerSource()
  const [aSupprimer, setASupprimer] = useState<SourceRevenuDto | null>(null)
  const actives = sources.filter((s) => s.active)
  const totaux = resume.douzeMois.totaux
  const prevuMois = resume.moisEnCours.prevu.ambitieux

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <div className="flex flex-col justify-between gap-5 sm:flex-row">
            <Identite
              initiale="R"
              nom="Revenus hors salaire"
              detail={`${actives.length} revenu${actives.length > 1 ? 's' : ''} qui revien${actives.length > 1 ? 'nent' : 't'}`}
            />
            <div className="flex flex-col gap-1 text-texte text-gris sm:items-end sm:text-right">
              <span>Mois de versement : celui où l’argent arrive</span>
              <span>{recus.length} revenu{recus.length > 1 ? 's' : ''} reçu{recus.length > 1 ? 's' : ''} noté{recus.length > 1 ? 's' : ''}</span>
            </div>
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Mois budgétaire en cours',
              lignes: [
                { valeur: formaterMois(resume.moisCourant, { majuscule: true }) },
                { libelle: 'Prévu', valeur: <Montant valeur={prevuMois} /> },
                { libelle: 'Reçu', valeur: <Montant valeur={resume.moisEnCours.recu} /> },
              ],
            }}
            droite={{
              titre: 'Équivalent mensuel',
              lignes: [
                { valeur: <Montant valeur={resume.equivalentMensuel.ambitieux} /> },
                { libelle: 'Garantis', valeur: <Montant valeur={resume.equivalentMensuel.garanti} /> },
                { libelle: 'Avec probables', valeur: <Montant valeur={resume.equivalentMensuel.realiste} /> },
              ],
            }}
          />

          {resume.sansContrat && sources.some((s) => s.versement === 'avecPaie') && (
            <p className="mt-5 rounded-champ bg-attention-fond px-4 py-3 text-texte-sm text-attention">
              Les revenus « avec la paie » seront placés dès que ton salaire sera saisi.{' '}
              <Bouton variante="lien" taille="texte" className="text-texte-sm" onClick={() => setParametres({}, { replace: true })}>
                Saisir mon salaire
              </Bouton>
            </p>
          )}

          <div className="mt-7">
            <TitreSection
              titre="Revenus qui reviennent"
              sousTitre={
                <>
                  Chacun avec sa <span className="font-semibold text-encre-2">certitude</span>. Ceux versés avec la paie apparaissent dans tes paies.
                </>
              }
              action={
                <Bouton variante="puce" taille="sm" onClick={() => onSource()}>
                  + Ajouter
                </Bouton>
              }
            />
          </div>

          <div className="relative -mx-1 mt-5 overflow-x-auto px-1">
            <div className="min-w-[740px]">
              <div className={cn(COLONNES, 'border-y border-filet px-4 py-4 text-texte-sm text-gris')}>
                <span>Revenu</span>
                <span>Quand</span>
                <span>Montant</span>
                <span>Par mois</span>
                <span>Certitude</span>
                <span />
              </div>
              {sources.length === 0 ? (
                <p className="px-4 pt-5 text-texte-sm text-gris">Aucun revenu qui revient. Ajoute une prime ou un revenu régulier.</p>
              ) : (
                <ul className="flex flex-col gap-3 pt-5" aria-label="Revenus qui reviennent">
                  {sources.map((s) => {
                    const certitude = CERTITUDES_INFO[s.certitude]
                    const quand = `${libelleFrequence(s)} · ${libelleVersement(s)}`
                    return (
                      <li key={s.id} className={cn(COLONNES, !s.active && 'opacity-60')}>
                        <button
                          type="button"
                          onClick={() => onSource(s)}
                          className="flex h-[46px] items-center truncate rounded-champ border border-filet bg-white px-4 text-left text-texte font-semibold text-encre transition-colors hover:border-primaire"
                          aria-label={`Modifier ${s.libelle}`}
                          title={s.libelle}
                        >
                          {s.libelle}
                        </button>
                        <Cellule titre={quand}>
                          <span className="font-medium">{quand}</span>
                        </Cellule>
                        <Cellule prefixe="DH">
                          <Montant valeur={s.montant} sansDevise />
                        </Cellule>
                        <Cellule prefixe="DH" attenue>
                          {s.equivalentMensuel ? <Montant valeur={s.equivalentMensuel} sansDevise /> : '—'}
                        </Cellule>
                        <span className={cn('truncate text-texte-sm font-medium', TONS_TEXTE[certitude.ton])}>
                          {s.active ? certitude.libelle : 'Terminé'}
                        </span>
                        <Menu
                          declencheur={
                            <button type="button" aria-label={`Options de ${s.libelle}`} className="rounded-pilule p-1 text-gris-icone hover:text-encre">
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          }
                          actions={[
                            { libelle: 'Modifier', onSelect: () => onSource(s) },
                            { libelle: 'Supprimer', danger: true, onSelect: () => setASupprimer(s) },
                          ]}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-titre text-encre">Revenus reçus</h3>
                <Bouton variante="lien" taille="texte" onClick={() => onRecu({})}>
                  Noter un revenu
                </Bouton>
              </div>
              <div className="rounded-bouton bg-interne p-5 shadow-bouton">
                {recus.length === 0 ? (
                  <p className="text-texte-sm text-gris">Aucun revenu reçu noté hors paie.</p>
                ) : (
                  <ul className="flex flex-col gap-3" aria-label="Revenus reçus">
                    {recus.slice(0, 5).map((r) => (
                      <li key={r.id}>
                        <button type="button" onClick={() => onRecu({ recu: r })} className="flex w-full items-center justify-between gap-3 text-left">
                          <span className="min-w-0">
                            <span className="block truncate text-texte font-medium text-encre">{r.libelle}</span>
                            <span className="block text-texte-sm text-gris">
                              {formaterDate(r.date)}
                              {!r.sourceId && ' · non prévu'}
                            </span>
                          </span>
                          <Montant valeur={r.montant} className="font-semibold text-encre" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <BlocTotaux
              lignes={[
                { libelle: 'Garantis', valeur: <Montant valeur={totaux.garanti} />, fort: true },
                { libelle: 'Probables', valeur: <Montant valeur={totaux.probable} /> },
                { libelle: 'Incertains', valeur: <Montant valeur={totaux.incertain} /> },
              ]}
              total={{
                libelle: `Prévu, ${formaterMois(resume.douzeMois.du, { annee: false })} → ${formaterMois(resume.douzeMois.au)}`,
                valeur: <Montant valeur={totaux.ambitieux} />,
              }}
            />
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <Carte titre="Prochains versements">
          {resume.prochains.length === 0 ? (
            <p className="text-texte-sm text-gris">Aucun versement prévu dans les 12 prochains mois.</p>
          ) : (
            <ul className="flex flex-col gap-4" aria-label="Prochains versements">
              {resume.prochains.map((r) => {
                const statut = statutRevenu(r)
                return (
                  <li key={`${r.sourceId}-${r.moisVersement}`} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-texte font-medium text-encre">{r.libelle}</span>
                      <span className={cn('block text-texte-sm', TONS_TEXTE[statut.ton])}>
                        {statut.texte}
                        {r.versement === 'avecPaie' && ' · avec la paie'}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Montant valeur={r.montantPrevu} className="font-semibold text-gris" />
                      <BadgeNature nature="prevu" />
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <Separateur className="my-5" />
          <p className="text-mention text-gris">Un revenu avec la paie se confirme avec la paie. Les autres se notent ici quand ils arrivent.</p>
        </Carte>

        <CarteCertitude resume={resume} />

        <div className="grid grid-cols-2 gap-4">
          <Bouton variante="blanc" onClick={() => onSource()}>
            <IconePlusRond className="h-5 w-5" /> Revenu
          </Bouton>
          <Bouton variante="blanc" onClick={() => setParametres({}, { replace: true })}>
            Mes paies
          </Bouton>
        </div>
        <Bouton
          className="w-full"
          onClick={() => {
            const attendu = resume.prochains.find((r) => r.versement === 'dateSeparee' && r.datePrevue <= resume.aujourdhui)
            onRecu(attendu ? { prevu: attendu } : {})
          }}
        >
          Noter un revenu reçu
        </Bouton>
      </motion.div>

      <Confirmation
        ouvert={aSupprimer !== null}
        onFermer={() => setASupprimer(null)}
        titre={`Supprimer « ${aSupprimer?.libelle ?? ''} » ?`}
        description="Il ne sera plus prévu. Les revenus déjà reçus restent, comme revenus non prévus. Les paies déjà reçues ne changent pas. Pour l’arrêter seulement, choisis plutôt un dernier mois."
        libelleConfirmer="Supprimer"
        chargement={supprimer.isPending}
        onConfirmer={() =>
          aSupprimer &&
          supprimer.mutate(aSupprimer.id, {
            onSuccess: () => {
              toast(`« ${aSupprimer.libelle} » supprimé.`)
              setASupprimer(null)
            },
            onError: () => toast('La suppression n’a pas abouti. Réessaie.'),
          })
        }
      />
    </div>
  )
}
