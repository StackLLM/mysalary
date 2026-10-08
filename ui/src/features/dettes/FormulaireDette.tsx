import type { DetteDto, SaisieDette } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { ErreurApi } from '../../lib/api'
import { apercuDette } from '../charges/saisie'
import { lireMontant, versSaisie } from '../salaire/saisie'

interface Proprietes {
  initial?: DetteDto
  aujourdhui: string
  chargement?: boolean
  onEnregistrer: (saisie: SaisieDette) => Promise<unknown>
}

/** Une dette = un total et un échéancier, jamais une charge sans fin (R9). */
export function FormulaireDette({ initial, aujourdhui, chargement, onEnregistrer }: Proprietes) {
  const [libelle, setLibelle] = useState(initial?.libelle ?? '')
  const [creancier, setCreancier] = useState(initial?.creancier ?? '')
  const [total, setTotal] = useState(initial ? versSaisie(initial.montantTotal) : '')
  const [mensualite, setMensualite] = useState(initial ? versSaisie(initial.mensualite) : '')
  const [premiere, setPremiere] = useState<string>(initial?.premiereEcheance ?? aujourdhui)
  const [note, setNote] = useState(initial?.note ?? '')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  const luTotal = lireMontant(total)
  const luMensualite = lireMontant(mensualite)
  const apercu = apercuDette('valeur' in luTotal ? luTotal.valeur : null, 'valeur' in luMensualite ? luMensualite.valeur : null, premiere)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const p: Record<string, string> = {}
    if (!libelle.trim()) p.libelle = 'Libellé obligatoire.'
    if ('erreur' in luTotal) p.montantTotal = luTotal.erreur
    if ('erreur' in luMensualite) p.mensualite = luMensualite.erreur
    if ('valeur' in luTotal && 'valeur' in luMensualite && luMensualite.valeur > luTotal.valeur) p.mensualite = 'La mensualité ne peut pas dépasser le total.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(premiere)) p.premiereEcheance = 'Choisis une date.'
    setErreurs(p)
    if (Object.keys(p).length > 0 || 'erreur' in luTotal || 'erreur' in luMensualite) return
    try {
      await onEnregistrer({
        libelle: libelle.trim(),
        creancier: creancier.trim(),
        montantTotal: luTotal.valeur,
        mensualite: luMensualite.valeur,
        premiereEcheance: premiere,
        ...(note.trim() ? { note: note.trim() } : {}),
      })
    } catch (erreur) {
      setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' })
    }
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Champ libelle="Libellé" placeholder="Prêt, crédit conso…" value={libelle} onChange={(e) => setLibelle(e.target.value)} erreur={erreurs.libelle} />
        <Champ libelle="Auprès de (facultatif)" placeholder="Banque, personne…" value={creancier} onChange={(e) => setCreancier(e.target.value)} maxLength={60} />
        <ChampMontant libelle="Montant total à rembourser" value={total} onChange={(e) => setTotal(e.target.value)} erreur={erreurs.montantTotal} />
        <ChampMontant libelle="Mensualité" value={mensualite} onChange={(e) => setMensualite(e.target.value)} erreur={erreurs.mensualite} />
        <Champ libelle="Première échéance" type="date" value={premiere} onChange={(e) => setPremiere(e.target.value)} erreur={erreurs.premiereEcheance} aide="Les suivantes tombent le même jour chaque mois." />
        <Champ libelle="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </div>
      {apercu && (
        <p className="rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2" aria-live="polite">
          {apercu}
        </p>
      )}
      {erreurs._ && (
        <p role="alert" className="text-texte-sm font-medium text-alerte">
          {erreurs._}
        </p>
      )}
      <Bouton type="submit" taille="md" chargement={chargement} className="self-start">
        {initial ? 'Enregistrer les changements' : 'Ajouter cette dette'}
      </Bouton>
    </form>
  )
}
