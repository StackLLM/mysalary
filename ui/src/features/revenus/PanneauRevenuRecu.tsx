import { decalerMois, lireCleMois, plusTot } from '@mysalary/moteur'
import { formaterDate, type RevenuPrevu, type RevenuRecuDto } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { ErreurApi } from '../../lib/api'
import { lireMontant, versSaisie } from '../salaire/saisie'
import { useEnregistrerRecu, useRevenusPrevus, useSupprimerRecu } from './requetes'
import { libelleVersementPrevu } from './saisie'

const styleSelect =
  'h-[46px] w-full rounded-champ border border-filet bg-white px-4 text-texte font-medium text-encre hover:border-filet-fort focus:border-primaire focus:shadow-focus focus:outline-none'

const AUTRE = 'autre'
const cleVersement = (r: { sourceId: string | null; moisOccurrence?: string | null; moisVersement?: string }) =>
  r.sourceId ? `${r.sourceId}|${r.moisOccurrence ?? r.moisVersement}` : AUTRE

interface Proprietes {
  ouvert: boolean
  onFermer: () => void
  aujourdhui: string
  /** Revenu reçu à corriger, ou versement prévu à confirmer. */
  recu?: RevenuRecuDto | null
  prevu?: RevenuPrevu | null
}

/** Noter un revenu reçu hors paie (R3) : lié à un versement prévu, ou libre. */
export function PanneauRevenuRecu({ ouvert, onFermer, aujourdhui, recu, prevu }: Proprietes) {
  return (
    <Panneau
      ouvert={ouvert}
      onFermer={onFermer}
      titre={recu ? 'Corriger un revenu reçu' : 'Noter un revenu reçu'}
      description="Un revenu reçu est réel. S’il répond à un versement prévu, l’écart s’affiche ; le prévu ne change pas."
    >
      {ouvert && <Formulaire key={recu?.id ?? prevu?.sourceId ?? 'nouveau'} aujourdhui={aujourdhui} recu={recu ?? null} prevu={prevu ?? null} onFini={onFermer} />}
    </Panneau>
  )
}

function Formulaire({ aujourdhui, recu, prevu, onFini }: { aujourdhui: string; recu: RevenuRecuDto | null; prevu: RevenuPrevu | null; onFini: () => void }) {
  const ceMois = lireCleMois(aujourdhui.slice(0, 7))
  const attendus = useRevenusPrevus(decalerMois(ceMois, -3), decalerMois(ceMois, 1))
  const enregistrer = useEnregistrerRecu()
  const supprimer = useSupprimerRecu()

  // Versements à part, pas encore reçus (plus celui du revenu corrigé).
  const choix = (attendus.data?.revenus ?? []).filter(
    (r) => r.versement === 'dateSeparee' && (r.statut !== 'recu' || (recu && r.revenuRecuId === recu.id)),
  )

  const [versement, setVersement] = useState(recu ? cleVersement(recu) : prevu ? cleVersement(prevu) : AUTRE)
  const [date, setDate] = useState(recu?.date ?? (prevu ? plusTot(prevu.datePrevue, aujourdhui as typeof prevu.datePrevue) : aujourdhui))
  const [montant, setMontant] = useState(recu ? versSaisie(recu.montant) : prevu ? versSaisie(prevu.montantPrevu) : '')
  const [libelle, setLibelle] = useState(recu && !recu.sourceId ? recu.libelle : '')
  const [note, setNote] = useState(recu?.note ?? '')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  const attendu = choix.find((r) => cleVersement(r) === versement)

  function choisir(cle: string) {
    setVersement(cle)
    const r = choix.find((x) => cleVersement(x) === cle)
    if (r && !recu) {
      setMontant(versSaisie(r.montantPrevu))
      setDate(plusTot(r.datePrevue, aujourdhui as typeof r.datePrevue))
    }
  }

  function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = lireMontant(montant)
    const problemes: Record<string, string> = {}
    if ('erreur' in lu) problemes.montant = lu.erreur
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problemes.date = 'Choisis une date.'
    if (versement === AUTRE && !libelle.trim()) problemes.libelle = 'Libellé obligatoire.'
    setErreurs(problemes)
    if (Object.keys(problemes).length > 0 || 'erreur' in lu) return
    const [sourceId, moisOccurrence] = versement === AUTRE ? [null, null] : versement.split('|')
    enregistrer.mutate(
      {
        ...(recu ? { id: recu.id } : {}),
        sourceId: sourceId ?? null,
        moisOccurrence: moisOccurrence ?? null,
        date,
        montant: lu.valeur,
        ...(versement === AUTRE ? { libelle: libelle.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: (enregistre) => {
          if (recu) {
            toast('Revenu corrigé.')
          } else {
            toast(`Revenu reçu noté : ${enregistre.libelle}.`, {
              action: { label: 'Annuler', onClick: () => supprimer.mutate(enregistre.id) },
            })
          }
          onFini()
        },
        onError: (erreur) =>
          setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' }),
      },
    )
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-texte-sm text-gris">Ce revenu correspond à</span>
        <select value={versement} onChange={(e) => choisir(e.target.value)} className={styleSelect} aria-invalid={Boolean(erreurs.moisOccurrence) || undefined}>
          {choix.map((r) => (
            <option key={cleVersement(r)} value={cleVersement(r)}>
              {libelleVersementPrevu(r)}
            </option>
          ))}
          {recu?.sourceId && !choix.some((r) => cleVersement(r) === versement) && <option value={versement}>{recu.libelle}</option>}
          <option value={AUTRE}>Autre revenu, non prévu</option>
        </select>
        {erreurs.moisOccurrence && <span className="text-mention text-alerte">{erreurs.moisOccurrence}</span>}
        {attendu && (
          <span className="text-mention text-gris">
            Prévu le {formaterDate(attendu.datePrevue)} : <Montant valeur={attendu.montantPrevu} />
          </span>
        )}
      </label>

      {versement === AUTRE && (
        <Champ libelle="Libellé" placeholder="Cadeau, remboursement…" value={libelle} onChange={(e) => setLibelle(e.target.value)} erreur={erreurs.libelle} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="Date" type="date" max={aujourdhui} value={date} onChange={(e) => setDate(e.target.value)} erreur={erreurs.date} />
        <ChampMontant libelle="Montant reçu" value={montant} onChange={(e) => setMontant(e.target.value)} erreur={erreurs.montant} />
      </div>

      <Champ libelle="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />

      {erreurs._ && (
        <p role="alert" className="text-texte-sm font-medium text-alerte">
          {erreurs._}
        </p>
      )}
      <div className="flex justify-end gap-3">
        {recu && (
          <Bouton
            variante="danger"
            taille="md"
            chargement={supprimer.isPending}
            onClick={() =>
              supprimer.mutate(recu.id, {
                onSuccess: () => {
                  // Un montant réel ne disparaît jamais sans retour possible (ux-ui.md (UX) § 6).
                  const { id: _id, creeLe: _cree, ...copie } = recu
                  toast('Revenu reçu supprimé.', {
                    action: { label: 'Annuler', onClick: () => enregistrer.mutate({ ...copie, note: copie.note ?? undefined }) },
                  })
                  onFini()
                },
              })
            }
          >
            Supprimer
          </Bouton>
        )}
        <Bouton type="submit" taille="md" chargement={enregistrer.isPending}>
          {recu ? 'Enregistrer' : 'Noter ce revenu'}
        </Bouton>
      </div>
    </form>
  )
}
