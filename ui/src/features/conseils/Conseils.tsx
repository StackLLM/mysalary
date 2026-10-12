import { CONFIANCES, type AlerteDto, type RecommandationDto } from '@mysalary/partage'
import { AlertTriangle, ChevronDown, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { styleBouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { IconeCloche } from '../../components/icones'
import { Panneau } from '../../components/Panneau'
import { cn } from '../../lib/cn'
import { useConseils, useIndicateurs } from './requetes'
import { lignesIndicateurs } from './saisie'

/** Une alerte : ce qui se passe, et le bouton vers l'écran qui le règle (ux-ui.md (UX) § 1 « Calme »). */
export function ListeAlertes({ alertes, onAction }: { alertes: AlerteDto[]; onAction?: () => void }) {
  return (
    <ul className="flex flex-col gap-3" aria-label="À faire">
      {alertes.map((a) => (
        <li key={a.cle} className="flex gap-3 rounded-bouton bg-interne p-4 shadow-bouton">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-texte font-semibold text-encre">{a.titre}</p>
            <p className="mt-1 text-texte-sm text-gris">{a.message}</p>
            <Link to={a.action.chemin} onClick={onAction} className={styleBouton({ variante: 'puce', taille: 'sm', className: 'mt-3 h-8 px-3' })}>
              {a.action.libelle}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Une recommandation : message chiffré, effet, et « Sur quoi repose ce calcul ? » (R24, R25). */
export function ListeRecommandations({ recommandations, onAction }: { recommandations: RecommandationDto[]; onAction?: () => void }) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Suggestions">
      {recommandations.map((r) => (
        <ElementRecommandation key={r.cle} recommandation={r} onAction={onAction} />
      ))}
    </ul>
  )
}

function ElementRecommandation({ recommandation: r, onAction }: { recommandation: RecommandationDto; onAction?: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const confiance = CONFIANCES[r.confiance]
  return (
    <li className="flex gap-3 rounded-bouton bg-interne p-4 shadow-bouton">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primaire" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-texte font-semibold text-encre">{r.titre}</p>
        <p className="mt-1 text-texte-sm text-encre-2">{r.message}</p>
        <p className="mt-1 text-texte-sm text-gris">{r.impact}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {r.action && (
            <Link to={r.action.chemin} onClick={onAction} className={styleBouton({ variante: 'puce', taille: 'sm', className: 'h-8 px-3' })}>
              {r.action.libelle}
            </Link>
          )}
          <button
            type="button"
            aria-expanded={ouvert}
            onClick={() => setOuvert((o) => !o)}
            className="inline-flex items-center gap-1 text-mention font-semibold text-lien hover:underline"
          >
            Sur quoi repose ce calcul ?
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', ouvert && 'rotate-180')} aria-hidden />
          </button>
        </div>
        {ouvert && (
          <dl className="mt-2 flex flex-col gap-1.5 text-mention text-gris">
            <div>
              <dt className="inline font-semibold text-encre-2">Calcul : </dt>
              <dd className="inline">{r.base}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-encre-2">Condition : </dt>
              <dd className="inline">{r.condition}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-encre-2">{confiance.libelle} : </dt>
              <dd className="inline">{confiance.explication}</dd>
            </div>
          </dl>
        )}
      </div>
    </li>
  )
}

/** Cloche de l'en-tête : pastille = nombre d'alertes ; le panneau montre « À faire » puis « Suggestions ». */
export function Cloche() {
  const [ouvert, setOuvert] = useState(false)
  const conseils = useConseils()
  const alertes = conseils.data?.alertes ?? []
  const recommandations = conseils.data?.recommandations ?? []
  const fermer = () => setOuvert(false)
  const libelle = alertes.length > 0 ? `Notifications : ${alertes.length} alerte${alertes.length > 1 ? 's' : ''}` : 'Notifications'

  return (
    <>
      <button
        type="button"
        aria-label={libelle}
        onClick={() => setOuvert(true)}
        className="relative grid h-11 w-11 place-items-center rounded-pilule bg-gris-bouton text-gris-icone transition-colors hover:text-lien"
      >
        <IconeCloche />
        {alertes.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-pilule bg-alerte px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white" aria-hidden>
            {alertes.length > 9 ? '9+' : alertes.length}
          </span>
        )}
      </button>
      <Panneau ouvert={ouvert} onFermer={fermer} titre="Notifications" description="Ce qui demande une action, puis des suggestions chiffrées.">
        {conseils.isError ? (
          <p className="rounded-bouton bg-alerte-fond p-4 text-texte-sm text-alerte">Impossible de charger les notifications.</p>
        ) : conseils.isPending ? (
          <div className="h-32 animate-pulse rounded-bouton bg-interne" aria-label="Chargement des notifications" />
        ) : alertes.length === 0 && recommandations.length === 0 ? (
          <p className="rounded-bouton bg-interne p-4 text-texte-sm text-gris">Rien à signaler : tout ce qui était prévu est à jour.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {alertes.length > 0 && (
              <section>
                <h3 className="mb-3 text-mention font-semibold uppercase tracking-wide text-gris">À faire ({alertes.length})</h3>
                <ListeAlertes alertes={alertes} onAction={fermer} />
              </section>
            )}
            {recommandations.length > 0 && (
              <section>
                <h3 className="mb-3 text-mention font-semibold uppercase tracking-wide text-gris">Suggestions</h3>
                <ListeRecommandations recommandations={recommandations} onAction={fermer} />
              </section>
            )}
          </div>
        )}
      </Panneau>
    </>
  )
}

/** Carte « Indicateurs » d'un mois (produit.md (Plan) § 8) : un chiffre par question, la base de calcul à la demande. */
export function CarteIndicateurs({ cle }: { cle: string }) {
  const indicateurs = useIndicateurs(cle)
  const [bases, setBases] = useState(false)
  if (indicateurs.isError) {
    return (
      <Carte titre="Indicateurs">
        <p className="text-texte-sm text-alerte">Impossible de calculer les indicateurs.</p>
      </Carte>
    )
  }
  if (indicateurs.isPending) return <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" aria-label="Chargement des indicateurs" />
  const lignes = lignesIndicateurs(indicateurs.data)
  return (
    <Carte titre="Indicateurs">
      <dl className="flex flex-col gap-4">
        {lignes.map((l) => (
          <div key={l.cle} className="flex items-start justify-between gap-3">
            <dt className="min-w-0">
              <span className="block truncate text-texte-sm text-gris" title={l.libelle}>
                {l.libelle}
              </span>
              <span className="block text-mention text-gris">{l.detail}</span>
            </dt>
            <dd className={cn('shrink-0 text-right text-texte font-semibold tabular-nums', l.ton === 'alerte' ? 'text-alerte' : l.ton === 'positif' ? 'text-positif' : 'text-encre')}>
              {l.valeur}
            </dd>
          </div>
        ))}
      </dl>
      <button type="button" aria-expanded={bases} onClick={() => setBases((b) => !b)} className="mt-5 inline-flex items-center gap-1 text-mention font-semibold text-lien hover:underline">
        Sur quoi reposent ces calculs ?
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', bases && 'rotate-180')} aria-hidden />
      </button>
      {bases && (
        <ul className="mt-2 flex flex-col gap-1.5 text-mention text-gris" aria-label="Bases de calcul">
          {lignes.map((l) => (
            <li key={l.cle}>
              <span className="font-semibold text-encre-2">{l.libelle} : </span>
              {l.base}
            </li>
          ))}
        </ul>
      )}
    </Carte>
  )
}
