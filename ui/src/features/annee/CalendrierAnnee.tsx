import { grilleDesJours, lireDate } from '@mysalary/moteur'
import { formaterDate, formaterMois, formaterMontant, type EvenementJour, type MoisCumul, type ResumeCumul } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flag, Target } from 'lucide-react'
import { useState } from 'react'
import { Bouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Montant } from '../../components/Montant'
import { cn } from '../../lib/cn'
import { useObjectifs } from '../epargne/requetes'
import { useAnnee } from '../mois/requetes'
import { useMoisCourant } from '../salaire/requetes'
import { ChipNature, FenetreMois } from './FenetreMois'
import { caseJour, echelleCumul, jalonsDuMois, joursEntete, moisCourt, NATURES_CARTE, texteJalon, texteJalonCourt, type CaseJour, type Jalon } from './saisie'

const APPARITION = { cache: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }

/**
 * Calendrier de l'année (lot 14) : les douze mois en calendrier, jour par jour (paie, charges datées),
 * avec ce qui reste après les charges et le cumul de fin de mois. Un clic ouvre la fenêtre du mois.
 * Réutilisé par la page Année (lot 18).
 */
export function CalendrierAnnee({ annee, changerAnnee }: { annee: number; changerAnnee: (annee: number) => void }) {
  const donnees = useAnnee(annee)
  const objectifs = useObjectifs()
  const courant = useMoisCourant()
  const [ouvert, setOuvert] = useState<string | null>(null)
  const cleCourante = courant.data?.cle ?? null
  const anneeCourante = cleCourante ? Number(cleCourante.slice(0, 4)) : null
  const liste = objectifs.data?.objectifs ?? []

  const chargee = donnees.data?.annee === annee ? donnees.data : null
  const mois = chargee?.mois ?? []
  const index = mois.findIndex((m) => m.cle === ouvert)
  const selection = index >= 0 ? mois[index]! : null

  return (
    <Carte espacement="large" aria-label={`Calendrier ${annee}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-titre text-encre">Calendrier {annee}</h2>
          <p className="mt-1 text-texte-sm text-gris">Chaque mois jour par jour : la paie, les charges datées, ce qui reste après les charges et le cumul en fin de mois.</p>
        </div>
        <div className="flex items-center gap-2">
          {anneeCourante !== null && anneeCourante !== annee && (
            <Bouton variante="puce" taille="sm" onClick={() => changerAnnee(anneeCourante)}>
              Cette année
            </Bouton>
          )}
          <div className="flex items-center gap-1 rounded-pilule bg-teinte p-1">
            <button type="button" aria-label={`Année ${annee - 1}`} onClick={() => changerAnnee(annee - 1)} className="grid h-8 w-8 place-items-center rounded-pilule text-gris hover:bg-white hover:text-encre">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-texte font-semibold tabular-nums text-encre">{annee}</span>
            <button type="button" aria-label={`Année ${annee + 1}`} onClick={() => changerAnnee(annee + 1)} className="grid h-8 w-8 place-items-center rounded-pilule text-gris hover:bg-white hover:text-encre">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {donnees.isError ? (
        <div className="mt-6 rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de calculer l’année {annee}.</p>
          <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void donnees.refetch()}>
            Réessayer
          </Bouton>
        </div>
      ) : !chargee ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Chargement du calendrier">
          <div className="col-span-full h-36 animate-pulse rounded-bandeau bg-teinte" />
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-[440px] animate-pulse rounded-carte bg-interne shadow-bouton" />
          ))}
        </div>
      ) : (
        <>
          <ResumeAnnee annee={annee} mois={mois} resume={chargee.resume} />
          <GraphiqueCumul mois={mois} courant={cleCourante} onOuvrir={setOuvert} />
          <motion.ul
            key={annee}
            className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            aria-label={`Mois de ${annee}`}
            initial="cache"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {mois.map((m) => (
              <motion.li key={m.cle} variants={APPARITION}>
                <CarteMois
                  mois={m}
                  evenements={chargee.evenements[m.cle] ?? []}
                  debutSemaine={chargee.debutSemaine}
                  aujourdhui={chargee.aujourdhui}
                  courant={m.cle === cleCourante}
                  jalons={jalonsDuMois(liste, m.cle)}
                  onOuvrir={() => setOuvert(m.cle)}
                />
              </motion.li>
            ))}
          </motion.ul>
          <Legende />
        </>
      )}

      {selection && (
        <FenetreMois
          mois={selection}
          jalons={jalonsDuMois(liste, selection.cle)}
          onFermer={() => setOuvert(null)}
          precedent={index > 0 ? () => setOuvert(mois[index - 1]!.cle) : null}
          suivant={index < mois.length - 1 ? () => setOuvert(mois[index + 1]!.cle) : null}
        />
      )}
    </Carte>
  )
}

function ResumeAnnee({ annee, mois, resume }: { annee: number; mois: MoisCumul[]; resume: ResumeCumul }) {
  if (resume.cumulFin === null) {
    return <p className="mt-6 rounded-champ bg-teinte px-4 py-3 text-texte-sm text-gris">Aucun mois de {annee} n’est suivi : ton suivi commence plus tard.</p>
  }
  const dernier = [...mois].reverse().find((m) => m.cumul !== null)!
  const nature = dernier.nature === 'reel' ? '' : dernier.nature === 'enCours' ? ' (estimation)' : ' (prévu)'
  // Fin = ce qu'on avait au départ (solde déclaré, ou report de l'année précédente) + revenus − charges − épargne de l'année.
  const premier = mois.find((m) => m.cumul !== null)!
  const depart = premier.report
  return (
    <>
      <CarteBandeau
        className="mt-6"
        gauche={{
          titre: `Fin ${formaterMois(dernier.cle, { annee: false })}, tu auras${nature}`,
          lignes: [
            { valeur: <Montant valeur={resume.cumulFin} className="text-montant" /> },
            ...(resume.plusBas ? [{ libelle: 'Mois le plus bas', valeur: `${formaterMois(resume.plusBas.cle, { annee: false })} · ${formaterMontant(resume.plusBas.cumul)}` }] : []),
          ],
        }}
        droite={{
          titre: 'D’où vient ce chiffre',
          lignes: [
            ...(depart ? [{ libelle: premier.premier ? 'Au départ (solde déclaré)' : `Au départ (report de ${annee - 1})`, valeur: <Montant valeur={depart} /> }] : []),
            { libelle: 'Revenus', valeur: <Montant valeur={resume.revenus} /> },
            { libelle: 'Charges', valeur: <Montant valeur={resume.charges} /> },
            { libelle: 'Épargne confirmée', valeur: <Montant valeur={resume.epargne} /> },
            ...(resume.epargneAConfirmer > 0 ? [{ libelle: 'À épargner, à confirmer (non retiré)', valeur: <Montant valeur={resume.epargneAConfirmer} /> }] : []),
          ],
        }}
      />
      {resume.negatifs.length > 0 && (
        <p role="alert" className="mt-4 rounded-champ bg-alerte-fond px-4 py-3 text-texte-sm text-alerte">
          Le cumul passe sous zéro en {resume.negatifs.map((c) => formaterMois(c, { annee: false })).join(', ')} : ouvre le mois pour voir les charges qui pèsent.
        </p>
      )}
    </>
  )
}

/** Cumul fin de mois sur l'année : une barre par mois (réel plein, prévu plus clair), cliquable. */
function GraphiqueCumul({ mois, courant, onOuvrir }: { mois: MoisCumul[]; courant: string | null; onOuvrir: (cle: string) => void }) {
  const { zero, barres } = echelleCumul(mois)
  return (
    <section aria-label="Cumul fin de mois sur l’année" className="mt-6 rounded-bouton bg-interne px-4 pb-3 pt-4 shadow-bouton sm:px-6">
      <h3 className="text-texte-sm font-semibold text-encre">Cumul fin de mois</h3>
      <div className="mt-3 grid grid-cols-12 gap-1.5 sm:gap-3">
        {mois.map((m, i) => {
          const barre = barres[i]!
          const suivi = m.cumul !== null
          const etiquette = suivi
            ? `${formaterMois(m.cle, { majuscule: true })} : ${formaterMontant(m.cumul!)}${m.nature === 'prevu' ? ' (prévu)' : m.nature === 'enCours' ? ' (estimation)' : ''}`
            : `${formaterMois(m.cle, { majuscule: true })} : avant le suivi`
          return (
            <button key={m.cle} type="button" onClick={() => onOuvrir(m.cle)} title={etiquette} aria-label={etiquette} className="group flex min-w-0 flex-col items-center gap-1.5">
              <span className="relative block h-20 w-full sm:h-24">
                <span className="absolute inset-x-0 border-t border-filet-fort" style={{ bottom: `${zero}%` }} aria-hidden />
                {suivi && (
                  <span
                    className={cn(
                      'absolute inset-x-[18%] transition-opacity group-hover:opacity-80 sm:inset-x-[26%]',
                      m.cumul! < 0 ? 'rounded-b-[4px] bg-alerte' : m.nature === 'prevu' ? 'rounded-t-[4px] bg-sauge-300' : 'rounded-t-[4px] bg-primaire',
                    )}
                    style={{ bottom: `${barre.bas}%`, height: `${Math.max(barre.hauteur, 1.5)}%` }}
                    aria-hidden
                  />
                )}
              </span>
              <span className={cn('text-[11px] font-medium capitalize leading-none sm:text-mention', m.cle === courant ? 'font-bold text-encre' : 'text-gris')}>{moisCourt(m.cle).replace('.', '')}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

const STYLES_NATURE = {
  reel: 'border border-filet bg-white',
  enCours: 'border border-filet bg-white ring-2 ring-primaire ring-offset-2 ring-offset-white',
  prevu: 'border border-dashed border-filet-fort bg-white',
  avant: 'border border-filet bg-interne',
} as const

const PASTILLES: Record<Exclude<CaseJour['charges'], 'aucune'>, string> = { prevue: 'bg-serie-depenses', payee: 'bg-positif', enRetard: 'bg-alerte' }

function CarteMois({
  mois: m,
  evenements,
  debutSemaine,
  aujourdhui,
  courant,
  jalons,
  onOuvrir,
}: {
  mois: MoisCumul
  evenements: EvenementJour[]
  debutSemaine: 1 | 7
  aujourdhui: string
  courant: boolean
  jalons: Jalon[]
  onOuvrir: () => void
}) {
  const avant = m.cumul === null
  const prevu = m.nature !== 'reel'
  const nature = NATURES_CARTE[m.nature]
  const grille = grilleDesJours(lireDate(m.debut), lireDate(m.fin), debutSemaine)
  const etiquette = avant
    ? `${formaterMois(m.cle, { majuscule: true })} : ${nature.libelle.toLowerCase()}. Voir le détail.`
    : `${formaterMois(m.cle, { majuscule: true })} : reste après charges ${formaterMontant(m.apresCharges)}, cumul fin de mois ${formaterMontant(m.cumul!)}, ${nature.libelle.toLowerCase()}. Voir le détail.`
  return (
    <button
      type="button"
      onClick={onOuvrir}
      aria-label={etiquette}
      className={cn('group flex h-full w-full flex-col rounded-carte p-5 text-left shadow-bouton transition-all duration-200 hover:-translate-y-0.5 hover:shadow-carte', STYLES_NATURE[m.nature])}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-titre font-semibold capitalize text-encre">{formaterMois(m.cle, { annee: false })}</span>
          <span className="block text-mention text-gris">
            {formaterDate(m.debut, 'court')} → {formaterDate(m.fin, 'court')}
          </span>
        </span>
        <ChipNature nature={m.nature} courant={courant} />
      </span>

      <span className="mt-4 block" aria-hidden>
        <span className="grid grid-cols-7 text-center text-[11px] font-semibold text-gris-icone">
          {joursEntete(debutSemaine).map((j, i) => (
            <span key={i} className="pb-1">
              {j}
            </span>
          ))}
        </span>
        {grille.map((semaine, i) => (
          <span key={i} className="grid grid-cols-7">
            {semaine.map((date, j) => (date ? <Jour key={date} jour={caseJour(date, m.cle, evenements, aujourdhui)} /> : <span key={`vide-${j}`} className="h-8" />))}
          </span>
        ))}
      </span>

      <span className="mt-4 border-t border-filet pt-4">
        {avant ? (
          <span className="block text-texte-sm text-gris">Avant le début de ton suivi : pas de cumul.</span>
        ) : (
          <span className="grid gap-1.5 text-texte-sm">
            <LigneCarte libelle="Revenus" signe="+" valeur={m.revenus} prevu={prevu} />
            <LigneCarte libelle="Charges" signe="−" valeur={m.charges} prevu={prevu} />
            <span className="-mx-2 flex items-baseline justify-between gap-3 rounded-champ bg-sauge-50 px-2 py-1">
              <span className="font-semibold text-sauge-700">Reste</span>
              <Montant valeur={m.apresCharges} className={cn('font-bold tabular-nums', m.apresCharges < 0 ? 'text-alerte' : 'text-encre', prevu && 'italic')} />
            </span>
            {m.report !== null && m.report !== 0 && <LigneCarte libelle={m.premier ? 'Solde de départ' : 'Report'} signe="+" valeur={m.report} prevu={false} />}
            <LigneCarte libelle="Épargne confirmée" signe="−" valeur={m.epargneConfirmee} prevu={prevu} />
            {m.epargneAConfirmer > 0 && (
              <span className="flex items-baseline justify-between gap-3 text-mention italic text-gris">
                <span>À épargner (à confirmer)</span>
                <Montant valeur={m.epargneAConfirmer} />
              </span>
            )}
          </span>
        )}
      </span>

      {!avant && (
        <span className="mt-4 flex items-baseline justify-between gap-3 border-t border-filet pt-4">
          <span className="text-mention text-gris">Cumul fin de mois</span>
          <Montant valeur={m.cumul!} className={cn('text-[22px] font-bold leading-7 tracking-tight', m.cumul! < 0 ? 'text-alerte' : 'text-encre', m.nature === 'prevu' && 'italic')} />
        </span>
      )}

      {jalons.length > 0 && (
        <span className="mt-3 flex flex-wrap gap-1.5">
          {jalons.map((j) => (
            <span key={`${j.type}-${j.id}`} title={texteJalon(j)} className={cn('inline-flex max-w-full items-center gap-1 rounded-pilule px-2 py-0.5 text-mention', j.type === 'atteint' ? 'bg-sauge-100 text-sauge-700' : 'bg-info-fond text-info')}>
              {j.type === 'atteint' ? <Target className="h-3 w-3 shrink-0" aria-hidden /> : <Flag className="h-3 w-3 shrink-0" aria-hidden />}
              <span className="truncate">{texteJalonCourt(j)}</span>
            </span>
          ))}
        </span>
      )}

      <span className="mt-auto pt-4 text-mention font-semibold text-lien opacity-70 transition-opacity group-hover:opacity-100">Voir le détail →</span>
    </button>
  )
}

function Jour({ jour: j }: { jour: CaseJour }) {
  return (
    <span className="relative flex h-8 items-center justify-center" title={j.titre}>
      <span
        className={cn(
          'grid h-7 w-7 place-items-center rounded-full text-[12px] tabular-nums',
          j.paie ? 'bg-primaire font-semibold text-white' : j.horsMois ? 'text-gris-icone' : 'text-encre-2',
          j.aujourdhui && !j.paie && 'font-bold text-encre ring-1 ring-encre',
          j.aujourdhui && j.paie && 'ring-2 ring-encre ring-offset-1',
        )}
      >
        {j.jour}
      </span>
      {j.charges !== 'aucune' && <span className={cn('absolute bottom-0 h-1.5 w-1.5 rounded-full', PASTILLES[j.charges])} />}
    </span>
  )
}

function LigneCarte({ libelle, signe, valeur, prevu }: { libelle: string; signe: '+' | '−'; valeur: number; prevu: boolean }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-gris">{libelle}</span>
      <span className={cn('tabular-nums', prevu ? 'italic text-gris' : 'font-medium text-encre-2')}>
        {valeur === 0 ? '' : signe}
        <Montant valeur={valeur} />
      </span>
    </span>
  )
}

function Legende() {
  return (
    <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-mention text-gris" aria-label="Légende">
      <li className="flex items-center gap-1.5">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-primaire text-[9px] font-bold text-white" aria-hidden>
          27
        </span>
        Paie
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-serie-depenses" aria-hidden /> Charge prévue
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-positif" aria-hidden /> Charge payée
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-alerte" aria-hidden /> Charge en retard
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-4 w-4 rounded-full ring-1 ring-encre" aria-hidden /> Aujourd’hui
      </li>
      <li>Reste = revenus − charges du mois</li>
      <li>Réel : mois terminé · En cours : estimation (cerclé) · Prévu : projection réaliste (pointillés, italique)</li>
      <li className="flex items-center gap-1.5">
        <Target className="h-3.5 w-3.5 text-sauge-700" aria-hidden /> Objectif atteint (projection)
      </li>
      <li className="flex items-center gap-1.5">
        <Flag className="h-3.5 w-3.5 text-info" aria-hidden /> Date souhaitée d’un objectif
      </li>
    </ul>
  )
}
