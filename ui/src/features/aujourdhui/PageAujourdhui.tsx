import { formaterDate, formaterMois, formaterMontant, type AlerteDto, type AujourdhuiDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { AlertTriangle, CalendarClock, CheckCircle2, PiggyBank, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeNature } from '../../components/Badges'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Identite } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { Montant } from '../../components/Montant'
import { TuileIndicateur } from '../../components/premium/TuileIndicateur'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { ListeRecommandations } from '../conseils/Conseils'
import { texteRetard } from '../conseils/saisie'
import { IconeCategorie } from '../charges/IconeCategorie'
import { useCategories } from '../charges/requetes'
import { part } from '../charges/saisie'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { useUtilisateurCourant } from '../compte/requetes'
import { PanneauRevenuRecu } from '../revenus/PanneauRevenuRecu'
import { PanneauPaie } from '../salaire/PanneauPaie'
import { usePaies } from '../salaire/requetes'
import type { Ton } from '../salaire/saisie'
import { useAujourdhui } from './requetes'
import { dateDuJour, estAlertePaie, groupesJours, phraseSemainePassee, statutEvenement, textePoste, texteSurveillance } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'
const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }

/** Aujourd'hui (ux-ui.md (UX) § 5.2) : où j'en suis, en 5 secondes. */
export function PageAujourdhui() {
  const donnees = useAujourdhui()
  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Aujourd’hui' }, ...(donnees.data ? [{ libelle: dateDuJour(donnees.data.aujourdhui) }] : [])]} />
      </motion.div>
      {donnees.isError ? (
        <Carte espacement="large" className="max-w-2xl">
          <div className="rounded-bouton bg-alerte-fond p-5">
            <p className="text-texte font-medium text-alerte">Impossible de charger ta journée.</p>
            <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void donnees.refetch()}>
              Réessayer
            </Bouton>
          </div>
        </Carte>
      ) : donnees.isPending ? (
        <div className={GRILLE} aria-label="Chargement de ta journée">
          <div className="h-[520px] animate-pulse rounded-carte bg-white shadow-carte" />
          <div className="h-80 animate-pulse rounded-carte bg-white shadow-carte" />
        </div>
      ) : donnees.data.sansContrat ? (
        <EtatVide />
      ) : (
        <Journee donnees={donnees.data} />
      )}
    </motion.div>
  )
}

function EtatVide() {
  return (
    <Carte espacement="large" className="max-w-2xl">
      <h1 className="text-titre text-encre">Ajoute ton salaire pour voir ton reste du mois.</h1>
      <p className="mt-2 text-texte text-gris">Avec ton salaire et son jour de paie, MySalary calcule ce qu’il te reste à dépenser chaque jour, chaque semaine et chaque mois.</p>
      <Link to="/plan" className={styleBouton({ className: 'mt-6' })}>
        Ajouter mon salaire
      </Link>
    </Carte>
  )
}

function Journee({ donnees }: { donnees: AujourdhuiDto }) {
  const utilisateur = useUtilisateurCourant()
  const { ouvrir, ouvrirVersement } = useSaisieRapide()
  const [paieOuverte, setPaieOuverte] = useState<string | null>(null)
  const [revenuOuvert, setRevenuOuvert] = useState(false)
  const { aujourdhui, indicateurs: k, tableau } = donnees
  const reste = k.resteADepenser
  const semaine = k.resteSemaine
  const prenom = utilisateur?.prenom ?? ''

  return (
    <div className="flex flex-col gap-8">
      <Indicateurs donnees={donnees} />

      <div className={GRILLE}>
        <div className="flex min-w-0 flex-col gap-8">
          <motion.div variants={elementApparition}>
            <Carte espacement="large">
              {utilisateur && utilisateur.onboardingEtape > 0 && !utilisateur.onboardingTermine && (
                <p className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-champ bg-info-fond px-4 py-3 text-texte-sm text-info">
                  <span>
                    <span className="font-semibold">Ta mise en route n’est pas terminée</span> (étape {utilisateur.onboardingEtape} sur 10).
                  </span>
                  <Link to="/onboarding" className="font-semibold underline underline-offset-2">
                    Reprendre
                  </Link>
                </p>
              )}
              <div className="flex flex-col justify-between gap-5 sm:flex-row">
                <Identite initiale={prenom.charAt(0).toUpperCase() || '·'} nom={prenom ? `Bonjour ${prenom}` : 'Bonjour'} detail={dateDuJour(aujourdhui)} />
                <div className="flex flex-col gap-1 text-texte text-gris sm:items-end sm:text-right">
                  <span>Mois de {formaterMois(k.mois.cle)}</span>
                  <span>
                    {formaterDate(k.mois.debut, 'court')} → {formaterDate(k.mois.fin, 'court')}
                  </span>
                </div>
              </div>

              <CarteBandeau
                className="mt-7"
                gauche={{
                  titre: reste?.nature === 'prevu' ? 'Tu peux encore dépenser (prévu)' : 'Tu peux encore dépenser',
                  lignes: reste
                    ? [
                        { valeur: <Montant valeur={reste.montant} anime className={cn('text-montant', reste.montant < 0 && 'text-peche-clair')} /> },
                        { libelle: `Soit, pendant ${reste.joursRestants} jour${reste.joursRestants > 1 ? 's' : ''}, par jour`, valeur: <Montant valeur={reste.parJour} /> },
                      ]
                    : [{ valeur: '—' }],
                }}
                droite={{
                  titre: 'Cette semaine, il reste',
                  lignes: semaine
                    ? [
                        { valeur: <Montant valeur={semaine.reste} className={cn(semaine.reste < 0 && 'text-peche-clair')} /> },
                        { libelle: `Par jour, sur ${semaine.joursRestants} jour${semaine.joursRestants > 1 ? 's' : ''}`, valeur: <Montant valeur={semaine.parJour} /> },
                      ]
                    : [{ valeur: 'Pas d’enveloppe' }],
                }}
              />

              {reste && (
                <p className={cn('mt-5 rounded-champ px-4 py-3 text-texte-sm', reste.montant < 0 ? 'bg-alerte-fond text-alerte' : 'bg-teinte text-encre-2')}>
                  {reste.montant < 0 && <span className="font-semibold">Le mois est dépassé de {formaterMontant(-reste.montant)}. </span>}
                  D’où vient ce chiffre : revenus du mois {formaterMontant(reste.revenus)}, moins ce que tu as déjà sorti {formaterMontant(reste.sorties)}, moins ce qu’il reste à payer{' '}
                  {formaterMontant(reste.engagements)}, moins l’épargne à verser {formaterMontant(reste.epargneRestante)}.
                  {reste.nature === 'prevu' && reste.montant >= 0 && ' La paie du mois est comptée comme prévue tant qu’elle n’est pas confirmée.'}
                </p>
              )}

              {semaine && (
                <div className="mt-5">
                  <BarreProgression
                    valeur={part(semaine.depense, semaine.disponible)}
                    libelle={`Semaine : ${Math.round(part(semaine.depense, semaine.disponible) * 100)} % du disponible dépensé`}
                  />
                  <p className="mt-2 text-mention text-gris">
                    Semaine {semaine.numero} ({formaterDate(semaine.debut, 'court')} – {formaterDate(semaine.fin, 'court')}) : <Montant valeur={semaine.depense} /> dépensés sur <Montant valeur={semaine.disponible} />.{' '}
                    <Link to={`/mois?mois=${k.mois.cle}&onglet=semaines`} className="font-semibold text-lien hover:underline">
                      Voir les semaines
                    </Link>
                  </p>
                </div>
              )}

              {donnees.semainePassee && <SemainePassee semaine={donnees.semainePassee} cle={k.mois.cle} />}

              <div className="mt-7 flex flex-wrap gap-3 border-t border-filet pt-6">
                <Bouton taille="md" onClick={() => ouvrir()}>
                  Ajouter une dépense
                </Bouton>
                <Bouton variante="teinte" taille="md" onClick={() => setRevenuOuvert(true)}>
                  Noter un revenu reçu
                </Bouton>
                <Link to="/mois" className={styleBouton({ variante: 'contour', taille: 'md' })}>
                  Ouvrir le mois
                </Link>
              </div>
            </Carte>
          </motion.div>

          <motion.div variants={elementApparition}>
            <Carte espacement="large">
              <section aria-label="À faire">
                <TitreSection
                  titre="À faire"
                  sousTitre="Paie à confirmer, échéances, versements d’épargne."
                  action={
                    donnees.alertes.length > 0 ? (
                      <span className="grid h-7 min-w-7 place-items-center rounded-pilule bg-primaire px-2 text-texte-sm font-bold text-white" aria-label={`${donnees.alertes.length} action${donnees.alertes.length > 1 ? 's' : ''}`}>
                        {donnees.alertes.length}
                      </span>
                    ) : undefined
                  }
                />
                {donnees.alertes.length === 0 ? (
                  <p className="mt-4 flex items-center gap-2 rounded-bouton bg-interne p-4 text-texte-sm text-gris">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-positif" aria-hidden />
                    Rien à faire aujourd’hui : tout ce qui était prévu est à jour.
                  </p>
                ) : (
                  <ul className="mt-4 flex flex-col gap-3">
                    {donnees.alertes.map((a) => (
                      <ActionAttendue key={a.cle} alerte={a} onConfirmerPaie={(mois) => setPaieOuverte(mois)} onVerser={(objectifId, montant) => ouvrirVersement({ objectifId, montant })} />
                    ))}
                  </ul>
                )}
              </section>
            </Carte>
          </motion.div>

          <motion.div variants={elementApparition}>
            <PostesDuMois tableau={tableau} cle={k.mois.cle} />
          </motion.div>

          <motion.div variants={elementApparition}>
            <Carte espacement="large">
              <section aria-label="7 prochains jours">
                <TitreSection titre="7 prochains jours" sousTitre="Paie, revenus et charges datés." />
                <ProchainsJours donnees={donnees} />
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-texte-sm font-semibold text-lien">
                  <Link to="/calendrier" className="hover:underline">
                    Ouvrir le calendrier
                  </Link>
                  <Link to="/annee" className="hover:underline">
                    Voir l’année
                  </Link>
                </div>
              </section>
            </Carte>
          </motion.div>
        </div>

        <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
          <ASurveiller tableau={tableau} />
          {donnees.recommandations.length > 0 && (
            <Carte titre="Suggestions">
              <ListeRecommandations recommandations={donnees.recommandations} />
            </Carte>
          )}
          <CarteObjectif donnees={donnees} />
        </motion.div>
      </div>

      {paieOuverte && <PaieAConfirmer mois={paieOuverte} aujourdhui={aujourdhui} onFermer={() => setPaieOuverte(null)} />}
      <PanneauRevenuRecu ouvert={revenuOuvert} onFermer={() => setRevenuOuvert(false)} aujourdhui={aujourdhui} />
    </div>
  )
}

/** Trois chiffres du mois, en mots simples : reçu, dépensé, épargné (le réel ; le prévu en petit). Chacun vient du moteur. */
function Indicateurs({ donnees }: { donnees: AujourdhuiDto }) {
  const { tauxEpargne: e, tauxCharges: c } = donnees.indicateurs
  return (
    <motion.section variants={elementApparition} aria-label="Indicateurs du mois" className="grid grid-cols-3 gap-2 sm:gap-4">
      <TuileIndicateur
        libelle="Reçu"
        icone={<Wallet className="h-5 w-5" aria-hidden />}
        valeur={<Montant valeur={c.revenusReels} anime />}
        detail={<>sur <Montant valeur={c.revenusPrevus} /> prévus</>}
      />
      <TuileIndicateur
        libelle="Dépensé"
        icone={<Receipt className="h-5 w-5" aria-hidden />}
        ton={c.sortiesReelles > c.chargesPrevues ? 'alerte' : 'neutre'}
        valeur={<Montant valeur={c.sortiesReelles} anime />}
        detail={<>sur <Montant valeur={c.chargesPrevues} /> prévus</>}
      />
      <TuileIndicateur
        libelle="Épargné"
        icone={<PiggyBank className="h-5 w-5" aria-hidden />}
        ton={e.epargnePrevue > 0 && e.epargneReelle >= e.epargnePrevue ? 'positif' : 'neutre'}
        valeur={<Montant valeur={e.epargneReelle} anime />}
        detail={e.epargnePrevue > 0 ? <>sur <Montant valeur={e.epargnePrevue} /> prévus</> : 'Rien de prévu'}
      />
    </motion.section>
  )
}

/** Où part l'argent du mois : les postes les plus lourds, avec leur part des revenus ; les enveloppes avec leur rythme. */
function PostesDuMois({ tableau, cle }: { tableau: AujourdhuiDto['tableau']; cle: string }) {
  const [tout, setTout] = useState(false)
  const visibles = tout ? tableau.postes : tableau.postes.slice(0, 5)
  return (
    <Carte espacement="large">
      <section aria-label="Où part ton argent">
        <TitreSection titre="Où part ton argent" sousTitre="Les charges du mois, de la plus lourde à la plus légère, en part de tes revenus prévus." />
        {tableau.postes.length === 0 ? (
          <p className="mt-4 rounded-bouton bg-interne p-4 text-texte-sm text-gris">Aucune charge ce mois-ci.</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-4">
            {visibles.map((p) => (
              <li key={p.cle} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-texte font-semibold text-encre">{p.libelle}</span>
                  <span className="shrink-0 text-texte-sm font-semibold text-encre-2">{p.part === null ? '—' : `${Math.round(p.part * 100)} %`}</span>
                </div>
                {p.famille === 'enveloppe' ? (
                  <BarreProgression
                    className={cn('mt-2', p.surveillance === 'depassee' && '[&>div:first-child]:bg-alerte')}
                    valeur={p.consommation ?? 0}
                    rythme={tableau.avancement}
                    libelle={`${p.libelle} : ${Math.round((p.consommation ?? 0) * 100)} % du budget dépensé`}
                  />
                ) : (
                  <div className="mt-2 h-2 overflow-hidden rounded-pilule bg-sauge-100" aria-hidden>
                    <motion.div className="h-full rounded-pilule bg-sauge-400" initial={{ width: 0 }} animate={{ width: `${Math.min(1, p.part ?? 0) * 100}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                )}
                <p className={cn('mt-1.5 text-mention', p.surveillance ? 'text-alerte' : 'text-gris')}>
                  {textePoste(p)}
                  {p.famille === 'enveloppe' && p.surveillance === 'rythme' && ' · plus vite que le mois'}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-texte-sm font-semibold text-lien">
          {tableau.postes.length > 5 && (
            <button type="button" onClick={() => setTout((v) => !v)} className="hover:underline">
              {tout ? 'Voir moins' : `Voir les ${tableau.postes.length - 5} autres postes`}
            </button>
          )}
          <Link to={`/mois?mois=${cle}`} className="hover:underline">
            Voir le bilan du mois
          </Link>
        </div>
      </section>
    </Carte>
  )
}

/** À surveiller : enveloppes dépassées ou trop rapides, et les plus grosses dépenses du mois. */
function ASurveiller({ tableau }: { tableau: AujourdhuiDto['tableau'] }) {
  const categories = useCategories()
  const parId = new Map((categories.data ?? []).map((c) => [c.id, c]))
  const enveloppes = tableau.postes.filter((p) => p.surveillance !== null)
  return (
    <Carte titre="À surveiller">
      <section aria-label="Enveloppes à surveiller">
        {enveloppes.length === 0 ? (
          <p className="flex items-center gap-2 text-texte-sm text-gris">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-positif" aria-hidden />
            Toutes les enveloppes suivent le rythme du mois.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {enveloppes.map((p) => (
              <li key={p.cle} className="flex gap-3 rounded-bouton bg-alerte-fond/60 p-3">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-alerte" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-texte font-semibold text-encre">{p.libelle}</span>
                  <span className="block text-texte-sm text-encre-2">{texteSurveillance(p, tableau.avancement)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {tableau.grossesDepenses.length > 0 && (
        <section aria-label="Grosses dépenses du mois" className="mt-6 border-t border-filet pt-5">
          <h3 className="mb-3 text-texte-sm font-semibold text-encre">Grosses dépenses du mois</h3>
          <ul className="flex flex-col gap-2.5">
            {tableau.grossesDepenses.map((d) => {
              const categorie = parId.get(d.categorieId)
              return (
                <li key={d.id} className="flex items-center gap-3">
                  <IconeCategorie icone={categorie?.icone ?? 'autre'} className="h-8 w-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-texte-sm font-semibold text-encre">{d.libelle || d.ligne || categorie?.libelle || 'Dépense'}</span>
                    <span className="block truncate text-mention text-gris">
                      {formaterDate(d.date, 'court')}
                      {categorie ? ` · ${categorie.libelle}` : ''}
                    </span>
                  </span>
                  <Montant valeur={d.montant} className="shrink-0 text-texte-sm font-semibold text-encre" />
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </Carte>
  )
}

/** Une action attendue : la paie se confirme ici même ; le reste mène à l'écran qui la règle. */
function ActionAttendue({ alerte: a, onConfirmerPaie, onVerser }: { alerte: AlerteDto; onConfirmerPaie: (mois: string) => void; onVerser: (objectifId: string, montant: number) => void }) {
  const paie = estAlertePaie(a) && 'mois' in a ? a.mois : null
  return (
    <li className="flex gap-3 rounded-bouton bg-interne p-4 shadow-bouton">
      {paie ? <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primaire" aria-hidden /> : a.type === 'versementPrevu' ? <PiggyBank className="mt-0.5 h-4 w-4 shrink-0 text-primaire" aria-hidden /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="text-texte font-semibold text-encre">{a.titre}</p>
        <p className="mt-1 text-texte-sm text-gris">{a.message}</p>
        {paie ? (
          <Bouton variante="puce" taille="sm" className="mt-3 h-8 px-3" onClick={() => onConfirmerPaie(paie)}>
            Confirmer la paie
          </Bouton>
        ) : a.type === 'versementPrevu' ? (
          <Bouton variante="puce" taille="sm" className="mt-3 h-8 px-3" onClick={() => onVerser(a.objectifId, a.reste)}>
            {a.action.libelle}
          </Bouton>
        ) : (
          <Link to={a.action.chemin} className={styleBouton({ variante: 'puce', taille: 'sm', className: 'mt-3 h-8 px-3' })}>
            {a.action.libelle}
          </Link>
        )}
      </div>
    </li>
  )
}

/** Confirmation de la paie depuis Aujourd'hui : le panneau de Mon plan › Salaire, ouvert sur la réception. */
function PaieAConfirmer({ mois, aujourdhui, onFermer }: { mois: string; aujourdhui: string; onFermer: () => void }) {
  const paies = usePaies(mois, mois)
  const paie = paies.data?.paies.find((p) => p.mois === mois) ?? null
  return <PanneauPaie paie={paie} aujourdhui={aujourdhui} modeInitial="reception" onFermer={onFermer} />
}

function ProchainsJours({ donnees }: { donnees: AujourdhuiDto }) {
  const groupes = groupesJours(donnees.prochainsJours, donnees.aujourdhui)
  if (groupes.length === 0) return <p className="mt-4 rounded-bouton bg-interne p-4 text-texte-sm text-gris">Aucun revenu ni aucune charge datée dans les 7 prochains jours.</p>
  return (
    <div className="mt-4 flex flex-col gap-4">
      {groupes.map((g) => (
        <div key={g.jour}>
          <p className="mb-1.5 text-texte-sm font-semibold text-encre">{g.libelle}</p>
          <ul className="flex flex-col gap-1.5">
            {g.evenements.map((e, i) => {
              const statut = statutEvenement(e)
              return (
                <li key={`${e.libelle}-${i}`} className="flex items-center justify-between gap-3 rounded-champ border border-filet bg-white px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-texte font-medium text-encre">{e.libelle}</span>
                    <span className={cn('block text-mention', TONS[statut.ton])}>{statut.texte}</span>
                  </span>
                  <span className={cn('shrink-0 text-texte font-semibold', e.type === 'revenu' ? 'text-positif' : 'text-encre', e.statut !== 'confirme' && 'italic')}>
                    {e.type === 'revenu' ? '+' : '−'}
                    <Montant valeur={e.montant} />
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function SemainePassee({ semaine: s, cle }: { semaine: NonNullable<AujourdhuiDto['semainePassee']>; cle: string }) {
  const phrase = phraseSemainePassee(s)
  return (
    <section aria-label="Semaine passée" className="mt-5 rounded-bouton border border-filet bg-white p-4">
      <p className="text-mention font-semibold uppercase tracking-wide text-gris">
        Semaine passée · {formaterDate(s.debut, 'court')} – {formaterDate(s.fin, 'court')}
      </p>
      <p className={cn('mt-1 text-texte font-medium', TONS[phrase.ton])}>{phrase.texte}</p>
      <Link to={`/mois?mois=${cle}&onglet=semaines`} className="mt-2 inline-block text-mention font-semibold text-lien hover:underline">
        Voir le détail
      </Link>
    </section>
  )
}

function CarteObjectif({ donnees }: { donnees: AujourdhuiDto }) {
  const o = donnees.indicateurs.objectif
  if (!o) {
    return (
      <Carte titre="Objectif prioritaire">
        <p className="text-texte-sm text-gris">Aucun objectif en cours.</p>
        <Link to="/objectifs/nouveau" className={styleBouton({ variante: 'blanc', className: 'mt-5 w-full' })}>
          Créer un objectif
        </Link>
      </Carte>
    )
  }
  return (
    <Carte titre="Objectif prioritaire">
      <p className="text-texte font-semibold text-encre">{o.libelle}</p>
      <p className="mt-0.5 text-texte-sm text-gris">
        <Montant valeur={o.epargne} className="font-semibold text-encre" /> sur <Montant valeur={o.montantCible} />
      </p>
      <BarreProgression className="mt-4" valeur={o.progression} libelle={`${o.libelle} : ${Math.round(o.progression * 100)} % de la cible`} />
      <p className={cn('mt-3 flex flex-wrap items-center gap-2 text-texte-sm', o.retardMois && o.retardMois > 0 ? 'text-alerte' : 'text-gris')}>
        Estimé : {o.dateEstimee ? formaterMois(o.dateEstimee) : 'au-delà de 10 ans'} <BadgeNature nature="projete" />
      </p>
      <p className="mt-1 text-mention text-gris">{texteRetard(o)}</p>
      <Link to={`/objectifs/${o.id}`} className={styleBouton({ variante: 'blanc', className: 'mt-5 w-full' })}>
        Ouvrir l’objectif
      </Link>
    </Carte>
  )
}
