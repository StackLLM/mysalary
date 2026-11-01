import { deMois, formaterDate, formaterMontant, type EpargneDto, type MouvementEpargneDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { Check, Minus, MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte, TitreSection } from '../../components/Carte'
import { Confirmation } from '../../components/Confirmation'
import { Menu } from '../../components/Menu'
import { Montant } from '../../components/Montant'
import { AnneauProgression } from '../../components/premium/AnneauProgression'
import { CarteLumineuse } from '../../components/premium/CarteLumineuse'
import { ErreurApi } from '../../lib/api'
import { elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { dateDuJour } from '../../lib/dates'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { libelleJour } from '../depenses/saisie'
import { useAjouterMouvement, useAnnulerVersementsDuMois, useEpargne, useObjectifs, useReprendreVersement, useSauterVersement, useSupprimerMouvement } from './requetes'
import { groupesMouvements, LIBELLES_MOUVEMENT, lignesDuPlan, resumePlan, type LignePlan } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'

/**
 * Mon plan › Épargne (ux-ui.md (UX) § 5.11 ; lots 36 et 37). On note ce qu'on met de côté, rien de plus :
 * pour chaque objectif du mois, « Épargné », un autre montant, ou « Pas ce mois-ci », chaque choix annulable ;
 * puis ce qui a été noté. À droite : ce qui est mis de côté, par objectif. Aucun compte à gérer (lot 37).
 */
export function OngletEpargne() {
  const epargne = useEpargne()
  if (epargne.isPending) {
    return (
      <div className={GRILLE} aria-label="Chargement de l’épargne">
        <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
        <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
      </div>
    )
  }
  if (epargne.isError) {
    return (
      <Carte espacement="large">
        <div className="rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de charger ton épargne.</p>
          <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void epargne.refetch()}>
            Réessayer
          </Bouton>
        </div>
      </Carte>
    )
  }
  return <Epargne epargne={epargne.data} />
}

function Epargne({ epargne }: { epargne: EpargneDto }) {
  const { aujourdhui } = epargne
  const { ouvrirVersement } = useSaisieRapide()
  const supprimerMouvement = useSupprimerMouvement()
  const [aSupprimer, setASupprimer] = useState<MouvementEpargneDto | null>(null)
  const groupes = groupesMouvements(epargne.mouvements)
  const epargner = (objectifId?: string, montant?: number) => ouvrirVersement(objectifId ? { objectifId, montant } : undefined)

  return (
    <div className={GRILLE}>
      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <PlanDuMois epargne={epargne} epargner={epargner} />

        <Carte espacement="large">
          <section aria-label="Historique de l’épargne">
            <TitreSection
              titre="Historique"
              sousTitre="Ce que tu as mis de côté ou retiré, du plus récent au plus ancien."
              action={
                <Bouton variante="puce" taille="sm" onClick={() => ouvrirVersement()}>
                  Retirer ou verser
                </Bouton>
              }
            />
            {groupes.length === 0 ? (
              <p className="mt-5 text-texte-sm text-gris">Rien de noté pour l’instant. Ce que tu épargnes apparaîtra ici.</p>
            ) : (
              <div className="mt-5 flex flex-col gap-6">
                {groupes.map((g) => (
                  <section key={g.jour} aria-label={libelleJour(g.jour, aujourdhui)}>
                    <h4 className="mb-3 text-texte-sm font-semibold text-encre">{libelleJour(g.jour, aujourdhui)}</h4>
                    <ul className="flex flex-col gap-2">
                      {g.mouvements.map((m) => (
                        <li key={m.id} className="flex items-center gap-3 rounded-champ border border-filet bg-white px-4 py-3">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-texte font-semibold text-encre">{m.objectif ?? (m.libelle || 'Épargne libre')}</span>
                            <span className="block truncate text-texte-sm text-gris">{LIBELLES_MOUVEMENT[m.type]}</span>
                          </span>
                          <span className={cn('shrink-0 font-semibold', m.montant < 0 ? 'text-encre-2' : 'text-encre')}>
                            {m.montant > 0 ? '+' : ''}
                            <Montant valeur={m.montant} />
                          </span>
                          {m.type === 'achat' ? (
                            <span className="w-7" aria-hidden />
                          ) : (
                            <Menu
                              declencheur={
                                <button type="button" aria-label={`Options du mouvement ${m.objectif ?? (m.libelle || LIBELLES_MOUVEMENT[m.type])}`} className="rounded-pilule p-1 text-gris-icone hover:text-encre">
                                  <MoreHorizontal className="h-5 w-5" />
                                </button>
                              }
                              actions={[{ libelle: 'Annuler ce mouvement', danger: true, onSelect: () => setASupprimer(m) }]}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <MisDeCote />
      </motion.div>

      <Confirmation
        ouvert={aSupprimer !== null}
        onFermer={() => setASupprimer(null)}
        titre="Annuler ce mouvement ?"
        description={aSupprimer ? `${LIBELLES_MOUVEMENT[aSupprimer.type]} de ${formaterMontant(Math.abs(aSupprimer.montant))} du ${formaterDate(aSupprimer.date)} : il ne compte plus dans ton épargne.` : ''}
        libelleConfirmer="Annuler le mouvement"
        libelleRenoncer="Garder"
        chargement={supprimerMouvement.isPending}
        onConfirmer={() =>
          aSupprimer &&
          supprimerMouvement.mutate(aSupprimer.id, {
            onSuccess: () => {
              toast('Mouvement annulé.')
              setASupprimer(null)
            },
            onError: (e) => toast(e instanceof ErreurApi ? e.message : 'L’annulation n’a pas abouti.'),
          })
        }
      />
    </div>
  )
}

/** Le mois en cours, objectif par objectif : épargné, autre montant, ou pas ce mois-ci (lot 36). */
function PlanDuMois({ epargne, epargner }: { epargne: EpargneDto; epargner: (objectifId?: string, montant?: number) => void }) {
  const { planMois } = epargne
  const lignes = lignesDuPlan(planMois)
  const resume = resumePlan(lignes)
  const [aAnnuler, setAAnnuler] = useState<LignePlan | null>(null)
  const annuler = useAnnulerVersementsDuMois()
  const nomMois = deMois(planMois.cle, { annee: false })

  return (
    <CarteLumineuse className="p-6 sm:p-8">
      <section aria-label="Épargne du mois">
        <div className="flex items-center gap-5">
          <AnneauProgression valeur={resume.part} libelle={`Part épargnée du prévu ${nomMois}`} taille={84}>
            <span className="block text-titre font-bold tabular-nums text-encre">{Math.round(resume.part * 100)} %</span>
          </AnneauProgression>
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] font-bold leading-7 tracking-tight text-encre">Épargne {nomMois}</h2>
            <p className="mt-1 text-texte-sm text-gris">
              Du {formaterDate(planMois.debut, 'court')} au {formaterDate(planMois.fin, 'court')}
            </p>
            {resume.prevu > 0 && (
              <p className="mt-2 text-texte text-encre-2">
                <Montant valeur={resume.verse} className="font-bold text-encre" /> épargnés sur <Montant valeur={resume.prevu} /> prévus
              </p>
            )}
          </div>
        </div>

        {lignes.length === 0 ? (
          <div className="mt-6 rounded-bouton bg-interne p-5">
            <p className="text-texte font-medium text-encre">Aucun versement mensuel prévu.</p>
            <p className="mt-1 text-texte-sm text-gris">Fixe un montant par mois sur un objectif : il apparaîtra ici chaque mois, à cocher.</p>
            <Link to="/objectifs" className="mt-4 inline-block text-texte-sm font-semibold text-lien hover:underline">
              Choisir un versement mensuel
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-6 text-texte-sm text-gris">
              {resume.aDecider === 0
                ? 'Tout est décidé pour ce mois.'
                : `${resume.aDecider} objectif${resume.aDecider > 1 ? 's' : ''} à décider : as-tu mis de côté le montant prévu ?`}
            </p>
            <ul className="mt-3 flex flex-col gap-3" aria-label={`Versements prévus ${nomMois}`}>
              {lignes.map((l) => (
                <LigneObjectif key={l.objectifId} ligne={l} epargner={epargner} onAnnuler={() => setAAnnuler(l)} />
              ))}
            </ul>
          </>
        )}

        <button
          type="button"
          onClick={() => epargner()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-champ border border-dashed border-filet-fort px-4 py-3 text-texte-sm font-semibold text-encre-2 transition-colors hover:border-primaire hover:bg-teinte hover:text-encre"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Épargner pour un objectif
        </button>
      </section>

      <Confirmation
        ouvert={aAnnuler !== null}
        onFermer={() => setAAnnuler(null)}
        titre={aAnnuler ? `Annuler l’épargne de « ${aAnnuler.libelle} » ?` : ''}
        description={aAnnuler ? `Les versements notés ${nomMois} pour cet objectif (${formaterMontant(aAnnuler.reel)}) sont retirés. Il redevient à décider.` : ''}
        libelleConfirmer="Annuler l’épargne"
        libelleRenoncer="Garder"
        chargement={annuler.isPending}
        onConfirmer={() =>
          aAnnuler &&
          annuler.mutate(aAnnuler.objectifId, {
            onSuccess: () => {
              toast(`Épargne ${nomMois} annulée pour « ${aAnnuler.libelle} ».`)
              setAAnnuler(null)
            },
            onError: (e) => toast(e instanceof ErreurApi ? e.message : 'L’annulation n’a pas abouti.'),
          })
        }
      />
    </CarteLumineuse>
  )
}

const PASTILLES: Record<LignePlan['etat'], { icone: typeof Check | null; classe: string; libelle: string }> = {
  aFaire: { icone: null, classe: 'border-2 border-dashed border-filet-fort bg-white', libelle: 'À décider' },
  partiel: { icone: null, classe: 'border-2 border-primaire bg-sauge-50', libelle: 'En partie épargné' },
  fait: { icone: Check, classe: 'bg-primaire text-white', libelle: 'Épargné' },
  horsPlan: { icone: Check, classe: 'bg-primaire text-white', libelle: 'Épargné' },
  saute: { icone: Minus, classe: 'bg-interne text-gris', libelle: 'Pas ce mois-ci' },
}

function LigneObjectif({
  ligne: l,
  epargner,
  onAnnuler,
}: {
  ligne: LignePlan
  epargner: (objectifId?: string, montant?: number) => void
  onAnnuler: () => void
}) {
  const ajouter = useAjouterMouvement()
  const supprimer = useSupprimerMouvement()
  const sauter = useSauterVersement()
  const reprendre = useReprendreVersement()
  const occupe = ajouter.isPending || sauter.isPending || reprendre.isPending
  const pastille = PASTILLES[l.etat]
  const Icone = pastille.icone
  const erreur = (e: unknown) => toast(e instanceof ErreurApi ? e.message : 'L’enregistrement n’a pas abouti. Réessaie.')

  /** Le montant prévu est noté tout de suite, à la date du jour. */
  function epargne1Clic() {
    ajouter.mutate(
      { sens: 'versement', objectifId: l.objectifId, date: dateDuJour(), montant: l.reste, libelle: '' },
      {
        onSuccess: ({ id }) => toast(`${formaterMontant(l.reste)} épargnés pour « ${l.libelle} ».`, { action: { label: 'Annuler', onClick: () => supprimer.mutate(id) } }),
        onError: erreur,
      },
    )
  }

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-champ border px-4 py-3.5 transition-colors sm:flex-row sm:items-center',
        l.etat === 'saute' ? 'border-filet bg-interne/60' : l.etat === 'fait' || l.etat === 'horsPlan' ? 'border-sauge-200 bg-sauge-50' : 'border-filet bg-white',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-pilule', pastille.classe)} aria-label={pastille.libelle} role="img">
          {Icone && <Icone className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden />}
        </span>
        <span className="min-w-0">
          <Link to={`/objectifs/${l.objectifId}`} className={cn('block truncate text-texte font-semibold hover:text-lien', l.etat === 'saute' ? 'text-encre-2' : 'text-encre')}>
            {l.libelle}
          </Link>
          <span className="block text-texte-sm text-gris">
            {l.etat === 'aFaire' && (
              <>
                <Montant valeur={l.prevu} className="font-semibold text-encre-2" /> prévus ce mois-ci
              </>
            )}
            {l.etat === 'partiel' && (
              <>
                <Montant valeur={l.reel} className="font-semibold text-encre-2" /> épargnés sur <Montant valeur={l.prevu} />
              </>
            )}
            {(l.etat === 'fait' || l.etat === 'horsPlan') && (
              <>
                <Montant valeur={l.reel} className="font-semibold text-positif" /> épargnés
              </>
            )}
            {l.etat === 'saute' && (
              <>
                Pas ce mois-ci · <Montant valeur={l.prevu} /> non épargnés
              </>
            )}
          </span>
        </span>
      </div>

      <div className={cn('sm:flex sm:shrink-0 sm:items-center sm:justify-end sm:gap-2', l.etat === 'aFaire' || l.etat === 'partiel' ? 'grid grid-cols-2 gap-2' : 'flex justify-end')}>
        {(l.etat === 'aFaire' || l.etat === 'partiel') && (
          <>
            <Bouton
              taille="sm"
              className="col-span-2"
              onClick={epargne1Clic}
              chargement={ajouter.isPending}
              disabled={occupe}
              aria-label={`Épargné : ${formaterMontant(l.reste)} pour ${l.libelle}`}
            >
              <Check className="h-4 w-4" aria-hidden />
              {l.etat === 'partiel' ? <>Compléter <Montant valeur={l.reste} /></> : <>Épargné <Montant valeur={l.reste} /></>}
            </Bouton>
            <Bouton variante="blanc" taille="sm" onClick={() => epargner(l.objectifId, l.reste)} disabled={occupe}>
              Autre montant
            </Bouton>
          </>
        )}
        {l.etat === 'aFaire' && (
          <Bouton
            variante="puce"
            taille="sm"
            disabled={occupe}
            onClick={() => sauter.mutate(l.objectifId, { onSuccess: () => toast(`« ${l.libelle} » : pas ce mois-ci.`), onError: erreur })}
          >
            Pas ce mois-ci
          </Bouton>
        )}
        {(l.etat === 'partiel' || l.etat === 'fait' || l.etat === 'horsPlan') && (
          <button type="button" onClick={onAnnuler} className="rounded-pilule px-3 py-1.5 text-texte-sm font-semibold text-encre-2 hover:bg-teinte hover:text-encre">
            Annuler
          </button>
        )}
        {l.etat === 'saute' && (
          <button
            type="button"
            disabled={occupe}
            onClick={() => reprendre.mutate(l.objectifId, { onSuccess: () => toast(`« ${l.libelle} » : de nouveau à décider.`), onError: erreur })}
            className="rounded-pilule px-3 py-1.5 text-texte-sm font-semibold text-encre-2 hover:bg-teinte hover:text-encre disabled:opacity-50"
          >
            Annuler
          </button>
        )}
      </div>
    </li>
  )
}

/** Ce qui est mis de côté, en tout et pour chaque objectif. */
function MisDeCote() {
  const objectifs = useObjectifs()
  const suivis = (objectifs.data?.objectifs ?? []).filter((o) => o.statut === 'actif' || o.statut === 'pause')
  const total = suivis.reduce((t, o) => t + o.epargne, 0)

  return (
    <Carte titre="Mis de côté">
      <p className="text-[30px] font-bold leading-9 tracking-tight tabular-nums text-encre">
        <Montant valeur={total} />
      </p>
      <p className="mt-1 text-texte-sm text-gris">pour tes objectifs</p>
      {suivis.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3" aria-label="Épargne par objectif">
          {suivis.map((o) => (
            <li key={o.id}>
              <Link to={`/objectifs/${o.id}`} className="group block">
                <span className="flex items-baseline justify-between gap-3 text-texte-sm">
                  <span className="truncate font-medium text-encre group-hover:text-lien">{o.libelle}</span>
                  <span className="shrink-0 text-gris">
                    <Montant valeur={o.epargne} className="font-semibold text-encre" /> / <Montant valeur={o.montantCible} />
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-pilule bg-sauge-100" aria-hidden>
                  <span className="block h-full rounded-pilule bg-primaire" style={{ width: `${Math.min(100, Math.round(o.progression * 100))}%` }} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Carte>
  )
}
