import { centimes, planEnveloppe, type FrequenceCharge, type NatureCharge, type UniteEnveloppe } from '@mysalary/moteur'
import { CERTITUDES, formaterDate, formaterMois, formaterMontant, type ChargeDto, type MoisAvecSemaines, type PonctuelDto, type SaisieCharge, type SaisiePonctuel } from '@mysalary/partage'
import type { Certitude } from '@mysalary/moteur'
import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { Interrupteur } from '../../components/Elements'
import { Choix, ChoixMois, Selection } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { CERTITUDES_INFO } from '../revenus/saisie'
import { lireMontant, moisProposes, versSaisie, type Ton } from '../salaire/saisie'
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
  /** Mois en cours puis mois suivant, avec leurs semaines : montant de chaque semaine d'une enveloppe. */
  moisSemaines?: MoisAvecSemaines[]
  chargement?: boolean
  onEnregistrer: (saisie: SaisieCharge) => Promise<unknown>
}

/** Charge fixe (datée, récurrente) ou enveloppe (budget par mois budgétaire). */
export function FormulaireCharge({ nature, initial, aujourdhui, moisCourant, moisSemaines = [], chargement, onEnregistrer }: ProprietesCharge) {
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
  // Par semaine : le montant que l'utilisateur met sur chaque semaine du mois en cours et du suivant (vide = 0).
  const semainesProposees = moisSemaines.flatMap((m) => m.semaines)
  const [montantsSemaines, setMontantsSemaines] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.semaines ?? []).filter((a) => semainesProposees.some((s) => s.debut === a.debut)).map((a) => [a.debut, versSaisie(a.montant)])),
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
    const parJour = !fixe && unite === 'jour'
    const luRythme = lireMontant(rythme)
    if (parJour && 'erreur' in luRythme) p.rythme = luRythme.erreur
    else if (parJour && 'valeur' in lu && 'valeur' in luRythme && luRythme.valeur > lu.valeur) p.rythme = 'Ne peut pas dépasser le budget du mois.'
    const semaines: { debut: string; montant: number }[] = []
    if (!fixe && unite === 'semaine') {
      for (const [debutSemaine, texte] of Object.entries(montantsSemaines)) {
        if (texte.trim() === '') continue
        const luSemaine = lireMontant(texte, 0)
        if ('erreur' in luSemaine) p[`semaine-${debutSemaine}`] = luSemaine.erreur
        else if (luSemaine.valeur > 0) semaines.push({ debut: debutSemaine, montant: luSemaine.valeur })
      }
      // Les montants déjà mis pour des mois plus lointains restent ; ceux des mois passés tombent.
      const dernier = moisSemaines.at(-1)?.fin
      semaines.push(...(initial?.semaines ?? []).filter((a) => dernier && a.debut > dernier))
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
        rythme: parJour && 'valeur' in luRythme ? luRythme.valeur : null,
        semaines,
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
          {unite === 'jour' && (
            <ChampMontant libelle="Montant par jour" placeholder="20" value={rythme} onChange={(e) => setRythme(e.target.value)} erreur={erreurs.rythme} />
          )}
          {unite !== 'mois' && moisSemaines.length > 0 && (
            <SemainesDuMois
              moisSemaines={moisSemaines}
              budget={montant}
              unite={unite}
              rythme={rythme}
              montants={montantsSemaines}
              erreurs={erreurs}
              onMontant={(debutSemaine, texte) => setMontantsSemaines((m) => ({ ...m, [debutSemaine]: texte }))}
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
 * Semaines d'une enveloppe par semaine ou par jour, pour le mois en cours ou le suivant.
 * Par semaine : chaque semaine a son propre champ, libre (vide = 0) ; MySalary n'impose ni ne divise aucun montant,
 * il dit ce qui reste à répartir ou alerte si les semaines dépassent le budget de l'enveloppe.
 */
function SemainesDuMois({
  moisSemaines,
  budget,
  unite,
  rythme,
  montants,
  erreurs,
  onMontant,
}: {
  moisSemaines: MoisAvecSemaines[]
  budget: string
  unite: Exclude<UniteEnveloppe, 'mois'>
  rythme: string
  montants: Record<string, string>
  erreurs: Record<string, string>
  onMontant: (debut: string, texte: string) => void
}) {
  const [cle, setCle] = useState(moisSemaines[0]!.cle)
  const mois = moisSemaines.find((m) => m.cle === cle) ?? moisSemaines[0]!
  const plan = planEnveloppe(
    {
      budget: centimes(valeurOuZero(budget)),
      unite,
      rythme: centimes(valeurOuZero(rythme)),
      ajustements: mois.semaines.map((s) => ({ debut: s.debut, montant: centimes(valeurOuZero(montants[s.debut] ?? '', 0)) })),
    },
    mois,
    mois.semaines,
  )
  const phrase = phrasePlanEnveloppe(plan, unite)
  return (
    <section aria-label="Semaines du mois" className="flex flex-col gap-3 rounded-carte border border-filet bg-teinte p-4">
      <p className="text-texte-sm font-semibold text-encre">{unite === 'semaine' ? 'Ce que je mets chaque semaine' : 'Ce que reçoit chaque semaine'}</p>
      {moisSemaines.length > 1 && (
        <Choix
          libelle="Mois"
          valeur={cle}
          onChange={setCle}
          options={moisSemaines.map((m, i) => ({ valeur: m.cle, libelle: `${formaterMois(m.cle, { majuscule: true, annee: false })}${i === 0 ? ' (en cours)' : ''}` }))}
        />
      )}
      <ul className="flex flex-col gap-2">
        {plan.semaines.map((s) => (
          <li key={s.debut} className={cn('grid items-center gap-x-3', unite === 'semaine' ? 'grid-cols-[minmax(0,1fr)_112px]' : 'grid-cols-[minmax(0,1fr)_auto]')}>
            <span className="min-w-0 text-texte-sm">
              <span className="block font-semibold text-encre">Semaine {s.numero}</span>
              <span className="block text-mention text-gris">
                {s.nbJours === 1 ? formaterDate(s.debut, 'court') : `${formaterDate(s.debut, 'court')} → ${formaterDate(s.fin, 'court')}`}
              </span>
            </span>
            {unite === 'semaine' ? (
              <ChampMontant
                libelle={`Montant de la semaine ${s.numero}`}
                libelleMasque
                placeholder="0"
                value={montants[s.debut] ?? ''}
                onChange={(e) => onMontant(s.debut, e.target.value)}
                erreur={erreurs[`semaine-${s.debut}`]}
              />
            ) : (
              <span className={cn('chiffres whitespace-nowrap text-texte-sm', s.ouvert < s.demande ? 'text-gris' : 'font-semibold text-encre')}>{formaterMontant(s.ouvert)}</span>
            )}
          </li>
        ))}
      </ul>
      <p className={cn('text-texte-sm font-medium', TONS_PHRASE[phrase.ton])} role={phrase.ton === 'alerte' ? 'alert' : undefined}>
        {phrase.texte}
      </p>
    </section>
  )
}

const TONS_PHRASE: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-attention', neutre: 'text-gris' }
