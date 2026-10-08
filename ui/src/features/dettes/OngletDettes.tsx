import { formaterDate, type DetteDto, type ResumeChargesDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BarreProgression } from '../../components/BarreProgression'
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
import { useDettes, useEnregistrerDette, useResumeCharges, useSupprimerDette } from '../charges/requetes'
import { libelleFinDette, part } from '../charges/saisie'
import { FormulaireDette } from './FormulaireDette'
import { PanneauDette } from './PanneauDette'
import { totauxDettes } from './saisie'

const COLONNES = 'grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1.15fr)_28px] items-center gap-2.5'

/** Mon plan › Dettes (UX.md § 5.11) : un total et un échéancier, jamais une charge sans fin (R9). */
export function OngletDettes() {
  const dettes = useDettes()
  const resume = useResumeCharges()

  if (dettes.isPending || resume.isPending) {
    return (
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12" aria-label="Chargement des dettes">
        <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
        <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
      </div>
    )
  }
  if (dettes.isError || resume.isError) {
    return (
      <Carte espacement="large">
        <div className="rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de charger tes dettes.</p>
          <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => [dettes, resume].forEach((q) => void q.refetch())}>
            Réessayer
          </Bouton>
        </div>
      </Carte>
    )
  }
  return <Dettes dettes={dettes.data} resume={resume.data} />
}

function Dettes({ dettes, resume }: { dettes: DetteDto[]; resume: ResumeChargesDto }) {
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [edition, setEdition] = useState<{ dette?: DetteDto } | null>(null)
  const [aSupprimer, setASupprimer] = useState<DetteDto | null>(null)
  const enregistrer = useEnregistrerDette()
  const supprimer = useSupprimerDette()

  const enCours = dettes.filter((d) => !d.etat.soldee)
  const soldees = dettes.filter((d) => d.etat.soldee)
  const totaux = totauxDettes(dettes)
  const prochaine = totaux.prochaine
  const detteOuverte = dettes.find((d) => d.id === ouverte) ?? null
  const vedette = (prochaine && dettes.find((d) => d.id === prochaine.detteId)) ?? enCours[0] ?? null

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <div className="flex flex-col justify-between gap-5 sm:flex-row">
            <Identite
              initiale="D"
              nom="Dettes"
              detail={`${enCours.length} en cours${soldees.length ? ` · ${soldees.length} soldée${soldees.length > 1 ? 's' : ''}` : ''}`}
            />
            <div className="flex flex-col gap-1 text-texte text-gris sm:items-end sm:text-right">
              <span>Un total et un échéancier</span>
              <span>Soldée, elle sort des prévisions</span>
            </div>
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Reste dû',
              lignes: [
                { valeur: <Montant valeur={totaux.restant} /> },
                { libelle: 'Déjà remboursé', valeur: <Montant valeur={totaux.paye} /> },
                { libelle: 'Ce mois', valeur: <Montant valeur={resume.duMois.totaux.dette} /> },
              ],
            }}
            droite={{
              titre: 'Prochaine échéance',
              lignes: prochaine
                ? [
                    { valeur: <Montant valeur={prochaine.attendu} /> },
                    { libelle: 'Dette', valeur: prochaine.libelle },
                    { libelle: 'Le', valeur: formaterDate(prochaine.date) },
                  ]
                : [{ valeur: 'Aucune échéance à venir' }],
            }}
          />

          <div className="mt-7">
            <TitreSection
              titre="En cours"
              sousTitre={
                <>
                  Le reste dû baisse à chaque <span className="font-semibold text-encre-2">paiement noté</span>.
                </>
              }
              action={
                <Bouton variante="puce" taille="sm" onClick={() => setEdition({})}>
                  + Ajouter
                </Bouton>
              }
            />
          </div>

          <div className="relative -mx-1 mt-5 overflow-x-auto px-1">
            <div className="min-w-[680px]">
              <div className={cn(COLONNES, 'border-y border-filet px-4 py-4 text-texte-sm text-gris')}>
                <span>Dette</span>
                <span>Auprès de</span>
                <span>Reste dû</span>
                <span>Mensualité</span>
                <span>Fin</span>
                <span />
              </div>
              {enCours.length === 0 ? (
                <p className="px-4 pt-5 text-texte-sm text-gris">
                  {dettes.length === 0 ? 'Aucune dette. Si tu dois de l’argent, note-la ici : elle sera prévue jusqu’à son dernier paiement.' : 'Toutes tes dettes sont soldées.'}
                </p>
              ) : (
                <ul className="flex flex-col gap-3 pt-5" aria-label="Dettes en cours">
                  {enCours.map((d) => (
                    <li key={d.id} className={COLONNES}>
                      <button
                        type="button"
                        onClick={() => setOuverte(d.id)}
                        title={d.libelle}
                        aria-label={`Ouvrir ${d.libelle}`}
                        className="flex h-[46px] items-center truncate rounded-champ border border-filet bg-white px-4 text-left text-texte font-semibold text-encre transition-colors hover:border-primaire"
                      >
                        {d.libelle}
                      </button>
                      <Cellule attenue={!d.creancier} titre={d.creancier || undefined}>{d.creancier || '—'}</Cellule>
                      <Cellule className="px-3" prefixe="DH">
                        <Montant valeur={d.etat.restant} sansDevise />
                      </Cellule>
                      <Cellule className="px-3" prefixe="DH" attenue>
                        <Montant valeur={d.mensualite} sansDevise />
                      </Cellule>
                      <span className={cn('truncate text-texte-sm font-medium', d.etat.echeances.some((e) => e.statut === 'enRetard') ? 'text-alerte' : 'text-gris')}>
                        {d.etat.echeances.some((e) => e.statut === 'enRetard') ? 'Échéance en retard' : libelleFinDette(d.etat).replace('Fin prévue en ', '')}
                      </span>
                      <Menu
                        declencheur={
                          <button type="button" aria-label={`Options de ${d.libelle}`} className="rounded-pilule p-1 text-gris-icone hover:text-encre">
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        }
                        actions={[
                          { libelle: 'Noter un paiement', onSelect: () => setOuverte(d.id) },
                          { libelle: 'Modifier', onSelect: () => setEdition({ dette: d }) },
                          { libelle: 'Supprimer', danger: true, onSelect: () => setASupprimer(d) },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <h3 className="mb-4 text-titre text-encre">Terminées</h3>
              <div className="rounded-bouton bg-interne p-5 shadow-bouton">
                {soldees.length === 0 ? (
                  <p className="text-texte-sm text-gris">Aucune dette soldée pour l’instant.</p>
                ) : (
                  <ul className="flex flex-col gap-3" aria-label="Dettes soldées">
                    {soldees.map((d) => (
                      <li key={d.id}>
                        <button type="button" onClick={() => setOuverte(d.id)} className="flex w-full items-center justify-between gap-3 text-left">
                          <span className="min-w-0">
                            <span className="block truncate text-texte font-medium text-encre">{d.libelle}</span>
                            <span className="block text-texte-sm text-positif">Soldée</span>
                          </span>
                          <Montant valeur={d.montantTotal} className="font-semibold text-gris" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <BlocTotaux
              lignes={[
                { libelle: 'Total à rembourser', valeur: <Montant valeur={totaux.total} />, fort: true },
                { libelle: 'Déjà remboursé', valeur: <Montant valeur={totaux.paye} /> },
              ]}
              total={{ libelle: 'Reste dû', valeur: <Montant valeur={totaux.restant} /> }}
            />
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        {vedette ? (
          <Carte titre={vedette.etat.soldee ? 'Dernière dette' : 'Dette suivie'}>
            <Identite initiale={(vedette.creancier || vedette.libelle).charAt(0).toUpperCase()} nom={vedette.libelle} detail={vedette.creancier || libelleFinDette(vedette.etat)} />
            <Separateur className="my-5" />
            <p className="text-texte font-medium text-encre">
              <Montant valeur={vedette.etat.paye} /> sur <Montant valeur={vedette.montantTotal} />
            </p>
            <BarreProgression className="mt-3" valeur={part(vedette.etat.paye, vedette.montantTotal)} libelle={`Remboursement de ${vedette.libelle}`} />
            <p className="mt-2 text-texte-sm text-gris">{libelleFinDette(vedette.etat)}</p>
            <Bouton variante="teinte" taille="md" className="mt-6 w-full" onClick={() => setOuverte(vedette.id)}>
              Voir l’échéancier
            </Bouton>
          </Carte>
        ) : (
          <Carte titre="Pourquoi un échéancier ?">
            <p className="text-texte-sm text-gris">Une dette n’est pas une charge sans fin. Avec son échéancier, MySalary la prévoit mois par mois, puis l’oublie une fois soldée.</p>
          </Carte>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Bouton variante="blanc" onClick={() => setEdition({})}>
            <IconePlusRond className="h-5 w-5" /> Dette
          </Bouton>
          <Bouton variante="blanc" disabled={!vedette} onClick={() => vedette && setEdition({ dette: vedette })}>
            Modifier
          </Bouton>
        </div>
        <Bouton className="w-full" disabled={enCours.length === 0} onClick={() => vedette && setOuverte(vedette.id)}>
          Noter un paiement
        </Bouton>
      </motion.div>

      <PanneauDette dette={detteOuverte} aujourdhui={resume.aujourdhui} onFermer={() => setOuverte(null)} />

      <Panneau
        ouvert={edition !== null}
        onFermer={() => setEdition(null)}
        titre={edition?.dette ? `Modifier « ${edition.dette.libelle} »` : 'Nouvelle dette'}
        description="Le total et la mensualité suffisent : l’échéancier se calcule seul."
      >
        {edition && (
          <FormulaireDette
            key={edition.dette?.id ?? 'nouvelle'}
            initial={edition.dette}
            aujourdhui={resume.aujourdhui}
            chargement={enregistrer.isPending}
            onEnregistrer={async (saisie) => {
              await enregistrer.mutateAsync({ ...saisie, id: edition.dette?.id })
              toast(edition.dette ? 'Dette modifiée.' : `« ${saisie.libelle} » ajoutée, avec son échéancier.`)
              setEdition(null)
            }}
          />
        )}
      </Panneau>

      <Confirmation
        ouvert={aSupprimer !== null}
        onFermer={() => setASupprimer(null)}
        titre={`Supprimer « ${aSupprimer?.libelle ?? ''} » ?`}
        description="La dette et tous ses paiements notés seront effacés. Si elle est remboursée, elle passe seule en « Terminées » : inutile de la supprimer."
        libelleConfirmer="Supprimer"
        chargement={supprimer.isPending}
        onConfirmer={() =>
          aSupprimer &&
          supprimer.mutate(aSupprimer.id, {
            onSuccess: () => {
              toast(`« ${aSupprimer.libelle} » supprimée.`)
              setASupprimer(null)
            },
            onError: () => toast('La suppression n’a pas abouti. Réessaie.'),
          })
        }
      />
    </div>
  )
}
