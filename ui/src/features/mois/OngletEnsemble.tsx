import { deMois, formaterDate, formaterMois, formaterMontant, type BilanDto, type LigneBilan, type MoisCumul } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Confirmation } from '../../components/Confirmation'
import { BlocTotaux } from '../../components/Elements'
import { GraphiqueRythme } from '../../components/graphiques/GraphiqueRythme'
import { MentionSansEpargne } from '../../components/MentionSansEpargne'
import { Montant } from '../../components/Montant'
import { ErreurApi } from '../../lib/api'
import { elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { CarteIndicateurs } from '../conseils/Conseils'
import { useEnregistrerDepense, useSupprimerDepense } from '../depenses/requetes'
import type { Ton } from '../salaire/saisie'
import { EnteteMois } from './EnteteMois'
import { useCloturer, useRouvrir } from './requetes'
import { confirmation, FAMILLES, moisPrecedent, NATURES_CUMUL, paiementsEnRetard, parFamille, plus, pointsRythme, statutLigne } from './saisie'

const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }
const COLONNES = 'grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] items-center gap-3'

/** Mois › Vue d'ensemble (ux-ui.md (UX) § 4.7, § 5.3) : prévu et réel ligne à ligne, rythme, clôture. */
export function OngletEnsemble({ bilan, changerMois }: { bilan: BilanDto; changerMois: (cle: string) => void }) {
  const { mois, totaux, aujourdhui } = bilan
  const cloture = bilan.cloture !== null
  const court = formaterMois(mois.cle, { annee: false })
  const enregistrer = useEnregistrerDepense()
  const supprimer = useSupprimerDepense()
  const [demande, setDemande] = useState<'cloturer' | 'rouvrir' | null>(null)
  const [toutPaye, setToutPaye] = useState(false)
  const enRetard = paiementsEnRetard(bilan.lignes, aujourdhui)
  const cloturer = useCloturer()
  const rouvrir = useRouvrir()

  function payer(l: LigneBilan) {
    const c = confirmation(l, aujourdhui)
    if (c?.type !== 'payer') return
    enregistrer.mutate(c.saisie, {
      onSuccess: ({ id }) => toast(`« ${l.libelle} » payé : ${formaterMontant(c.saisie.montant)}.`, { action: { label: 'Annuler', onClick: () => supprimer.mutate(id) } }),
      onError: (e) => toast(e instanceof ErreurApi ? e.message : 'Le paiement n’a pas été noté. Réessaie.'),
    })
  }

  /** Note d'un coup tous les paiements en retard, chacun à sa date prévue ; un seul « Annuler » les retire tous. */
  async function payerTout() {
    const ids: string[] = []
    try {
      for (const { saisie } of enRetard) ids.push((await enregistrer.mutateAsync(saisie)).id)
      toast(`${ids.length} paiement${ids.length > 1 ? 's notés' : ' noté'}.`, { action: { label: 'Annuler', onClick: () => ids.forEach((id) => supprimer.mutate(id)) } })
    } catch (e) {
      const dejaNotes = ids.length > 0 ? ` ${ids.length} déjà noté${ids.length > 1 ? 's' : ''}.` : ''
      toast(`${e instanceof ErreurApi ? e.message : 'Un paiement n’a pas été noté. Réessaie.'}${dejaNotes}`)
    } finally {
      setToutPaye(false)
    }
  }

  const action = (l: LigneBilan) => {
    if (cloture) return null
    const c = confirmation(l, aujourdhui)
    if (!c) return null
    return c.type === 'payer' ? (
      <Bouton variante="puce" taille="sm" className="h-7 px-2.5" onClick={() => payer(l)} disabled={enregistrer.isPending} aria-label={`Marquer ${l.libelle} payé`}>
        Payé
      </Bouton>
    ) : (
      <Link to={c.chemin} className={styleBouton({ variante: 'puce', taille: 'sm', className: 'h-7 px-2.5' })} aria-label={`${c.libelle} : ${l.libelle}`}>
        Confirmer
      </Link>
    )
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <EnteteMois titre={`Bilan ${deMois(mois.cle, { annee: false })}`} mois={mois} aujourdhui={aujourdhui} cloture={cloture} changerMois={changerMois} />

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: `Dépensé sur ${formaterMontant(totaux.chargesPrevues)} de charges`,
              lignes: [
                { valeur: <Montant valeur={bilan.synthese.consomme} className="text-montant" /> },
                { libelle: 'À confirmer (date passée)', valeur: <Montant valeur={bilan.synthese.aConfirmer} /> },
                { libelle: 'À venir', valeur: <Montant valeur={bilan.synthese.aVenir} /> },
                ...(bilan.synthese.horsPlan > 0 ? [{ libelle: 'Hors plan', valeur: <Montant valeur={bilan.synthese.horsPlan} /> }] : []),
              ],
            }}
            droite={{
              titre: 'Reste du mois, avant épargne',
              lignes: [
                { valeur: <Montant valeur={totaux.restePrevu} className="text-montant" /> },
                { libelle: 'Revenus prévus', valeur: <Montant valeur={totaux.revenusPrevus} /> },
                { libelle: 'Charges prévues', valeur: <Montant valeur={totaux.chargesPrevues} /> },
              ],
            }}
          />

          <BandeCumul cumul={bilan.cumul} />

          {bilan.estimation && (
            <p className="mt-5 rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2">
              <span className="font-semibold">Estimation de fin de mois : {plus(bilan.estimation.resteFinDeMois)}
              <Montant valeur={bilan.estimation.resteFinDeMois} /></span> de reste, si les revenus attendus (<Montant valeur={bilan.estimation.revenusAttendus} />) arrivent et que
              les charges encore prévues (<Montant valeur={bilan.estimation.chargesAttendues} />) sortent comme prévu.
            </p>
          )}
          {totaux.ecart !== null && (
            <p className={cn('mt-5 rounded-champ px-4 py-3 text-texte-sm', totaux.ecart < 0 ? 'bg-alerte-fond text-alerte' : 'bg-teinte text-encre-2')}>
              <span className="font-semibold">
                Écart avec le plan : {plus(totaux.ecart)}
                <Montant valeur={totaux.ecart} />
              </span>
              . Il t’est resté {totaux.ecart < 0 ? 'moins' : totaux.ecart > 0 ? 'plus' : 'autant'} que prévu en {court}.
            </p>
          )}
          {mois.statut === 'aVenir' && <p className="mt-5 rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2">Mois à venir : prévisions seules, rien de réel pour l’instant.</p>}

          <section className="mt-8">
            <TitreSection
              titre="Prévu et réel"
              sousTitre={
                <>
                  Chaque ligne du plan à côté de ce qui s’est <span className="font-semibold text-encre-2">vraiment</span> passé.
                </>
              }
            />
            <div className="relative -mx-1 mt-5 overflow-x-auto px-1">
              <div className="sm:min-w-[640px]">
                <div className={cn(COLONNES, 'hidden border-y border-filet px-4 py-4 text-texte-sm text-gris sm:grid')}>
                  <span>Ligne</span>
                  <span className="text-right">Prévu</span>
                  <span className="text-right">Réel</span>
                  <span className="text-right">Écart</span>
                  <span className="text-right">Statut</span>
                </div>
                {bilan.lignes.length === 0 ? (
                  <p className="px-4 pt-5 text-texte-sm text-gris">Rien de prévu ni de réel ce mois-ci. Commence par ton salaire dans Mon plan.</p>
                ) : (
                  parFamille(bilan.lignes).map((g) => (
                    <section key={g.famille} aria-label={FAMILLES[g.famille]} className="pt-5">
                      <h4 className="px-4 pb-2 text-mention font-semibold uppercase tracking-wide text-gris">{FAMILLES[g.famille]}</h4>
                      <ul className="flex flex-col">
                        {g.lignes.map((l) => {
                          const statut = statutLigne(l)
                          const couleurEcart =
                            l.ecart === null || l.ecart === 0 ? 'text-gris' : (l.famille === 'revenu') === l.ecart > 0 ? 'text-positif' : 'text-alerte'
                          const prevu = l.prevu === null ? '—' : <Montant valeur={l.prevu} />
                          const reel = l.reel === null ? <span className="font-normal text-gris">—</span> : <Montant valeur={l.reel} />
                          const ecart =
                            l.ecart === null ? (
                              '—'
                            ) : (
                              <>
                                {plus(l.ecart)}
                                <Montant valeur={l.ecart} />
                              </>
                            )
                          return (
                            <li key={l.cle} className={cn(COLONNES, 'flex flex-wrap items-center gap-x-4 gap-y-1 rounded-champ px-4 py-2.5 text-texte odd:bg-interne sm:grid sm:gap-3')}>
                              <span className="order-1 min-w-0 flex-1">
                                <span className="block truncate font-medium text-encre" title={l.libelle}>
                                  {l.libelle}
                                </span>
                                {l.date && <span className="block text-mention text-gris">{formaterDate(l.date, 'court')}</span>}
                              </span>
                              {/* Sous 640 px : statut à droite du libellé, montants sur la ligne suivante. */}
                              <span className="order-2 flex shrink-0 items-center justify-end gap-2 sm:order-5">
                                <span className={cn('text-texte-sm font-medium', TONS[statut.ton])}>{statut.texte}</span>
                                {action(l)}
                              </span>
                              <span className="order-3 basis-full sm:hidden" aria-hidden />
                              <span className="order-4 text-texte-sm text-gris sm:order-2 sm:text-right sm:text-texte">
                                <span className="sm:hidden">Prévu </span>
                                {prevu}
                              </span>
                              <span className="order-4 text-texte-sm font-semibold text-encre sm:order-3 sm:text-right sm:text-texte">
                                <span className="font-normal text-gris sm:hidden">Réel </span>
                                {reel}
                              </span>
                              <span className={cn('order-4 text-texte-sm sm:order-4 sm:text-right sm:text-texte', couleurEcart, l.ecart === null && 'hidden sm:block')}>
                                <span className="sm:hidden">Écart </span>
                                {ecart}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))
                )}
              </div>
            </div>
          </section>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <h3 className="mb-4 text-titre text-encre">Rythme {deMois(mois.cle, { annee: false })}</h3>
              <GraphiqueRythme points={pointsRythme(bilan.rythme)} libelle={`Dépenses cumulées de ${court} : réel contre prévu`} />
            </div>
            <BlocTotaux
              lignes={[
                { libelle: 'Revenus reçus', valeur: <Montant valeur={totaux.revenusReels} />, fort: true },
                { libelle: `Dépensé, sur ${formaterMontant(totaux.chargesPrevues)} de charges`, valeur: <Montant valeur={bilan.synthese.consomme} /> },
                { libelle: 'À confirmer (date passée)', valeur: <Montant valeur={bilan.synthese.aConfirmer} /> },
                { libelle: 'À venir, enveloppes comprises', valeur: <Montant valeur={bilan.synthese.aVenir} /> },
                // L'épargne n'est pas une sortie (R11) : elle est montrée à part, prévue et réelle.
                ...(bilan.epargne
                  ? [
                      {
                        libelle: 'Épargne',
                        valeur: (
                          <>
                            <Montant valeur={bilan.epargne.reelle} />
                            <span className="text-gris"> / </span>
                            <Montant valeur={bilan.epargne.prevue} className="text-gris" />
                            <span className="text-mention text-gris"> prévu</span>
                          </>
                        ),
                      },
                    ]
                  : []),
              ]}
              total={{ libelle: `Reste ${deMois(mois.cle, { annee: false })}, sans épargne`, valeur: <Montant valeur={totaux.restePrevu} /> }}
            />
          </div>

          <MentionSansEpargne className="mt-6" epargnePrevue={bilan.epargne ? bilan.epargne.prevue : null} />
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <CarteCloture bilan={bilan} onDemande={setDemande} />

        {!cloture && mois.statut !== 'aVenir' && <CarteIndicateurs cle={mois.cle} />}

        <Carte titre="À confirmer" precision={bilan.aConfirmer.length ? `(${bilan.aConfirmer.length})` : undefined}>
          {!cloture && enRetard.length > 0 && (
            <Bouton variante="contour" taille="sm" className="mb-4 w-full" onClick={() => setToutPaye(true)} disabled={enregistrer.isPending}>
              Tout marquer payé ({enRetard.length})
            </Bouton>
          )}
          {bilan.aConfirmer.length === 0 ? (
            <p className="text-texte-sm text-gris">{mois.statut === 'aVenir' ? 'Rien à confirmer avant le début du mois.' : 'Tout ce qui était prévu est confirmé.'}</p>
          ) : (
            <ul className="flex flex-col gap-4" aria-label="À confirmer">
              {bilan.aConfirmer.map((l) => {
                const statut = statutLigne(l)
                return (
                  <li key={l.cle} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-texte font-medium text-encre">{l.libelle}</span>
                      <span className="block text-texte-sm text-gris">
                        {l.date ? `${formaterDate(l.date, 'court')} · ` : ''}
                        <span className={TONS[statut.ton]}>{statut.texte}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {l.prevu !== null && <Montant valeur={l.prevu} className="font-semibold text-encre" />}
                      {action(l)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Carte>

        {bilan.journal.length > 0 && (
          <Carte titre="Historique">
            <ul className="flex flex-col gap-2 text-texte-sm text-gris" aria-label="Historique de clôture">
              {bilan.journal.map((e) => (
                <li key={`${e.action}-${e.le}`}>
                  {e.action === 'cloture' ? 'Clôturé' : 'Rouvert'} le {formaterDate(e.le.slice(0, 10))}
                  {e.action === 'cloture' && e.nonConfirmees > 0 ? ` (${e.nonConfirmees} non confirmée${e.nonConfirmees > 1 ? 's' : ''})` : ''}
                </li>
              ))}
            </ul>
          </Carte>
        )}
      </motion.div>

      <Confirmation
        ouvert={toutPaye}
        onFermer={() => setToutPaye(false)}
        titre={`Marquer ${enRetard.length} ligne${enRetard.length > 1 ? 's' : ''} comme payée${enRetard.length > 1 ? 's' : ''} ?`}
        description={`${enRetard.map(({ ligne }) => ligne.libelle).join(', ')}. Chacune est notée payée à sa date prévue, pour son montant prévu. Tu pourras annuler juste après.`}
        libelleConfirmer="Tout marquer payé"
        ton="principal"
        chargement={enregistrer.isPending}
        onConfirmer={() => void payerTout()}
      />

      <Confirmation
        ouvert={demande === 'cloturer'}
        onFermer={() => setDemande(null)}
        titre={`Clôturer ${formaterMois(mois.cle)} ?`}
        description={
          bilan.aConfirmer.length > 0
            ? `${bilan.aConfirmer.length} ligne${bilan.aConfirmer.length > 1 ? 's ne sont' : ' n’est'} pas confirmée${bilan.aConfirmer.length > 1 ? 's' : ''} : ${bilan.aConfirmer.map((l) => l.libelle).join(', ')}. Le bilan sera figé tel quel, avec cette mention. Tu pourras rouvrir le mois.`
            : `Dépensé : ${formaterMontant(bilan.synthese.consomme)}, reste à payer : ${formaterMontant(bilan.synthese.resteAPayer)}. Le bilan sera figé et le mois passera en lecture seule. Tu pourras le rouvrir.`
        }
        libelleConfirmer={bilan.aConfirmer.length > 0 ? 'Clôturer quand même' : 'Clôturer'}
        ton="principal"
        chargement={cloturer.isPending}
        onConfirmer={() =>
          cloturer.mutate(
            { cle: mois.cle, forcer: bilan.aConfirmer.length > 0 },
            {
              onSuccess: () => {
                toast(`${formaterMois(mois.cle, { majuscule: true })} est clôturé.`)
                setDemande(null)
              },
              onError: (e) => toast(e instanceof ErreurApi ? e.message : 'La clôture n’a pas abouti. Réessaie.'),
            },
          )
        }
      />
      <Confirmation
        ouvert={demande === 'rouvrir'}
        onFermer={() => setDemande(null)}
        titre={`Rouvrir ${formaterMois(mois.cle)} ?`}
        description="Le bilan redeviendra calculé et modifiable. La réouverture est gardée dans l’historique."
        libelleConfirmer="Rouvrir"
        ton="principal"
        chargement={rouvrir.isPending}
        onConfirmer={() =>
          rouvrir.mutate(mois.cle, {
            onSuccess: () => {
              toast(`${formaterMois(mois.cle, { majuscule: true })} est rouvert.`)
              setDemande(null)
            },
            onError: (e) => toast(e instanceof ErreurApi ? e.message : 'La réouverture n’a pas abouti. Réessaie.'),
          })
        }
      />
    </div>
  )
}

/** Carte de clôture : état du mois et action possible (ux-ui.md (UX) § 4.7, étape 5). */
function CarteCloture({ bilan, onDemande }: { bilan: BilanDto; onDemande: (d: 'cloturer' | 'rouvrir') => void }) {
  const { mois, cloture } = bilan
  const nom = formaterMois(mois.cle, { annee: false, majuscule: true })
  if (cloture) {
    return (
      <Carte titre="Mois clôturé">
        <p className="flex items-center gap-2 text-texte font-medium text-encre">
          <Lock className="h-4 w-4 text-gris" aria-hidden /> Clôturé le {formaterDate(cloture.le.slice(0, 10))}
        </p>
        <p className="mt-2 text-texte-sm text-gris">
          Bilan figé, lecture seule.
          {cloture.forcee ? ` Clôturé avec ${cloture.nonConfirmees} ligne${cloture.nonConfirmees > 1 ? 's' : ''} non confirmée${cloture.nonConfirmees > 1 ? 's' : ''}.` : ''}
        </p>
        <Bouton variante="blanc" className="mt-5 w-full" onClick={() => onDemande('rouvrir')}>
          Rouvrir le mois
        </Bouton>
      </Carte>
    )
  }
  if (mois.statut === 'passe') {
    return (
      <Carte titre="Fin du mois">
        <p className="text-texte font-medium text-encre">{nom} est terminé. Vérifie et clôture.</p>
        <p className="mt-2 text-texte-sm text-gris">
          {bilan.aConfirmer.length > 0
            ? `${bilan.aConfirmer.length} ligne${bilan.aConfirmer.length > 1 ? 's' : ''} à confirmer d’abord, ou clôture quand même.`
            : 'Tout est confirmé : le bilan peut être figé.'}
        </p>
        <Bouton className="mt-5 w-full" onClick={() => onDemande('cloturer')}>
          Clôturer {formaterMois(mois.cle, { annee: false })}
        </Bouton>
      </Carte>
    )
  }
  return (
    <Carte titre="Clôture">
      <p className="text-texte-sm text-gris">
        {mois.statut === 'enCours'
          ? `${nom} se clôture après sa dernière journée, le ${formaterDate(mois.fin)}.`
          : `${nom} n’a pas commencé.`}
      </p>
    </Carte>
  )
}

/**
 * Cumul de mois en mois (lot 13) : le reste du mois précédent arrive dans ce mois, et ce qui restera à la fin
 * passera au suivant, comme sur le compte courant. Réel, estimation (mois en cours) ou prévu : toujours dit.
 */
function BandeCumul({ cumul }: { cumul: MoisCumul }) {
  if (cumul.nature === 'avant' || cumul.report === null || cumul.cumul === null) {
    return <p className="mt-5 rounded-champ bg-teinte px-4 py-3 text-texte-sm text-gris">Pas de cumul pour ce mois : il précède le début de ton suivi.</p>
  }
  const nature = NATURES_CUMUL[cumul.nature]
  const precedent = deMois(moisPrecedent(cumul.cle), { annee: false })
  const cases = [
    { cle: 'report', libelle: cumul.premier ? 'Solde de départ' : `Report ${precedent}`, valeur: cumul.report, signe: true },
    { cle: 'reste', libelle: 'Reste du mois', valeur: cumul.reste, signe: true },
    { cle: 'cumul', libelle: 'Cumul fin de mois', valeur: cumul.cumul, signe: false },
  ]
  return (
    <section aria-label="Cumul de mois en mois" className="mt-5 rounded-bouton bg-interne p-4 shadow-bouton sm:p-5">
      <div className="grid grid-cols-3 gap-3">
        {cases.map((c, i) => (
          <div key={c.cle} className={cn('min-w-0', i === 2 && 'text-right')}>
            <span className="block truncate text-mention text-gris" title={c.libelle}>
              {c.libelle}
            </span>
            <span className={cn('block tabular-nums', i === 2 ? 'text-titre font-bold' : 'text-texte font-semibold', c.valeur < 0 ? 'text-alerte' : 'text-encre')}>
              {c.signe ? plus(c.valeur) : ''}
              <Montant valeur={c.valeur} />
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-mention text-gris">
        {cumul.premier ? 'Premier mois du cumul : il part du solde déclaré dans les Réglages (0 sinon). ' : `Ce qui restait à la fin ${precedent} est reporté ici. `}
        Revenus − charges − épargne versée, ajoutés au report{nature ? ` (${nature})` : ''}. Solde de départ :{' '}
        <Link to="/reglages" className="font-semibold text-lien hover:underline">
          Réglages
        </Link>
        .
      </p>
    </section>
  )
}
