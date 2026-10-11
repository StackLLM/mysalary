import type { Certitude, Frequence, TypeRevenu } from '@mysalary/moteur'
import { CERTITUDES, formaterMois, type SaisieSource, type SourceRevenuDto } from '@mysalary/partage'
import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { Choix, ChoixMois, styleSelect } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { lireMontant, moisProposes, versSaisie } from '../salaire/saisie'
import { apercuSource, CERTITUDES_INFO, certitudeParDefaut, FREQUENCES_LIBELLES, TYPES } from './saisie'

interface Proprietes {
  initial?: SourceRevenuDto
  /** Valeurs proposées (ligne importée) : à confirmer ou corriger. Montant en centimes. */
  prefill?: { libelle?: string; type?: TypeRevenu; montant?: number; frequence?: Frequence; debut?: string }
  aujourdhui: string
  /** Contrat en vigueur : pour dire quel mois une prime « avec la paie » finance. `null` = pas de contrat. */
  financeMoisSuivant: boolean | null
  chargement?: boolean
  onEnregistrer: (saisie: SaisieSource) => Promise<unknown>
}

/** Formulaire d'une source de revenus. La saisie est conservée si l'enregistrement échoue. */
export function FormulaireSource({ initial, prefill, aujourdhui, financeMoisSuivant, chargement, onEnregistrer }: Proprietes) {
  const [libelle, setLibelle] = useState(initial?.libelle ?? prefill?.libelle ?? '')
  const [type, setType] = useState<TypeRevenu>(initial?.type ?? prefill?.type ?? 'prime')
  const [montant, setMontant] = useState(initial ? versSaisie(initial.montant) : prefill?.montant ? versSaisie(prefill.montant) : '')
  const [frequence, setFrequence] = useState<Frequence>(initial?.frequence ?? prefill?.frequence ?? 'moisChoisis')
  const [mois, setMois] = useState<number[]>(initial?.mois ?? [])
  const [versement, setVersement] = useState(initial?.versement ?? (financeMoisSuivant === null ? 'dateSeparee' : 'avecPaie'))
  const [jour, setJour] = useState(String(initial?.jour ?? 1))
  const [certitude, setCertitude] = useState<Certitude>(initial?.certitude ?? 'probable')
  const [certitudeTouchee, setCertitudeTouchee] = useState(Boolean(initial))
  const [debut, setDebut] = useState<string>(initial?.debut ?? prefill?.debut ?? aujourdhui.slice(0, 7))
  const [fin, setFin] = useState<string>(initial?.fin ?? '')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  const unique = frequence === 'unique'
  const jourNombre = Number(jour)
  const apercu = apercuSource(
    { frequence, mois, debut, fin: unique ? null : fin || null, versement, jour: versement === 'dateSeparee' ? jourNombre : null },
    aujourdhui,
    financeMoisSuivant,
  )

  function changerType(t: TypeRevenu) {
    setType(t)
    // Certitude proposée selon le type, tant que l'utilisateur ne l'a pas choisie lui-même.
    if (!certitudeTouchee) setCertitude(certitudeParDefaut(t))
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = lireMontant(montant)
    const problemes: Record<string, string> = {}
    if (!libelle.trim()) problemes.libelle = 'Libellé obligatoire.'
    if ('erreur' in lu) problemes.montant = lu.erreur
    if (frequence === 'moisChoisis' && mois.length === 0) problemes.mois = 'Choisis au moins un mois.'
    if (versement === 'dateSeparee' && !(Number.isInteger(jourNombre) && jourNombre >= 1 && jourNombre <= 31)) problemes.jour = 'Le jour va de 1 à 31.'
    if (!unique && fin && fin < debut) problemes.fin = 'La fin doit suivre le début.'
    setErreurs(problemes)
    if (Object.keys(problemes).length > 0 || 'erreur' in lu) return
    try {
      await onEnregistrer({
        libelle: libelle.trim(),
        type,
        montant: lu.valeur,
        frequence,
        mois: frequence === 'moisChoisis' ? mois : [],
        versement,
        jour: versement === 'dateSeparee' ? jourNombre : null,
        certitude,
        debut,
        fin: unique ? null : fin || null,
      })
    } catch (erreur) {
      setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' })
    }
  }

  const listeMois = moisProposes(aujourdhui, debut)

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <Champ libelle="Libellé" placeholder="Prime de fin d’année" value={libelle} onChange={(e) => setLibelle(e.target.value)} erreur={erreurs.libelle} />

      <Choix libelle="Type" valeur={type} options={TYPES} onChange={changerType} aide={TYPES.find((t) => t.valeur === type)?.aide} />

      <div className="grid gap-5 sm:grid-cols-2">
        <ChampMontant
          libelle={type === 'variable' ? 'Montant moyen' : 'Montant'}
          placeholder="1 000"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          erreur={erreurs.montant}
          aide={type === 'variable' ? 'Une estimation : le réel s’affichera à côté.' : undefined}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-texte-sm text-gris">Fréquence</span>
          <select value={frequence} onChange={(e) => setFrequence(e.target.value as Frequence)} className={styleSelect}>
            {FREQUENCES_LIBELLES.map((f) => (
              <option key={f.valeur} value={f.valeur}>
                {f.libelle}
              </option>
            ))}
          </select>
        </label>
      </div>

      {frequence === 'moisChoisis' && <ChoixMois valeur={mois} onChange={setMois} erreur={erreurs.mois} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-texte-sm text-gris">{unique ? 'Mois du versement' : 'À partir de'}</span>
          <select value={debut} onChange={(e) => setDebut(e.target.value)} className={styleSelect}>
            {listeMois.map((m) => (
              <option key={m} value={m}>
                {formaterMois(m, { majuscule: true })}
              </option>
            ))}
          </select>
        </label>
        {!unique && (
          <label className="flex flex-col gap-1.5">
            <span className="text-texte-sm text-gris">Dernier mois</span>
            <select value={fin} onChange={(e) => setFin(e.target.value)} className={styleSelect} aria-invalid={Boolean(erreurs.fin) || undefined}>
              <option value="">Sans fin</option>
              {moisProposes(aujourdhui, fin || undefined).map((m) => (
                <option key={m} value={m}>
                  {formaterMois(m, { majuscule: true })}
                </option>
              ))}
            </select>
            {erreurs.fin && <span className="text-mention text-alerte">{erreurs.fin}</span>}
          </label>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-start">
        <Choix
          libelle="Versement"
          valeur={versement}
          options={[
            { valeur: 'avecPaie', libelle: 'Avec la paie' },
            { valeur: 'dateSeparee', libelle: 'À une autre date' },
          ]}
          onChange={setVersement}
          aide={
            versement === 'avecPaie'
              ? financeMoisSuivant === null
                ? 'Ajoute d’abord ton salaire pour placer ce revenu dans tes paies.'
                : 'Ajouté à la paie prévue, confirmé avec elle.'
              : 'Compté dans le mois budgétaire qui contient sa date.'
          }
        />
        {versement === 'dateSeparee' && (
          <Champ libelle="Jour" type="number" inputMode="numeric" min={1} max={31} value={jour} onChange={(e) => setJour(e.target.value)} erreur={erreurs.jour} />
        )}
      </div>

      <Choix
        libelle="Certitude"
        valeur={certitude}
        options={CERTITUDES.map((c) => ({ valeur: c, libelle: CERTITUDES_INFO[c].libelle }))}
        onChange={(c) => {
          setCertitude(c)
          setCertitudeTouchee(true)
        }}
        aide={CERTITUDES_INFO[certitude].aide}
      />

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
        {initial ? 'Enregistrer les changements' : 'Ajouter ce revenu'}
      </Bouton>
    </form>
  )
}
