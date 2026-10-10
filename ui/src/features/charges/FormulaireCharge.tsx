import { centimes, planEnveloppe, type DateCivile, type FrequenceCharge, type NatureCharge, type Semaine, type UniteEnveloppe } from '@mysalary/moteur'
import { CERTITUDES, formaterDate, formaterMois, formaterMontant, type ChargeDto, type PonctuelDto, type SaisieCharge, type SaisiePonctuel } from '@mysalary/partage'
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
import { phrasePlanEnveloppe, RYTHMES } from './saisie'
import { cn } from '../../lib/cn'

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
  /** Mois budgétaire en cours et ses semaines : montant de chaque semaine d'une enveloppe. */
  mois?: { debut: DateCivile; fin: DateCivile; nbJours: number; semaines: Semaine[] }
  chargement?: boolean
  onEnregistrer: (saisie: SaisieCharge) => Promise<unknown>
}

/** Charge fixe (datée, récurrente) ou enveloppe (budget par mois budgétaire). */
export function FormulaireCharge({ nature, initial, aujourdhui, moisCourant, mois: moisEnCours, chargement, onEnregistrer }: ProprietesCharge) {
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
  const [unite, setUnite] = useState<UniteEnveloppe>(initial?.unite ?? 'mois')
  const [rythme, setRythme] = useState(initial?.rythme ? versSaisie(initial.rythme) : '')
  // Montants choisis pour les semaines du mois en cours (vide : le montant par semaine).
  const semainesDuMois = moisEnCours?.semaines ?? []
  const [ajustements, setAjustements] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.semaines ?? []).filter((a) => semainesDuMois.some((s) => s.debut === a.debut)).map((a) => [a.debut, versSaisie(a.montant)])),
  )
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
    const parRythme = !fixe && unite !== 'mois'
    const luRythme = lireMontant(rythme)
    if (parRythme && 'erreur' in luRythme) p.rythme = luRythme.erreur
    else if (parRythme && 'valeur' in lu && 'valeur' in luRythme && luRythme.valeur > lu.valeur) p.rythme = 'Ne peut pas dépasser le budget du mois.'
    const semainesChoisies: { debut: string; montant: number }[] = []
    if (!fixe && unite === 'semaine') {
      for (const [debutSemaine, texte] of Object.entries(ajustements)) {
        if (texte.trim() === '') continue
        const luSemaine = lireMontant(texte, 0)
        if ('erreur' in luSemaine) p[`semaine-${debutSemaine}`] = luSemaine.erreur
        else semainesChoisies.push({ debut: debutSemaine, montant: luSemaine.valeur })
      }
      // Les semaines choisies pour un mois à venir restent ; celles des mois passés tombent.
      semainesChoisies.push(...(initial?.semaines ?? []).filter((a) => moisEnCours && a.debut > moisEnCours.fin))
    }
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
        unite: fixe ? 'mois' : unite,
        rythme: parRythme && 'valeur' in luRythme ? luRythme.valeur : null,
        semaines: semainesChoisies,
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

      {fixe ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <ChampMontant libelle="Montant" placeholder="100" value={montant} onChange={(e) => setMontant(e.target.value)} erreur={erreurs.montant} />
          <Champ libelle="Jour du paiement" type="number" inputMode="numeric" min={1} max={31} value={jour} onChange={(e) => setJour(e.target.value)} erreur={erreurs.jour} aide="31 = dernier jour du mois." />
        </div>
      ) : (
        <>
          <ChampMontant libelle="Budget du mois" placeholder="300" value={montant} onChange={(e) => setMontant(e.target.value)} erreur={erreurs.montant} aide="Ce que tu t’accordes sur un mois budgétaire, de paie à paie." />
          <Choix
            libelle="Je consomme ce budget"
            valeur={unite}
            onChange={setUnite}
            options={(['mois', 'semaine', 'jour'] as const).map((u) => ({ valeur: u, libelle: RYTHMES[u].libelle }))}
            aide={RYTHMES[unite].explication}
          />
          {unite !== 'mois' && (
            <ChampMontant
              libelle={RYTHMES[unite].champ!}
              placeholder={unite === 'jour' ? '20' : '100'}
              value={rythme}
              onChange={(e) => setRythme(e.target.value)}
              erreur={erreurs.rythme}
            />
          )}
          {unite !== 'mois' && moisEnCours && (
            <PlanDuMois
              mois={moisEnCours}
              budget={montant}
              unite={unite}
              rythme={rythme}
              ajustements={ajustements}
              erreurs={erreurs}
              onAjuster={(debutSemaine, texte) => setAjustements((a) => ({ ...a, [debutSemaine]: texte }))}
            />
          )}
        </>
      )}

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

const valeurOuZero = (texte: string, minimum = 1) => {
  const lu = lireMontant(texte, minimum)
  return 'valeur' in lu ? lu.valeur : 0
}

/**
 * Mois en cours d'une enveloppe par semaine ou par jour : ce que chaque semaine ouvre, et quand le budget est atteint.
 * Par semaine, chaque semaine accepte son propre montant (vide : le montant par semaine).
 */
function PlanDuMois({
  mois,
  budget,
  unite,
  rythme,
  ajustements,
  erreurs,
  onAjuster,
}: {
  mois: { debut: DateCivile; nbJours: number; semaines: Semaine[] }
  budget: string
  unite: Exclude<UniteEnveloppe, 'mois'>
  rythme: string
  ajustements: Record<string, string>
  erreurs: Record<string, string>
  onAjuster: (debut: string, texte: string) => void
}) {
  const plan = planEnveloppe(
    {
      budget: centimes(valeurOuZero(budget)),
      unite,
      rythme: centimes(valeurOuZero(rythme)),
      ajustements: Object.entries(ajustements)
        .filter(([, texte]) => texte.trim() !== '' && 'valeur' in lireMontant(texte, 0))
        .map(([debut, texte]) => ({ debut: debut as DateCivile, montant: centimes(valeurOuZero(texte, 0)) })),
    },
    mois,
    mois.semaines,
  )
  const phrase = phrasePlanEnveloppe(plan, unite)
  return (
    <section aria-label="Semaines de ce mois" className="flex flex-col gap-3 rounded-carte border border-filet bg-teinte p-4">
      <p className="text-texte-sm font-semibold text-encre">Ce mois-ci, semaine par semaine</p>
      <ul className="flex flex-col gap-2">
        {plan.semaines.map((s) => (
          <li key={s.debut} className={cn('grid items-center gap-x-3', unite === 'semaine' ? 'grid-cols-[minmax(0,1fr)_112px]' : 'grid-cols-1')}>
            <span className="min-w-0 text-texte-sm">
              <span className="block font-semibold text-encre">Semaine {s.numero}</span>
              <span className="block text-mention text-gris">
                {s.nbJours === 1 ? formaterDate(s.debut, 'court') : `${formaterDate(s.debut, 'court')} → ${formaterDate(s.fin, 'court')}`}
              </span>
              <span className={cn('chiffres block text-mention', s.ouvert < s.demande ? 'text-gris' : 'font-semibold text-encre-2')}>
                {formaterMontant(s.ouvert)} ouverts{unite === 'jour' ? ` sur ${formaterMontant(s.demande)} prévus` : ''}
              </span>
            </span>
            {unite === 'semaine' && (
              <ChampMontant
                libelle={`Montant de la semaine ${s.numero}`}
                libelleMasque
                placeholder={rythme.trim() || '0'}
                value={ajustements[s.debut] ?? ''}
                onChange={(e) => onAjuster(s.debut, e.target.value)}
                erreur={erreurs[`semaine-${s.debut}`]}
              />
            )}
          </li>
        ))}
      </ul>
      <p className={cn('text-texte-sm font-medium', phrase.ton === 'alerte' ? 'text-alerte' : 'text-positif')}>{phrase.texte}</p>
    </section>
  )
}
