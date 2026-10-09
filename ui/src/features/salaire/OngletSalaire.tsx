import { decalerMois, lireCleMois } from '@mysalary/moteur'
import { deMois, formaterDate, formaterMois, formaterMontant, type MoisBudgetaireDto, type MoisCumul, type PaieDto, type VersionContratDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeNature } from '../../components/Badges'
import { Bouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Cellule } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { BlocTotaux, Identite, Pastille } from '../../components/Elements'
import { IconePlusRond } from '../../components/icones'
import { Menu } from '../../components/Menu'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { FormulaireContrat } from './FormulaireContrat'
import { PanneauPaie } from './PanneauPaie'
import { useCumul } from '../mois/requetes'
import { NATURES_CUMUL } from '../mois/saisie'
import { useContrats, useCreerContrat, useModifierContrat, useMoisCourant, usePaies, useSupprimerContrat } from './requetes'
import { fenetreMois, moisAbrege, paieAConfirmer, resumeContrat, statutPaie, totauxPaies, versionPour, type Ton } from './saisie'

const COLONNES = 'grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,0.85fr)_28px] items-center gap-2'

const TONS_TEXTE: Record<Ton, string> = {
  positif: 'text-positif',
  alerte: 'text-alerte',
  info: 'text-info',
  neutre: 'text-gris',
}

type PanneauOuvert = { paie: PaieDto; mode: 'detail' | 'primes' | 'reception' } | null
type PanneauContrat = { mode: 'nouvelle' } | { mode: 'corriger'; version: VersionContratDto } | null

/** Mon plan › Salaire & primes (UX.md § 5.11) : contrat, paies, mois budgétaire en cours. */
export function OngletSalaire() {
  const contrats = useContrats()
  const mois = useMoisCourant()

  if (contrats.isPending || mois.isPending) return <Squelette />
  if (contrats.isError || mois.isError) {
    return (
      <Carte espacement="large">
        <div className="rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de charger ton salaire.</p>
          <Bouton
            variante="contour"
            taille="sm"
            className="mt-4"
            onClick={() => {
              void contrats.refetch()
              void mois.refetch()
            }}
          >
            Réessayer
          </Bouton>
        </div>
      </Carte>
    )
  }
  if (contrats.data.length === 0) return <PremierContrat aujourdhui={mois.data.aujourdhui} />
  return <Salaire versions={contrats.data} mois={mois.data} />
}

function Squelette() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12" aria-label="Chargement du salaire">
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
function PremierContrat({ aujourdhui }: { aujourdhui: string }) {
  const creer = useCreerContrat()
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <TitreSection
            titre="Ton salaire"
            sousTitre={
              <>
                Décris ta paie <span className="font-semibold text-encre-2">une seule fois</span>. Ensuite, tu confirmeras seulement chaque paie reçue.
              </>
            }
          />
          <div className="mt-6">
            <FormulaireContrat
              aujourdhui={aujourdhui}
              libelleBouton="Enregistrer mon salaire"
              chargement={creer.isPending}
              onEnregistrer={(saisie) => creer.mutateAsync(saisie).then(() => toast('Salaire enregistré. Tes mois suivent maintenant ta paie.'))}
            />
          </div>
        </Carte>
      </motion.div>
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte titre="Pourquoi c’est utile">
          <ol className="flex flex-col gap-4 text-texte-sm text-gris">
            <li>
              <span className="font-semibold text-encre">1. Le contrat</span> dit ce qui est habituel : montant et jour de paie.
            </li>
            <li>
              <span className="font-semibold text-encre">2. Chaque paie</span> est d’abord prévue, puis tu la confirmes avec la date et le montant réels.
            </li>
            <li>
              <span className="font-semibold text-encre">3. Ton mois</span> va d’une paie à la suivante. La paie du 27 janvier finance février.
            </li>
          </ol>
        </Carte>
      </motion.div>
    </div>
  )
}

function Salaire({ versions, mois }: { versions: VersionContratDto[]; mois: MoisBudgetaireDto }) {
  const naviguer = useNavigate()
  const [decalage, setDecalage] = useState(0)
  const [panneau, setPanneau] = useState<PanneauOuvert>(null)
  const [panneauContrat, setPanneauContrat] = useState<PanneauContrat>(null)
  const [aRetirer, setARetirer] = useState<VersionContratDto | null>(null)
  const { du, au } = fenetreMois(mois.cle, decalage)
  const paies = usePaies(du, au)
  const cumul = useCumul(du, au)
  const cumulDe = new Map((cumul.data?.mois ?? []).map((c) => [c.cle, c]))
  const creer = useCreerContrat()
  const modifier = useModifierContrat()
  const supprimer = useSupprimerContrat()

  const aujourdhui = mois.aujourdhui
  const actuelle = versionPour(versions, mois.cle)!
  const liste = paies.data?.paies ?? []
  const totaux = totauxPaies(liste)
  const aConfirmer = paieAConfirmer(liste)
  const paieMois = mois.paie
  const statutMois = paieMois ? statutPaie(paieMois, aujourdhui) : null

  // Après une écriture, le panneau suit la version à jour de la paie affichée.
  const paieOuverte = panneau ? (liste.find((p) => p.mois === panneau.paie.mois) ?? panneau.paie) : null

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <div className="flex flex-col justify-between gap-5 sm:flex-row">
            <Identite initiale="S" nom={`Salaire net · ${formaterMontant(actuelle.montantNet)}`} detail={resumeContrat(actuelle)} />
            <div className="flex flex-col gap-1 text-texte text-gris sm:items-end sm:text-right">
              <span>Depuis {formaterMois(actuelle.moisEffet)}</span>
              <span>
                {versions.length} version{versions.length > 1 ? 's' : ''} du contrat
              </span>
              <span>{mois.mode === 'cyclePaie' ? 'Mois de paie à paie' : 'Mois calendaires'}</span>
            </div>
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Mois budgétaire en cours',
              lignes: [
                { valeur: formaterMois(mois.cle, { majuscule: true }) },
                { libelle: 'Début', valeur: `${formaterDate(mois.debut)}${mois.sourceDebut === 'prevue' ? ' (prévu)' : ''}` },
                { libelle: 'Fin', valeur: `${formaterDate(mois.fin)}${mois.sourceFin === 'reelle' || mois.sourceFin === 'fige' ? '' : ' (prévu)'}` },
              ],
            }}
            droite={{
              titre: `Paie ${deMois(mois.cle, { annee: false })}`,
              lignes: paieMois
                ? [
                    { valeur: <Montant valeur={paieMois.totalRecu ?? paieMois.totalPrevu} /> },
                    { libelle: 'Statut', valeur: statutMois!.texte },
                    { libelle: 'Durée', valeur: `${mois.nbJours} jours${mois.joursRestants ? ` · ${mois.joursRestants} restants` : ''}` },
                  ]
                : [{ valeur: 'Aucune paie pour ce mois' }],
            }}
          />

          <div className="mt-7">
            <TitreSection
              titre="Paies"
              sousTitre={
                <>
                  Prévues depuis ton contrat, puis <span className="font-semibold text-encre-2">confirmées</span> à la réception.
                </>
              }
              action={
                <div className="flex items-center gap-2">
                  <Bouton variante="puce" taille="sm" aria-label="Mois plus anciens" onClick={() => setDecalage((d) => d - 6)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Bouton>
                  {decalage !== 0 && (
                    <Bouton variante="puce" taille="sm" onClick={() => setDecalage(0)}>
                      Aujourd’hui
                    </Bouton>
                  )}
                  <Bouton variante="puce" taille="sm" aria-label="Mois suivants" onClick={() => setDecalage((d) => d + 6)}>
                    <ChevronRight className="h-4 w-4" />
                  </Bouton>
                </div>
              }
            />
          </div>

          <div className="relative -mx-1 mt-5 overflow-x-auto px-1">
            <div className="min-w-[820px] lg:min-w-[720px]">
              <div className={cn(COLONNES, 'border-y border-filet px-4 py-4 text-texte-sm text-gris')}>
                <span>Mois financé</span>
                <span>Date</span>
                <span>Prévu</span>
                <span>Reçu</span>
                <span title="Ce qui resterait sur ton compte à la fin du mois : report du mois précédent + reste du mois (lot 13).">Cumul fin de mois</span>
                <span>Statut</span>
                <span />
              </div>
              {paies.isError ? (
                <div className="mt-5 rounded-bouton bg-alerte-fond p-4 text-texte-sm text-alerte">
                  Impossible de charger les paies.{' '}
                  <Bouton variante="lien" taille="texte" onClick={() => void paies.refetch()}>
                    Réessayer
                  </Bouton>
                </div>
              ) : liste.length === 0 && !paies.isPending ? (
                <p className="px-4 pt-5 text-texte-sm text-gris">
                  Aucune paie entre {formaterMois(du)} et {formaterMois(au)} : ton contrat commence en {formaterMois(versions[0]!.moisEffet)}.
                </p>
              ) : (
                <ul className={cn('flex flex-col gap-3 pt-5 transition-opacity', paies.isPlaceholderData && 'opacity-60')} aria-label="Paies">
                  {liste.map((p) => {
                    const statut = statutPaie(p, aujourdhui, { court: true })
                    const courant = p.mois === mois.cle
                    return (
                      <li key={p.mois} className={COLONNES}>
                        <button
                          type="button"
                          onClick={() => setPanneau({ paie: p, mode: 'detail' })}
                          className={cn(
                            'flex h-[46px] items-center truncate rounded-champ border bg-white px-4 text-left text-texte font-semibold text-encre transition-colors hover:border-primaire',
                            courant ? 'border-primaire' : 'border-filet',
                          )}
                          aria-label={`Ouvrir la paie ${deMois(p.mois)}`}
                        >
                          <span className="hidden truncate 2xl:inline">{formaterMois(p.mois, { majuscule: true })}</span>
                          <span className="truncate 2xl:hidden">{moisAbrege(p.mois)}</span>
                        </button>
                        <Cellule attenue={p.statut !== 'recue'}>{formaterDate(p.dateReelle ?? p.datePrevue, 'court')}</Cellule>
                        <Cellule prefixe="DH" attenue>
                          <Montant valeur={p.totalPrevu} sansDevise />
                        </Cellule>
                        {p.totalRecu === null ? (
                          <div className="flex h-[46px] items-center">
                            <BadgeNature nature="prevu" />
                          </div>
                        ) : (
                          <Cellule prefixe="DH">
                            <Montant valeur={p.totalRecu} sansDevise className={cn((p.ecart ?? 0) < 0 && 'text-alerte')} />
                          </Cellule>
                        )}
                        <CelluleCumul cumul={cumulDe.get(p.mois)} chargement={cumul.isPending} />
                        <span className={cn('truncate text-texte-sm font-medium', TONS_TEXTE[statut.ton])} title={statutPaie(p, aujourdhui).texte}>
                          {statut.texte}
                        </span>
                        {p.statut === 'recue' ? (
                          <span />
                        ) : (
                          <button
                            type="button"
                            aria-label={`Ajouter une prime à la paie ${deMois(p.mois)}`}
                            onClick={() => setPanneau({ paie: p, mode: 'primes' })}
                            className="text-primaire hover:text-primaire-survol"
                          >
                            <IconePlusRond className="h-[26px] w-[26px]" />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              {liste.length > 0 && (
                <p className="px-4 pt-4 text-mention text-gris">
                  Cumul fin de mois : report du mois précédent + reste du mois. Réel en noir ; <span className="italic">estimation</span> (mois en cours) et{' '}
                  <span className="italic">prévu</span> en gris italique.
                </p>
              )}
            </div>
          </div>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-titre text-encre">Historique du salaire</h3>
                <Bouton variante="lien" taille="texte" onClick={() => setPanneauContrat({ mode: 'nouvelle' })}>
                  Mon salaire change
                </Bouton>
              </div>
              <ul className="flex flex-col gap-3 rounded-bouton bg-interne p-5 shadow-bouton" aria-label="Versions du contrat">
                {[...versions].reverse().map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-texte font-medium text-encre">
                        <Montant valeur={v.montantNet} />
                        {v.id === actuelle.id && <span className="ml-2 text-mention text-positif">en vigueur</span>}
                      </span>
                      <span className="block truncate text-texte-sm text-gris">
                        Dès {formaterMois(v.moisEffet)} · le {v.jourHabituel}
                      </span>
                    </span>
                    <Menu
                      declencheur={
                        <button type="button" aria-label={`Options de la version ${deMois(v.moisEffet)}`} className="rounded-pilule p-1 text-gris-icone hover:text-encre">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      }
                      actions={[
                        { libelle: 'Corriger', onSelect: () => setPanneauContrat({ mode: 'corriger', version: v }) },
                        ...(versions.length > 1 ? [{ libelle: 'Retirer', danger: true, onSelect: () => setARetirer(v) }] : []),
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <BlocTotaux
              lignes={[
                { libelle: `Prévu, ${formaterMois(du, { annee: false })} → ${formaterMois(au)}`, valeur: <Montant valeur={totaux.prevu} />, fort: true },
                { libelle: 'Écart sur les paies reçues', valeur: <Montant valeur={totaux.ecart} className={cn(totaux.ecart < 0 && 'text-alerte')} /> },
              ]}
              total={{ libelle: 'Reçu sur la période', valeur: <Montant valeur={totaux.recu} /> }}
            />
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <Carte titre="Mois en cours">
          <Identite
            initiale={formaterMois(mois.cle, { majuscule: true }).charAt(0)}
            nom={formaterMois(mois.cle, { majuscule: true })}
            detail={`${formaterDate(mois.debut, 'court')} → ${formaterDate(mois.fin, 'court')}`}
          />
          <Separateur className="my-5" />
          <p className="text-texte font-medium text-encre">
            {mois.nbJours} jours{mois.joursRestants !== null && <span className="text-gris"> · {mois.joursRestants} restants</span>}
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-texte-sm text-gris" aria-label="Semaines du mois">
            {mois.semaines.map((s) => (
              <li key={s.numero} className="flex justify-between gap-3">
                <span>Semaine {s.numero}</span>
                <span className="chiffres">
                  {formaterDate(s.debut, 'court')} → {formaterDate(s.fin, 'court')} · {s.nbJours} j
                </span>
              </li>
            ))}
          </ul>
          {mois.sansContrat && <p className="mt-3 text-mention text-attention">Mois civils en attendant ton salaire.</p>}
          <Bouton variante="teinte" taille="md" className="mt-6 w-full" onClick={() => naviguer('/mois')}>
            Ouvrir le mois
          </Bouton>
        </Carte>

        <Carte titre="Paie à confirmer" precision="(MAD)">
          {aConfirmer ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-montant text-encre">
                  <Montant valeur={aConfirmer.totalPrevu} anime />
                </span>
                <span className="text-texte text-gris">(paie {deMois(aConfirmer.mois, { annee: false })})</span>
              </div>
              <div className="mt-5">
                <Pastille ton={statutPaie(aConfirmer, aujourdhui).ton}>{statutPaie(aConfirmer, aujourdhui).texte}</Pastille>
              </div>
              <Separateur className="my-6" />
              <p className="text-texte-sm text-gris">
                {aConfirmer.lignes.length > 1
                  ? `Salaire + ${aConfirmer.lignes.length - 1} prime${aConfirmer.lignes.length > 2 ? 's' : ''} prévue${aConfirmer.lignes.length > 2 ? 's' : ''}.`
                  : 'Salaire seul, aucune prime prévue.'}{' '}
                Le montant reste « prévu » tant que tu ne l’as pas confirmé.
              </p>
            </>
          ) : (
            <p className="text-texte-sm text-gris">Toutes les paies affichées sont confirmées.</p>
          )}
        </Carte>

        <div className="grid grid-cols-2 gap-4">
          <Bouton variante="blanc" onClick={() => setPanneauContrat({ mode: 'nouvelle' })}>
            Salaire change
          </Bouton>
          <Bouton variante="blanc" disabled={!aConfirmer} onClick={() => aConfirmer && setPanneau({ paie: aConfirmer, mode: 'primes' })}>
            <IconePlusRond className="h-5 w-5" /> Prime
          </Bouton>
        </div>
        <Bouton className="w-full" disabled={!aConfirmer} onClick={() => aConfirmer && setPanneau({ paie: aConfirmer, mode: 'reception' })}>
          Confirmer la paie
        </Bouton>
      </motion.div>

      <PanneauPaie paie={paieOuverte} aujourdhui={aujourdhui} modeInitial={panneau?.mode} onFermer={() => setPanneau(null)} />

      <Panneau
        ouvert={panneauContrat !== null}
        onFermer={() => setPanneauContrat(null)}
        titre={panneauContrat?.mode === 'corriger' ? 'Corriger une version' : 'Mon salaire change'}
        description={
          panneauContrat?.mode === 'corriger'
            ? 'Pour une erreur de saisie. Les paies déjà reçues gardent leurs montants.'
            : 'Une nouvelle version, à partir du mois choisi. Le passé ne change pas.'
        }
      >
        {panneauContrat && (
          <FormulaireContrat
            key={panneauContrat.mode === 'corriger' ? panneauContrat.version.id : 'nouvelle'}
            aujourdhui={aujourdhui}
            initial={
              panneauContrat.mode === 'corriger'
                ? panneauContrat.version
                : { ...actuelle, moisEffet: decalerMois(lireCleMois(mois.cle), 1) }
            }
            libelleBouton={panneauContrat.mode === 'corriger' ? 'Enregistrer la correction' : 'Enregistrer la nouvelle version'}
            chargement={creer.isPending || modifier.isPending}
            onEnregistrer={async (saisie) => {
              if (panneauContrat.mode === 'corriger') {
                await modifier.mutateAsync({ id: panneauContrat.version.id, ...saisie })
                toast('Version corrigée.')
              } else {
                await creer.mutateAsync(saisie)
                toast(`Nouveau salaire à partir ${deMois(saisie.moisEffet)}.`)
              }
              setPanneauContrat(null)
            }}
          />
        )}
      </Panneau>

      <Confirmation
        ouvert={aRetirer !== null}
        onFermer={() => setARetirer(null)}
        titre="Retirer cette version ?"
        description={aRetirer ? `La version ${deMois(aRetirer.moisEffet)} disparaît ; la version précédente s’applique à nouveau. Les paies reçues ne changent pas.` : ''}
        libelleConfirmer="Retirer"
        chargement={supprimer.isPending}
        onConfirmer={() =>
          aRetirer &&
          supprimer.mutate(aRetirer.id, {
            onSuccess: () => {
              setARetirer(null)
              toast('Version retirée.')
            },
            onError: () => toast('Le retrait n’a pas abouti. Réessaie.'),
          })
        }
      />
    </div>
  )
}

/**
 * Cumul de fin de mois (lot 13) dans le tableau des paies : réel en clair ; estimation (mois en cours) et prévu
 * en gris italique, avec leur mot en infobulle et dans la légende sous le tableau ; « — » avant le début du suivi.
 */
function CelluleCumul({ cumul, chargement }: { cumul: MoisCumul | undefined; chargement: boolean }) {
  if (!cumul || cumul.cumul === null) {
    return <span className="px-4 text-texte-sm text-gris" title={chargement ? undefined : 'Avant le début du suivi'}>{chargement ? '…' : '—'}</span>
  }
  const mot = NATURES_CUMUL[cumul.nature]
  return (
    <Cellule prefixe="DH" attenue={mot !== null} titre={mot ? `${formaterMontant(cumul.cumul)} (${mot})` : formaterMontant(cumul.cumul)}>
      <Montant valeur={cumul.cumul} sansDevise className={cn(mot && 'italic', cumul.cumul < 0 && 'text-alerte')} />
    </Cellule>
  )
}
