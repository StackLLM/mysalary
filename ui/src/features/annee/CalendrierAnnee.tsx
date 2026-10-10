import { formaterDate, formaterMois, formaterMontant, type MoisCumul } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flag, Target } from 'lucide-react'
import { useState } from 'react'
import { Bouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Montant } from '../../components/Montant'
import { cn } from '../../lib/cn'
import { useObjectifs } from '../epargne/requetes'
import { useCumul } from '../mois/requetes'
import { useMoisCourant } from '../salaire/requetes'
import { ChipNature, FenetreMois } from './FenetreMois'
import { jalonsDuMois, jauge, moisCourt, NATURES_CARTE, plageAnnee, texteJalon, texteJalonCourt, type Jalon } from './saisie'

/**
 * Calendrier de l'année (lot 14) : douze cartes de mois, chacune avec son cumul de fin de mois,
 * ses revenus, charges et épargne. Un clic ouvre la fenêtre du mois. Réutilisé par la page Année (lot 18).
 */
export function CalendrierAnnee({ annee, changerAnnee }: { annee: number; changerAnnee: (annee: number) => void }) {
  const { du, au } = plageAnnee(annee)
  const cumul = useCumul(du, au)
  const objectifs = useObjectifs()
  const courant = useMoisCourant()
  const [ouvert, setOuvert] = useState<string | null>(null)
  const cleCourante = courant.data?.cle ?? null
  const anneeCourante = cleCourante ? Number(cleCourante.slice(0, 4)) : null
  const liste = objectifs.data?.objectifs ?? []

  const mois = cumul.data?.mois ?? []
  const index = mois.findIndex((m) => m.cle === ouvert)
  const selection = index >= 0 ? mois[index]! : null
  // Les mois d'avant le suivi n'ont pas de cumul : une seule bande, pour laisser la place aux mois suivis.
  const avant = mois.filter((m) => m.nature === 'avant')
  const suivis = mois.filter((m) => m.nature !== 'avant')

  return (
    <Carte espacement="large" aria-label={`Calendrier ${annee}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-titre text-encre">Calendrier {annee}</h2>
          <p className="mt-1 text-texte-sm text-gris">Chaque mois : ce qu’il te resterait sur le compte en fin de mois, après charges et épargne.</p>
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

      {cumul.isError ? (
        <div className="mt-6 rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de calculer l’année {annee}.</p>
          <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void cumul.refetch()}>
            Réessayer
          </Bouton>
        </div>
      ) : cumul.isPending ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4" aria-label="Chargement du calendrier">
          <div className="col-span-full h-36 animate-pulse rounded-bandeau bg-teinte" />
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-bouton sm:h-56 bg-interne shadow-bouton" />
          ))}
        </div>
      ) : (
        <>
          <ResumeAnnee annee={annee} mois={mois} resume={cumul.data.resume} />
          <motion.ul
            key={annee}
            className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4"
            aria-label={`Mois de ${annee}`}
            initial="cache"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {avant.length > 0 && (
              <motion.li variants={APPARITION} className="col-span-full">
                <BandeAvant mois={avant} onOuvrir={setOuvert} />
              </motion.li>
            )}
            {suivis.map((m) => (
              <motion.li key={m.cle} variants={APPARITION}>
                <CarteMois mois={m} jauge={jauge(m.cumul, mois)} courant={m.cle === cleCourante} jalons={jalonsDuMois(liste, m.cle)} onOuvrir={() => setOuvert(m.cle)} />
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

function ResumeAnnee({ annee, mois, resume }: { annee: number; mois: MoisCumul[]; resume: NonNullable<ReturnType<typeof useCumul>['data']>['resume'] }) {
  if (resume.cumulFin === null) {
    return <p className="mt-6 rounded-champ bg-teinte px-4 py-3 text-texte-sm text-gris">Aucun mois de {annee} n’est suivi : ton suivi commence plus tard.</p>
  }
  const dernier = [...mois].reverse().find((m) => m.cumul !== null)!
  const nature = dernier.nature === 'reel' ? '' : dernier.nature === 'enCours' ? ' (estimation)' : ' (prévu)'
  // Fin de l'année = report reçu de l'année précédente + reste de l'année.
  const premier = mois.find((m) => m.cumul !== null)!
  const report = premier.premier ? null : premier.report
  return (
    <>
      <CarteBandeau
        className="mt-6"
        gauche={{
          titre: `Cumul fin ${formaterMois(dernier.cle, { annee: false })}${nature}`,
          lignes: [
            { valeur: <Montant valeur={resume.cumulFin} className="text-montant" /> },
            ...(resume.plusBas ? [{ libelle: 'Mois le plus bas', valeur: `${formaterMois(resume.plusBas.cle, { annee: false })} · ${formaterMontant(resume.plusBas.cumul)}` }] : []),
          ],
        }}
        droite={{
          titre: `Reste cumulé sur ${annee}`,
          lignes: [
            { valeur: <Montant valeur={resume.reste} /> },
            ...(report !== null ? [{ libelle: `Report de ${annee - 1}`, valeur: <Montant valeur={report} /> }] : []),
            { libelle: 'Revenus', valeur: <Montant valeur={resume.revenus} /> },
            { libelle: 'Charges', valeur: <Montant valeur={resume.charges} /> },
            { libelle: 'Épargne', valeur: <Montant valeur={resume.epargne} /> },
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

const APPARITION = { cache: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }

function BandeAvant({ mois, onOuvrir }: { mois: MoisCumul[]; onOuvrir: (cle: string) => void }) {
  const premier = formaterMois(mois[0]!.cle, { annee: false, majuscule: true })
  const dernier = formaterMois(mois.at(-1)!.cle, { annee: false })
  return (
    <section aria-label="Avant le début du suivi" className="flex flex-col gap-3 rounded-bouton border border-filet bg-teinte/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <p className="text-texte-sm text-gris">
        <span className="font-semibold text-encre-2">{mois.length === 1 ? premier : `${premier} → ${dernier}`}</span> : avant le début de ton suivi, pas de cumul.
      </p>
      <span className="flex flex-wrap gap-1.5">
        {mois.map((m) => (
          <button key={m.cle} type="button" onClick={() => onOuvrir(m.cle)} aria-label={`${formaterMois(m.cle, { majuscule: true })} : voir le détail`} className="h-8 rounded-pilule bg-white px-3 text-mention capitalize text-gris shadow-bouton hover:text-encre">
            {moisCourt(m.cle)}
          </button>
        ))}
      </span>
    </section>
  )
}

const STYLES_NATURE = {
  reel: 'border border-filet bg-white',
  enCours: 'border border-filet bg-white',
  prevu: 'border border-dashed border-filet-fort bg-interne',
  avant: 'border border-filet bg-teinte/60',
} as const

function CarteMois({ mois: m, jauge: longueur, courant, jalons, onOuvrir }: { mois: MoisCumul; jauge: number; courant: boolean; jalons: Jalon[]; onOuvrir: () => void }) {
  const avant = m.cumul === null
  const nature = NATURES_CARTE[m.nature]
  const etiquette = avant
    ? `${formaterMois(m.cle, { majuscule: true })} : ${nature.libelle.toLowerCase()}. Voir le détail.`
    : `${formaterMois(m.cle, { majuscule: true })} : cumul fin de mois ${formaterMontant(m.cumul!)}, ${nature.libelle.toLowerCase()}. Voir le détail.`
  return (
    <button
      type="button"
      onClick={onOuvrir}
      aria-label={etiquette}
      className={cn(
        'group flex h-full w-full flex-col rounded-bouton p-3.5 text-left shadow-bouton transition-all duration-200 hover:-translate-y-0.5 hover:shadow-carte sm:p-5',
        STYLES_NATURE[m.nature],
        courant && 'ring-2 ring-primaire ring-offset-2 ring-offset-white',
      )}
    >
      <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <span className="min-w-0">
          <span className="block text-titre-carte font-semibold capitalize text-encre">{formaterMois(m.cle, { annee: false })}</span>
          <span className="hidden text-mention text-gris sm:block">
            {formaterDate(m.debut, 'court')} → {formaterDate(m.fin, 'court')}
          </span>
        </span>
        <ChipNature nature={m.nature} courant={courant} />
      </span>

      {avant ? (
        <span className="mt-6 block text-texte-sm text-gris">Avant le début de ton suivi : pas de cumul.</span>
      ) : (
        <>
          <span className="mt-3 block text-mention text-gris sm:mt-5">Cumul fin de mois</span>
          <Montant valeur={m.cumul!} className={cn('mt-0.5 block text-[19px] font-bold leading-7 tracking-tight sm:text-[26px] sm:leading-8', m.cumul! < 0 ? 'text-alerte' : 'text-encre', m.nature === 'prevu' && 'italic')} />
          <span className="mt-3 block h-1.5 overflow-hidden rounded-pilule bg-teinte-fort" aria-hidden>
            <span className={cn('block h-full rounded-pilule', m.nature === 'prevu' ? 'bg-sauge-300' : 'bg-primaire')} style={{ width: `${Math.round(longueur * 100)}%` }} />
          </span>
          <span className="mt-4 hidden gap-1.5 text-texte-sm sm:grid">
            <LigneCarte libelle="Revenus" signe="+" valeur={m.revenus} prevu={m.nature !== 'reel'} />
            <LigneCarte libelle="Charges" signe="−" valeur={m.charges} prevu={m.nature !== 'reel'} />
            <LigneCarte libelle="Épargne" signe="−" valeur={m.epargne} prevu={m.nature !== 'reel'} />
          </span>
        </>
      )}

      {jalons.length > 0 && (
        <span className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
          {jalons.map((j) => (
            <span key={`${j.type}-${j.id}`} title={texteJalon(j)} className={cn('inline-flex max-w-full items-center gap-1 rounded-pilule px-2 py-0.5 text-mention', j.type === 'atteint' ? 'bg-sauge-100 text-sauge-700' : 'bg-info-fond text-info')}>
              {j.type === 'atteint' ? <Target className="h-3 w-3 shrink-0" aria-hidden /> : <Flag className="h-3 w-3 shrink-0" aria-hidden />}
              <span className="truncate">
                {j.libelle}
                <span className="hidden sm:inline">{texteJalonCourt(j).slice(j.libelle.length)}</span>
              </span>
            </span>
          ))}
        </span>
      )}

      <span className="mt-auto hidden pt-4 text-mention font-semibold text-lien opacity-70 sm:block transition-opacity group-hover:opacity-100">Voir le détail →</span>
    </button>
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
    <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-mention text-gris" aria-label="Légende">
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-[4px] border border-filet bg-white" aria-hidden /> Réel : mois terminé
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-[4px] border border-filet bg-white ring-2 ring-primaire" aria-hidden /> En cours : estimation
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-[4px] border border-dashed border-filet-fort bg-interne" aria-hidden /> Prévu : projection réaliste, en italique
      </li>
      <li className="flex items-center gap-1.5">
        <Target className="h-3.5 w-3.5 text-sauge-700" aria-hidden /> Objectif atteint (projection)
      </li>
      <li className="flex items-center gap-1.5">
        <Flag className="h-3.5 w-3.5 text-info" aria-hidden /> Date souhaitée d’un objectif
      </li>
    </ul>
  )
}
