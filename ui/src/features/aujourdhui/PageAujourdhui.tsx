import { formaterDate, formaterMois, formaterMontant, type AlerteDto, type AujourdhuiDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeNature } from '../../components/Badges'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Identite } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { Montant } from '../../components/Montant'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { ListeRecommandations } from '../conseils/Conseils'
import { pourcentage, texteRetard } from '../conseils/saisie'
import { part } from '../charges/saisie'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { useUtilisateurCourant } from '../profils/requetes'
import { PanneauRevenuRecu } from '../revenus/PanneauRevenuRecu'
import { PanneauPaie } from '../salaire/PanneauPaie'
import { usePaies } from '../salaire/requetes'
import type { Ton } from '../salaire/saisie'
import { useAujourdhui } from './requetes'
import { dateDuJour, estAlertePaie, groupesJours, phraseSemainePassee, statutEvenement } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'
const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }

/** Aujourd'hui (UX.md § 5.2) : où j'en suis, en 5 secondes. */
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
  const { ouvrir } = useSaisieRapide()
  const [paieOuverte, setPaieOuverte] = useState<string | null>(null)
  const [revenuOuvert, setRevenuOuvert] = useState(false)
  const { aujourdhui, indicateurs: k } = donnees
  const reste = k.resteADepenser
  const semaine = k.resteSemaine
  const prenom = utilisateur?.prenom ?? ''

  return (
    <div className={GRILLE}>
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
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
              titre: reste?.nature === 'prevu' ? 'Reste à dépenser ce mois (prévu)' : 'Reste à dépenser ce mois',
              lignes: reste
                ? [
                    { valeur: <Montant valeur={reste.montant} anime className={cn('text-montant', reste.montant < 0 && 'text-peche-clair')} /> },
                    { libelle: 'Par jour', valeur: <Montant valeur={reste.parJour} /> },
                    { libelle: 'Jours restants', valeur: String(reste.joursRestants) },
                  ]
                : [{ valeur: '—' }],
            }}
            droite={{
              titre: 'Cette semaine',
              lignes: semaine
                ? [
                    { valeur: <Montant valeur={semaine.reste} className={cn(semaine.reste < 0 && 'text-peche-clair')} /> },
                    { libelle: 'Par jour', valeur: <Montant valeur={semaine.parJour} /> },
                    { libelle: 'Jours restants', valeur: String(semaine.joursRestants) },
                  ]
                : [{ valeur: 'Pas d’enveloppe' }],
            }}
          />

          {reste && (
            <p className={cn('mt-5 rounded-champ px-4 py-3 text-texte-sm', reste.montant < 0 ? 'bg-alerte-fond text-alerte' : 'bg-teinte text-encre-2')}>
              {reste.montant < 0 ? (
                <>
                  <span className="font-semibold">Le mois est dépassé de {formaterMontant(-reste.montant)}.</span> Revenus {formaterMontant(reste.revenus)} − sorties {formaterMontant(reste.sorties)} − charges
                  encore à payer {formaterMontant(reste.engagements)} − épargne prévue {formaterMontant(reste.epargneRestante)}.
                </>
              ) : (
                <>
                  Revenus {formaterMontant(reste.revenus)} − sorties {formaterMontant(reste.sorties)} − charges encore à payer {formaterMontant(reste.engagements)} − épargne prévue{' '}
                  {formaterMontant(reste.epargneRestante)}.{reste.nature === 'prevu' && ' La paie du mois est comptée comme prévue tant qu’elle n’est pas confirmée.'}
                </>
              )}
            </p>
          )}

          {semaine && (
            <div className="mt-5">
              <BarreProgression valeur={part(semaine.depense, semaine.disponible)} libelle={`Semaine : ${Math.round(part(semaine.depense, semaine.disponible) * 100)} % du disponible dépensé`} />
              <p className="mt-2 text-mention text-gris">
                Semaine {semaine.numero} ({formaterDate(semaine.debut, 'court')} – {formaterDate(semaine.fin, 'court')}) : <Montant valeur={semaine.depense} /> dépensés sur <Montant valeur={semaine.disponible} />.{' '}
                <Link to={`/mois?mois=${k.mois.cle}&onglet=semaines`} className="font-semibold text-lien hover:underline">
                  Voir les semaines
                </Link>
              </p>
            </div>
          )}

          {donnees.semainePassee && <SemainePassee semaine={donnees.semainePassee} cle={k.mois.cle} />}

          <section className="mt-8" aria-label="À faire">
            <TitreSection titre="À faire" sousTitre="Ce qui attend une confirmation ou un paiement." />
            {donnees.alertes.length === 0 ? (
              <p className="mt-4 rounded-bouton bg-interne p-4 text-texte-sm text-gris">Rien à faire aujourd’hui : tout ce qui était prévu est à jour.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {donnees.alertes.map((a) => (
                  <ActionAttendue key={a.cle} alerte={a} onConfirmerPaie={(mois) => setPaieOuverte(mois)} />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8" aria-label="7 prochains jours">
            <TitreSection titre="7 prochains jours" sousTitre="Paie, revenus et charges datés." />
            <ProchainsJours donnees={donnees} />
          </section>

          <Separateur className="my-7" />

          <div className="flex flex-wrap gap-3">
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

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <CarteEpargne donnees={donnees} />
        <CarteObjectif donnees={donnees} />
        {donnees.recommandations.length > 0 && (
          <Carte titre="Suggestions">
            <ListeRecommandations recommandations={donnees.recommandations} />
          </Carte>
        )}
      </motion.div>

      {paieOuverte && <PaieAConfirmer mois={paieOuverte} aujourdhui={aujourdhui} onFermer={() => setPaieOuverte(null)} />}
      <PanneauRevenuRecu ouvert={revenuOuvert} onFermer={() => setRevenuOuvert(false)} aujourdhui={aujourdhui} />
    </div>
  )
}

/** Une action attendue : la paie se confirme ici même ; le reste mène à l'écran qui la règle. */
function ActionAttendue({ alerte: a, onConfirmerPaie }: { alerte: AlerteDto; onConfirmerPaie: (mois: string) => void }) {
  const paie = estAlertePaie(a) && 'mois' in a ? a.mois : null
  return (
    <li className="flex gap-3 rounded-bouton bg-interne p-4 shadow-bouton">
      {paie ? <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primaire" aria-hidden /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="text-texte font-semibold text-encre">{a.titre}</p>
        <p className="mt-1 text-texte-sm text-gris">{a.message}</p>
        {paie ? (
          <Bouton variante="puce" taille="sm" className="mt-3 h-8 px-3" onClick={() => onConfirmerPaie(paie)}>
            Confirmer la paie
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

function CarteEpargne({ donnees }: { donnees: AujourdhuiDto }) {
  const t = donnees.indicateurs.tauxEpargne
  return (
    <Carte titre="Épargne du mois">
      <div className="flex items-baseline justify-between gap-3">
        <Montant valeur={t.epargneReelle} className="text-titre font-bold text-encre" />
        <span className="text-texte-sm text-gris">
          sur <Montant valeur={t.epargnePrevue} /> prévus
        </span>
      </div>
      <BarreProgression className="mt-4" valeur={part(t.epargneReelle, t.epargnePrevue)} libelle={`Épargne : ${Math.round(part(t.epargneReelle, t.epargnePrevue) * 100)} % du prévu versé`} />
      <p className="mt-2 text-mention text-gris">
        Taux d’épargne : {pourcentage(t.reel)} réel, {pourcentage(t.prevu)} prévu.
      </p>
      <Link to="/plan?onglet=epargne" className={styleBouton({ variante: 'blanc', className: 'mt-5 w-full' })}>
        Voir mon épargne
      </Link>
    </Carte>
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
