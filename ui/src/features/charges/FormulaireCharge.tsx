import type { FrequenceCharge, NatureCharge } from '@mysalary/moteur'
import { CERTITUDES, formaterMois, type ChargeDto, type PonctuelDto, type SaisieCharge, type SaisiePonctuel } from '@mysalary/partage'
import type { Certitude } from '@mysalary/moteur'
import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { Interrupteur } from '../../components/Elements'
import { Choix, ChoixMois, Selection } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { CERTITUDES_INFO } from '../revenus/saisie'
import { lireMontant, moisProposes, versSaisie } from '../salaire/saisie'
import { ChampCategorie } from './ChampCategorie'

const FREQUENCES: { valeur: FrequenceCharge; libelle: string }[] = [
  { valeur: 'mensuelle', libelle: 'Chaque mois' },
  { valeur: 'trimestrielle', libelle: 'Tous les 3 mois' },
  { valeur: 'annuelle', libelle: 'Chaque année' },
  { valeur: 'moisChoisis', libelle: 'Certains mois' },
]

function erreursDe(erreur: unknown): Record<string, string> {
  return erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' }
}

function MessageErreur({ texte }: { texte?: string }) {
  return texte ? (
    <p role="alert" className="text-texte-sm font-medium text-alerte">
      {texte}
    </p>
  ) : null
}

interface ProprietesCharge {
  nature: NatureCharge
  initial?: ChargeDto
  aujourdhui: string
  /** Mois budgétaire en cours : début proposé pour une enveloppe. */
  moisCourant: string
  chargement?: boolean
  onEnregistrer: (saisie: SaisieCharge) => Promise<unknown>
}

/** Charge fixe (datée, récurrente) ou enveloppe (budget par mois budgétaire). */
export function FormulaireCharge({ nature, initial, aujourdhui, moisCourant, chargement, onEnregistrer }: ProprietesCharge) {
  const fixe = nature === 'fixe'
  const [libelle, setLibelle] = useState(initial?.libelle ?? '')
  const [categorieId, setCategorieId] = useState(initial?.categorieId ?? '')
  const [montant, setMontant] = useState(initial ? versSaisie(initial.montant) : '')
  const [frequence, setFrequence] = useState<FrequenceCharge>(initial?.frequence ?? 'mensuelle')
  const [mois, setMois] = useState<number[]>(initial?.mois ?? [])
  const [jour, setJour] = useState(String(initial?.jour ?? 1))
  const [debut, setDebut] = useState<string>(initial?.debut ?? (fixe ? aujourdhui.slice(0, 7) : moisCourant))
  const [fin, setFin] = useState<string>(initial?.fin ?? '')
  const [essentielle, setEssentielle] = useState(initial?.essentielle ?? fixe)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = lireMontant(montant)
    const jourNombre = Number(jour)
    const p: Record<string, string> = {}
    if (!libelle.trim()) p.libelle = 'Libellé obligatoire.'
    if (!categorieId) p.categorieId = 'Choisis une catégorie.'
    if ('erreur' in lu) p.montant = lu.erreur
    if (fixe && !(Number.isInteger(jourNombre) && jourNombre >= 1 && jourNombre <= 31)) p.jour = 'Le jour va de 1 à 31.'
    if (fixe && frequence === 'moisChoisis' && mois.length === 0) p.mois = 'Choisis au moins un mois.'
    if (fin && fin < debut) p.fin = 'La fin doit suivre le début.'
    setErreurs(p)
    if (Object.keys(p).length > 0 || 'erreur' in lu) return
    try {
      await onEnregistrer({
        libelle: libelle.trim(),
        categorieId,
        nature,
        montant: lu.valeur,
        frequence: fixe ? frequence : 'mensuelle',
        mois: fixe && frequence === 'moisChoisis' ? mois : [],
        jour: fixe ? jourNombre : null,
        debut,
        fin: fin || null,
        essentielle,
      })
    } catch (erreur) {
      setErreurs(erreursDe(erreur))
    }
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <Champ
        libelle="Libellé"
        placeholder={fixe ? 'Téléphone, loyer, abonnement…' : 'Nourriture, transport, loisirs…'}
        value={libelle}
        onChange={(e) => setLibelle(e.target.value)}
        erreur={erreurs.libelle}
      />
      <ChampCategorie valeur={categorieId} onChange={setCategorieId} erreur={erreurs.categorieId} />

      <div className="grid gap-5 sm:grid-cols-2">
        <ChampMontant
          libelle={fixe ? 'Montant' : 'Budget par mois'}
          placeholder={fixe ? '100' : '1 500'}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          erreur={erreurs.montant}
          aide={fixe ? undefined : 'Pour un mois budgétaire, de paie à paie.'}
        />
        {fixe && (
          <Champ libelle="Jour du paiement" type="number" inputMode="numeric" min={1} max={31} value={jour} onChange={(e) => setJour(e.target.value)} erreur={erreurs.jour} aide="31 = dernier jour du mois." />
        )}
      </div>

      {fixe && (
        <Selection libelle="Fréquence" value={frequence} onChange={(e) => setFrequence(e.target.value as FrequenceCharge)}>
          {FREQUENCES.map((f) => (
            <option key={f.valeur} value={f.valeur}>
              {f.libelle}
            </option>
          ))}
        </Selection>
      )}
      {fixe && frequence === 'moisChoisis' && <ChoixMois valeur={mois} onChange={setMois} erreur={erreurs.mois} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Selection libelle={fixe ? 'Premier paiement en' : 'À partir du mois'} value={debut} onChange={(e) => setDebut(e.target.value)}>
          {moisProposes(aujourdhui, debut).map((m) => (
            <option key={m} value={m}>
              {formaterMois(m, { majuscule: true })}
            </option>
          ))}
        </Selection>
        <Selection libelle="Dernier mois" value={fin} onChange={(e) => setFin(e.target.value)} erreur={erreurs.fin}>
          <option value="">Sans fin</option>
          {moisProposes(aujourdhui, fin || undefined).map((m) => (
            <option key={m} value={m}>
              {formaterMois(m, { majuscule: true })}
            </option>
          ))}
        </Selection>
      </div>

      <Interrupteur libelle="Essentielle (on ne peut pas s’en passer)" actif={essentielle} onChange={setEssentielle} />

      <MessageErreur texte={erreurs._} />
      <Bouton type="submit" taille="md" chargement={chargement} className="self-start">
        {initial ? 'Enregistrer les changements' : fixe ? 'Ajouter cette charge' : 'Ajouter cette enveloppe'}
      </Bouton>
    </form>
  )
}

interface ProprietesPonctuel {
  initial?: PonctuelDto
  aujourdhui: string
  chargement?: boolean
  onEnregistrer: (saisie: SaisiePonctuel) => Promise<unknown>
}

/** Charge unique connue et datée : assurance de décembre, permis, réparation prévue. */
export function FormulairePonctuel({ initial, aujourdhui, chargement, onEnregistrer }: ProprietesPonctuel) {
  const [libelle, setLibelle] = useState(initial?.libelle ?? '')
  const [categorieId, setCategorieId] = useState(initial?.categorieId ?? '')
  const [montant, setMontant] = useState(initial ? versSaisie(initial.montant) : '')
  const [date, setDate] = useState<string>(initial?.date ?? aujourdhui)
  const [certitude, setCertitude] = useState<Certitude>(initial?.certitude ?? 'garanti')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = lireMontant(montant)
    const p: Record<string, string> = {}
    if (!libelle.trim()) p.libelle = 'Libellé obligatoire.'
    if (!categorieId) p.categorieId = 'Choisis une catégorie.'
    if ('erreur' in lu) p.montant = lu.erreur
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) p.date = 'Choisis une date.'
    setErreurs(p)
    if (Object.keys(p).length > 0 || 'erreur' in lu) return
    try {
      await onEnregistrer({ libelle: libelle.trim(), categorieId, montant: lu.valeur, date, certitude })
    } catch (erreur) {
      setErreurs(erreursDe(erreur))
    }
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <Champ libelle="Libellé" placeholder="Assurance auto, permis…" value={libelle} onChange={(e) => setLibelle(e.target.value)} erreur={erreurs.libelle} />
      <ChampCategorie valeur={categorieId} onChange={setCategorieId} erreur={erreurs.categorieId} />
      <div className="grid gap-5 sm:grid-cols-2">
        <ChampMontant libelle="Montant" value={montant} onChange={(e) => setMontant(e.target.value)} erreur={erreurs.montant} />
        <Champ libelle="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} erreur={erreurs.date} />
      </div>
      <Choix
        libelle="Certitude"
        valeur={certitude}
        onChange={setCertitude}
        options={CERTITUDES.map((c) => ({ valeur: c, libelle: c === 'garanti' ? 'Sûr' : CERTITUDES_INFO[c].libelle }))}
        aide={certitude === 'garanti' ? 'Cette dépense aura lieu.' : certitude === 'probable' ? 'Elle aura sans doute lieu.' : 'Elle peut ne pas avoir lieu.'}
      />
      <MessageErreur texte={erreurs._} />
      <Bouton type="submit" taille="md" chargement={chargement} className="self-start">
        {initial ? 'Enregistrer les changements' : 'Ajouter ce ponctuel'}
      </Bouton>
    </form>
  )
}
