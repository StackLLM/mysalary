import { formaterMontant } from '@mysalary/partage'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { Choix, Selection } from '../../components/Selection'
import { Montant } from '../../components/Montant'
import { ErreurApi } from '../../lib/api'
import { cn } from '../../lib/cn'
import { dateDuJour } from '../../lib/dates'
import { lireMontant, versSaisie } from '../salaire/saisie'
import { useAjouterMouvement, useEpargne, useSupprimerMouvement } from './requetes'
import { lignesDuPlan, type LignePlan } from './saisie'

/**
 * Versement ou retrait d'épargne (R11 : jamais une dépense), vers un objectif ou en épargne libre.
 * Saisie rapide : montant d'abord, Entrée pour valider.
 */
export function FormulaireVersement({ objectifId, montant: montantPrevu, onTermine }: { objectifId?: string; montant?: number; onTermine: () => void }) {
  const epargne = useEpargne()
  const ajouter = useAjouterMouvement()
  const supprimer = useSupprimerMouvement()
  const aujourdhui = dateDuJour()
  const [sens, setSens] = useState<'versement' | 'retrait'>('versement')
  const [montant, setMontant] = useState(montantPrevu ? versSaisie(montantPrevu) : '')
  const [objectif, setObjectif] = useState(objectifId ?? '')
  const [compteId, setCompteId] = useState('')
  const [date, setDate] = useState(aujourdhui)
  const [libelle, setLibelle] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const champMontant = useRef<HTMLInputElement>(null)

  const comptes = epargne.data?.etat.comptes ?? []
  const compte = compteId || comptes[0]?.id || ''
  // Ce qui reste à verser ce mois-ci pour chaque objectif : proposé quand on le choisit (lot 36).
  const plan = new Map(epargne.data ? lignesDuPlan(epargne.data.planMois).map((l) => [l.objectifId, l]) : [])
  const restes = new Map([...plan].map(([id, l]) => [id, l.reste]))

  function choisir(id: string) {
    setObjectif(id)
    const reste = restes.get(id)
    if (sens === 'versement' && reste && (montant === '' || montant === versSaisie(restes.get(objectif) ?? -1))) setMontant(versSaisie(reste))
  }
  // Le champ n'existe qu'une fois l'épargne chargée : le focus suit.
  useEffect(() => champMontant.current?.focus(), [epargne.isPending])

  if (epargne.isPending) return <div className="h-64 animate-pulse rounded-carte bg-interne" aria-label="Chargement de l’épargne" />
  if (comptes.length === 0) {
    return (
      <div className="rounded-bouton bg-interne p-5">
        <p className="text-texte font-medium text-encre">Déclare d’abord ton épargne.</p>
        <p className="mt-2 text-texte-sm text-gris">Un versement va sur un compte d’épargne. Ajoute ton compte et ce qu’il contient aujourd’hui.</p>
        <Link to="/plan?onglet=epargne" onClick={onTermine} className={styleBouton({ taille: 'sm', className: 'mt-4' })}>
          Ajouter un compte
        </Link>
      </div>
    )
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = lireMontant(montant)
    const p: Record<string, string> = {}
    if ('erreur' in lu) p.montant = lu.erreur
    if (date > aujourdhui) p.date = 'Un mouvement réel ne peut pas être dans le futur.'
    setErreurs(p)
    if ('erreur' in lu || Object.keys(p).length > 0) return
    try {
      const { id } = await ajouter.mutateAsync({ sens, compteId: compte, objectifId: objectif || null, date, montant: lu.valeur, libelle: libelle.trim() })
      const vers = epargne.data?.objectifs.find((o) => o.id === objectif)?.libelle
      toast(`${sens === 'versement' ? 'Versement' : 'Retrait'} de ${formaterMontant(lu.valeur)}${vers ? ` · ${vers}` : ''} noté.`, {
        action: { label: 'Annuler', onClick: () => supprimer.mutate(id) },
      })
      onTermine()
    } catch (erreur) {
      setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' })
    }
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <Choix
        libelle="Mouvement"
        valeur={sens}
        onChange={setSens}
        options={[
          { valeur: 'versement', libelle: 'Je mets de côté' },
          { valeur: 'retrait', libelle: 'Je retire' },
        ]}
      />
      <ChampMontant ref={champMontant} libelle="Montant" value={montant} onChange={(e) => setMontant(e.target.value)} erreur={erreurs.montant} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-texte-sm text-gris">Pour</legend>
        <div role="radiogroup" aria-label="Objectif" className="grid max-h-[264px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {[{ id: '', libelle: 'Épargne libre', statut: 'actif' }, ...(epargne.data?.objectifs ?? [])].map((o) => {
            const choisi = objectif === o.id
            const ligne = plan.get(o.id)
            return (
              <button
                key={o.id || 'libre'}
                type="button"
                role="radio"
                aria-checked={choisi}
                onClick={() => choisir(o.id)}
                className={cn(
                  'flex min-w-0 flex-col items-start rounded-champ border px-3.5 py-2.5 text-left transition-colors',
                  choisi ? 'border-primaire bg-sauge-50 ring-1 ring-primaire' : 'border-filet bg-white hover:border-filet-fort',
                )}
              >
                <span className="w-full truncate text-texte-sm font-semibold text-encre">{o.libelle}</span>
                <span className="w-full truncate text-mention text-gris">
                  {o.id === '' ? 'Sans objectif' : o.statut === 'pause' ? 'En pause' : <EtatCeMois ligne={ligne} />}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        {comptes.length > 1 && (
          <Selection libelle="Compte" value={compte} onChange={(e) => setCompteId(e.target.value)}>
            {comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </Selection>
        )}
        <Champ libelle="Date" type="date" max={aujourdhui} value={date} onChange={(e) => setDate(e.target.value)} erreur={erreurs.date} />
        <Champ libelle="Libellé (facultatif)" placeholder="Virement du mois…" value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={60} />
      </div>
      <p className="text-mention text-gris">L’épargne n’est jamais comptée comme une dépense.</p>
      {erreurs._ && (
        <p role="alert" className="text-texte-sm font-medium text-alerte">
          {erreurs._}
        </p>
      )}
      <Bouton type="submit" taille="lg" className="w-full" chargement={ajouter.isPending}>
        {sens === 'versement' ? 'Noter le versement' : 'Noter le retrait'}
      </Bouton>
    </form>
  )
}

/** État de l'objectif dans le plan du mois, sous son nom (lot 36). */
function EtatCeMois({ ligne }: { ligne: LignePlan | undefined }) {
  if (!ligne) return <>Rien de prévu ce mois-ci</>
  if (ligne.etat === 'saute') return <>Pas ce mois-ci</>
  if (ligne.reste > 0) return <>Reste <Montant valeur={ligne.reste} /> ce mois-ci</>
  return <>Fait ce mois-ci</>
}
