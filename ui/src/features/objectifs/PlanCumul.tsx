import { formaterMois, formaterMontant, type EstimationObjectif, type ObjectifDetailDto } from '@mysalary/partage'
import { useState } from 'react'
import { BadgeNature } from '../../components/Badges'
import { Bouton } from '../../components/Bouton'
import { TitreSection } from '../../components/Carte'
import { ChampMontant } from '../../components/Champ'
import { Montant } from '../../components/Montant'
import { cn } from '../../lib/cn'
import { lireMontant, versSaisie } from '../salaire/saisie'
import { texteEcart, texteEstimation } from './saisie'

const TONS = { positif: 'text-positif', alerte: 'text-alerte', neutre: 'text-gris' } as const

/**
 * Avec ou sans le cumul ajouté à l'épargne actuelle : montant par mois, date estimée, écart à la date cible.
 * Le cumul proposé est ce qui reste sur le compte courant au début du mois ; l'utilisateur peut en choisir un autre.
 * Rien n'est versé ici : « Verser ce cumul » ouvre le versement, qui seul rend l'épargne réelle.
 */
export function PlanCumul({ detail, onCumul, onVerser, calcul }: { detail: ObjectifDetailDto; onCumul: (centimes: number | undefined) => void; onVerser: (centimes: number) => void; calcul: boolean }) {
  const s = detail.scenariosCumul!
  const [saisie, setSaisie] = useState(versSaisie(s.cumul))
  const [erreur, setErreur] = useState<string>()
  const dateCible = detail.objectif.dateCible

  function appliquer() {
    if (!saisie.trim()) {
      setErreur(undefined)
      setSaisie(versSaisie(detail.cumulDisponible.montant))
      return onCumul(undefined)
    }
    const lu = lireMontant(saisie, 0)
    if ('erreur' in lu) return setErreur(lu.erreur)
    setErreur(undefined)
    onCumul(lu.valeur === detail.cumulDisponible.montant ? undefined : lu.valeur)
  }

  return (
    <section className="mt-8" aria-label="Avec ou sans le cumul">
      <TitreSection titre="Avec ou sans ton cumul" sousTitre={`Reste sur ton compte courant au début de ${formaterMois(detail.cumulDisponible.mois)} : ${formaterMontant(detail.cumulDisponible.montant)}. Change le montant pour comparer.`} action={<BadgeNature nature="projete" />} />
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <ChampMontant
          className="w-full max-w-[220px]"
          libelle="Cumul ajouté"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onBlur={appliquer}
          onKeyDown={(e) => e.key === 'Enter' && appliquer()}
          erreur={erreur}
        />
        {s.cumul > 0 && (
          <Bouton variante="blanc" taille="md" className="mb-0.5" onClick={() => onVerser(s.cumul)}>
            Verser ce cumul
          </Bouton>
        )}
      </div>
      <div className={cn('mt-5 grid gap-4 sm:grid-cols-2', calcul && 'opacity-60')} aria-busy={calcul}>
        <Colonne titre="Sans cumul" e={s.sans} dateCible={dateCible} />
        <Colonne titre="Avec cumul" e={s.avec} dateCible={dateCible} />
      </div>
    </section>
  )
}

function Colonne({ titre, e, dateCible }: { titre: string; e: EstimationObjectif; dateCible: string | null }) {
  const ecart = texteEcart(e.ecart)
  const ligne = (libelle: string, valeur: React.ReactNode, classe?: string) => (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-gris">{libelle}</dt>
      <dd className={cn('text-right font-semibold text-encre', classe)}>{valeur}</dd>
    </div>
  )
  return (
    <div className="rounded-bouton bg-interne p-5 shadow-bouton" role="group" aria-label={titre}>
      <h4 className="text-texte font-semibold text-encre">{titre}</h4>
      <dl className="mt-3 flex flex-col gap-2 text-texte-sm">
        {ligne('Épargne de départ', <Montant valeur={e.depart} />)}
        {ligne('Restant', <Montant valeur={e.restant} />)}
        {dateCible &&
          ligne(
            `Par mois pour ${formaterMois(dateCible)}`,
            e.mensuel === null ? (e.restant === 0 ? 'rien' : '—') : <Montant valeur={e.mensuel} />,
          )}
        {ligne('Date estimée', e.restant === 0 ? 'atteint' : texteEstimation(e.date))}
        {dateCible && ligne('Écart', ecart.texte, TONS[ecart.ton])}
      </dl>
    </div>
  )
}
