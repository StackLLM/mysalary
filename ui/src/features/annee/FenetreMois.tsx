import { deMois, formaterDate, formaterMois, type LigneBilan, type MoisCumul } from '@mysalary/partage'
import { CalendarCheck, ChevronLeft, ChevronRight, Flag, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Fenetre } from '../../components/Fenetre'
import { Montant } from '../../components/Montant'
import { cn } from '../../lib/cn'
import { useBilan } from '../mois/requetes'
import { FAMILLES, moisPrecedent, statutLigne } from '../mois/saisie'
import type { Ton } from '../salaire/saisie'
import { montantLigne, NATURES_CARTE, SECTIONS, texteJalon, type Jalon } from './saisie'

const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }

interface ProprietesFenetreMois {
  mois: MoisCumul
  jalons: Jalon[]
  onFermer: () => void
  precedent: (() => void) | null
  suivant: (() => void) | null
}

/** Fenêtre d'un mois du calendrier (lot 14) : le calcul du cumul, puis chaque revenu, charge et versement du mois. */
export function FenetreMois({ mois: m, jalons, onFermer, precedent, suivant }: ProprietesFenetreMois) {
  const bilan = useBilan(m.cle)
  const nature = NATURES_CARTE[m.nature]
  const lignes = bilan.data?.mois.cle === m.cle ? bilan.data.lignes : null

  const navigation = (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Mois précédent" disabled={!precedent} onClick={precedent ?? undefined} className="grid h-10 w-10 place-items-center rounded-pilule text-gris hover:bg-teinte hover:text-encre disabled:opacity-30">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Mois suivant" disabled={!suivant} onClick={suivant ?? undefined} className="grid h-10 w-10 place-items-center rounded-pilule text-gris hover:bg-teinte hover:text-encre disabled:opacity-30">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <Fenetre
      ouvert
      onFermer={onFermer}
      titre={<span className="capitalize">{formaterMois(m.cle)}</span>}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <ChipNature nature={m.nature} />
          <span>
            Du {formaterDate(m.debut, 'moyen')} au {formaterDate(m.fin, 'moyen')}
          </span>
        </span>
      }
      entete={navigation}
      pied={
        <>
          <Bouton variante="contour" onClick={onFermer}>
            Fermer
          </Bouton>
          <Link to={`/mois?mois=${m.cle}`} className={styleBouton({})}>
            Ouvrir le mois
          </Link>
        </>
      }
    >
      <p className="text-texte-sm text-gris">{nature.explication}</p>

      {m.cumul !== null && m.report !== null && <Calcul mois={m} />}

      {jalons.length > 0 && (
        <section className="mt-6" aria-label="Objectifs">
          <h3 className="mb-2 text-mention font-semibold uppercase tracking-wide text-gris">Objectifs</h3>
          <ul className="flex flex-col gap-2">
            {jalons.map((j) => (
              <li key={`${j.type}-${j.id}`}>
                <Link to={`/objectifs/${j.id}`} className="flex items-center gap-2 rounded-champ bg-interne px-3 py-2 text-texte-sm text-encre shadow-bouton hover:text-lien">
                  {j.type === 'atteint' ? <Target className="h-4 w-4 text-sauge-700" aria-hidden /> : <Flag className="h-4 w-4 text-info" aria-hidden />}
                  {texteJalon(j)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bilan.isError ? (
        <p className="mt-6 rounded-champ bg-alerte-fond px-4 py-3 text-texte-sm text-alerte">Impossible de charger le détail de ce mois.</p>
      ) : lignes === null ? (
        <div className="mt-6 h-48 animate-pulse rounded-bouton bg-interne" aria-label="Chargement du détail" />
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {SECTIONS.map((s) => {
            const familles: readonly string[] = s.familles
            const liste = lignes.filter((l) => familles.includes(l.famille))
            const total = s.cle === 'revenus' ? m.revenus : s.cle === 'charges' ? m.charges : m.epargneConfirmee
            return (
              <section key={s.cle} aria-label={s.titre} className={cn('min-w-0', s.cle === 'charges' && 'md:row-span-2')}>
                <h3 className="mb-2 flex items-baseline justify-between gap-3 border-b border-filet pb-2">
                  <span className="text-texte font-semibold text-encre">{s.titre}</span>
                  {m.cumul !== null && <Montant valeur={total} className={cn('text-texte font-semibold', m.nature !== 'reel' && 'italic text-gris')} />}
                </h3>
                {liste.length === 0 ? (
                  <p className="py-2 text-texte-sm text-gris">Rien ce mois-ci.</p>
                ) : (
                  <ul className="flex flex-col">
                    {liste.map((l, i) => (
                      <LigneFenetre key={l.cle} ligne={l} aVenir={m.statut === 'aVenir'} sousTitre={s.cle === 'charges' && liste[i - 1]?.famille !== l.famille ? FAMILLES[l.famille] : null} />
                    ))}
                  </ul>
                )}
                {s.cle === 'epargne' && m.epargneAConfirmer > 0 && (
                  <p className="mt-2 text-mention text-gris">
                    À épargner : <Montant valeur={m.epargneAConfirmer} /> prévus. Pas encore retirés du cumul : tu les confirmes dans Épargne.
                  </p>
                )}
                {s.cle === 'charges' && m.nature === 'enCours' && (
                  <p className="mt-2 text-mention text-gris">Le total compte ce qui est déjà sorti et ce qui reste prévu d’ici la fin du mois.</p>
                )}
              </section>
            )
          })}
        </div>
      )}
    </Fenetre>
  )
}

function Calcul({ mois: m }: { mois: MoisCumul }) {
  const prevu = m.nature !== 'reel'
  const cases = [
    { cle: 'report', libelle: m.premier ? 'Solde de départ' : `Report ${deMois(moisPrecedent(m.cle), { annee: false })}`, signe: '', valeur: m.report!, reel: null },
    { cle: 'revenus', libelle: 'Revenus', signe: '+', valeur: m.revenus, reel: m.dontReel?.revenus ?? null },
    { cle: 'charges', libelle: 'Charges', signe: '−', valeur: m.charges, reel: m.dontReel?.charges ?? null },
    { cle: 'epargne', libelle: 'Épargne confirmée', signe: '−', valeur: m.epargneConfirmee, reel: m.dontReel?.epargne ?? null },
  ]
  return (
    <section aria-label="Calcul du cumul" className="mt-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cases.map((c) => (
          <div key={c.cle} className="min-w-0 rounded-champ bg-interne px-3 py-2.5 shadow-bouton">
            <span className="block truncate text-mention text-gris" title={c.libelle}>
              {c.libelle}
            </span>
            <span className={cn('block text-texte font-semibold tabular-nums', c.cle !== 'report' && prevu ? 'italic text-encre-2' : 'text-encre', c.valeur < 0 && 'text-alerte')}>
              {c.valeur === 0 ? '' : c.signe}
              <Montant valeur={c.valeur} />
            </span>
            {c.reel !== null && (
              <span className="block truncate text-mention text-gris">
                dont <Montant valeur={c.reel} /> réels
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-champ border border-filet px-4 py-2.5 text-texte-sm">
        <span className="text-gris">
          <span className="font-semibold text-encre-2">Reste après charges</span> (revenus − charges)
        </span>
        <Montant valeur={m.apresCharges} className={cn('font-bold', m.apresCharges < 0 ? 'text-alerte' : 'text-encre', prevu && 'italic')} />
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-champ bg-sauge-50 px-4 py-3 ring-1 ring-sauge-200">
        <span className="text-texte-sm font-semibold text-sauge-700">= Cumul fin de mois{m.nature === 'enCours' ? ' (estimation)' : m.nature === 'prevu' ? ' (prévu)' : ''}</span>
        <Montant valeur={m.cumul!} className={cn('text-titre font-bold', m.cumul! < 0 ? 'text-alerte' : 'text-encre')} />
      </div>
    </section>
  )
}

function LigneFenetre({ ligne: l, aVenir, sousTitre }: { ligne: LigneBilan; aVenir: boolean; sousTitre: string | null }) {
  const statut = aVenir ? { texte: 'Prévu', ton: 'neutre' as const } : statutLigne(l)
  const montant = montantLigne(l, aVenir)
  return (
    <>
      {sousTitre && <li className="pb-1 pt-3 text-mention font-semibold uppercase tracking-wide text-gris first:pt-1">{sousTitre}</li>}
      <li className="flex items-start justify-between gap-3 border-b border-filet/70 py-2 last:border-0">
        <span className="min-w-0">
          <span className="block truncate text-texte-sm font-medium text-encre" title={l.libelle}>
            {l.libelle}
          </span>
          <span className="block text-mention text-gris">
            {l.date ? `${formaterDate(l.date, 'court')} · ` : ''}
            <span className={TONS[statut.ton]}>{statut.texte}</span>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <Montant valeur={montant.valeur} className={cn('block text-texte-sm', montant.prevu ? 'italic text-gris' : 'font-semibold text-encre')} />
          {montant.precision && <span className="block text-mention text-gris">{montant.precision}</span>}
        </span>
      </li>
    </>
  )
}

/** Nature d'un mois en mots (jamais la couleur seule) ; le mois en cours est mis en avant. */
export function ChipNature({ nature, courant = false }: { nature: MoisCumul['nature']; courant?: boolean }) {
  if (courant) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-pilule bg-primaire px-2 py-0.5 text-mention text-white">
        <CalendarCheck className="h-3 w-3" aria-hidden />
        En cours
      </span>
    )
  }
  const styles = { reel: 'bg-positif-fond text-positif', enCours: 'bg-primaire text-white', prevu: 'border border-filet-fort text-gris', avant: 'bg-white text-gris' }
  return <span className={cn('inline-flex shrink-0 items-center rounded-pilule px-2 py-0.5 text-mention', styles[nature])}>{NATURES_CARTE[nature].libelle}</span>
}
