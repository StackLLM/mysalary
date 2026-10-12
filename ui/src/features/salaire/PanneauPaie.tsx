import { CERTITUDES, deMois, formaterDate, formaterMois, type Certitude, type PaieDto } from '@mysalary/partage'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { BadgeNature } from '../../components/Badges'
import { Bouton } from '../../components/Bouton'
import { Separateur } from '../../components/Carte'
import { Champ, ChampMontant } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { Paire, Pastille } from '../../components/Elements'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { ErreurApi } from '../../lib/api'
import { cn } from '../../lib/cn'
import { useAnnulerReception, useEnregistrerPrimes, useRecevoirPaie } from './requetes'
import { dateProposee, lireMontant, moisPossibles, statutPaie, totauxReception, versSaisie } from './saisie'

type Mode = 'detail' | 'primes' | 'reception'

const CERTITUDES_LIBELLES: Record<Certitude, string> = { garanti: 'Garantie', probable: 'Probable', incertain: 'Incertaine' }

const styleSelect =
  'h-[46px] w-full rounded-champ border border-filet bg-white px-4 text-texte font-medium text-encre hover:border-filet-fort focus:border-primaire focus:shadow-focus focus:outline-none'

interface Proprietes {
  paie: PaieDto | null
  aujourdhui: string
  /** Ouvre directement le formulaire de réception. */
  modeInitial?: Mode
  onFermer: () => void
}

/** Détail d'une paie : primes prévues, confirmation, correction, annulation (ux-ui.md (UX) § 4.2). */
export function PanneauPaie({ paie, aujourdhui, modeInitial = 'detail', onFermer }: Proprietes) {
  return (
    <Panneau
      ouvert={paie !== null}
      onFermer={onFermer}
      titre={paie ? `Paie ${deMois(paie.mois)}` : ''}
      description={paie ? `Elle finance ${formaterMois(paie.mois)}, à partir du ${formaterDate(paie.debutMois)}.` : undefined}
    >
      {paie && <Contenu key={`${paie.mois}-${paie.statut}`} paie={paie} aujourdhui={aujourdhui} modeInitial={modeInitial} onFermer={onFermer} />}
    </Panneau>
  )
}

function Contenu({ paie, aujourdhui, modeInitial, onFermer }: Required<Omit<Proprietes, 'paie'>> & { paie: PaieDto }) {
  const [mode, setMode] = useState<Mode>(paie.statut === 'recue' && modeInitial === 'primes' ? 'detail' : modeInitial)
  if (mode === 'primes') return <EditionPrimes paie={paie} onRetour={() => setMode('detail')} />
  if (mode === 'reception') return <Reception paie={paie} aujourdhui={aujourdhui} onRetour={() => setMode('detail')} onFini={onFermer} />
  return <Detail paie={paie} aujourdhui={aujourdhui} onMode={setMode} />
}

function Detail({ paie, aujourdhui, onMode }: { paie: PaieDto; aujourdhui: string; onMode: (m: Mode) => void }) {
  const statut = statutPaie(paie, aujourdhui)
  const annuler = useAnnulerReception()
  const [confirmer, setConfirmer] = useState(false)
  const recue = paie.statut === 'recue'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Pastille ton={statut.ton}>{statut.texte}</Pastille>
        <Paire cle="Date prévue" valeur={formaterDate(paie.datePrevue, 'long')} />
        {paie.dateReelle && <Paire cle="Date réelle" valeur={formaterDate(paie.dateReelle, 'long')} />}
      </div>

      <Separateur />

      <ul className="flex flex-col gap-3" aria-label="Lignes de la paie">
        {paie.lignes.map((l, i) => (
          <li key={l.id ?? `salaire-${i}`} className="flex items-start justify-between gap-4 text-texte">
            <span className="min-w-0">
              <span className="block truncate font-medium text-encre">{l.libelle}</span>
              <span className="text-mention text-gris">
                {l.type === 'prime' ? `${l.sourceId ? 'Revenu récurrent' : 'Prime'} · ${CERTITUDES_LIBELLES[l.certitude].toLowerCase()}` : 'Salaire du contrat'}
                {l.montantPrevu === null && ' · imprévue'}
              </span>
            </span>
            <span className="flex flex-col items-end">
              {recue ? (
                <>
                  <Montant valeur={l.montantRecu ?? 0} className="font-semibold text-encre" />
                  {l.montantPrevu !== null && l.montantPrevu !== l.montantRecu && (
                    <span className="text-mention text-gris">
                      prévu <Montant valeur={l.montantPrevu} />
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Montant valeur={l.montantPrevu ?? 0} className="font-semibold text-gris" />
                  <BadgeNature nature="prevu" />
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      <dl className="chiffres flex flex-col gap-2 border-t border-filet pt-4 text-texte">
        <div className="flex justify-between">
          <dt className="text-gris">Total prévu</dt>
          <dd className="font-semibold text-encre">
            <Montant valeur={paie.totalPrevu} />
          </dd>
        </div>
        {paie.totalRecu !== null && (
          <>
            <div className="flex justify-between">
              <dt className="text-gris">Total reçu</dt>
              <dd className="font-semibold text-encre">
                <Montant valeur={paie.totalRecu} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gris">Écart</dt>
              <dd className={cn('font-semibold', (paie.ecart ?? 0) < 0 ? 'text-alerte' : 'text-encre')}>
                <Montant valeur={paie.ecart ?? 0} />
              </dd>
            </div>
          </>
        )}
      </dl>

      <div className="flex flex-col gap-3">
        {recue ? (
          <>
            <Bouton variante="teinte" taille="md" onClick={() => onMode('reception')}>
              Corriger la réception
            </Bouton>
            <Bouton variante="danger" taille="md" onClick={() => setConfirmer(true)}>
              Annuler la réception
            </Bouton>
          </>
        ) : (
          <>
            <Bouton taille="md" onClick={() => onMode('reception')}>
              Confirmer la réception
            </Bouton>
            <Bouton variante="teinte" taille="md" onClick={() => onMode('primes')}>
              Primes prévues sur cette paie
            </Bouton>
          </>
        )}
      </div>

      <Confirmation
        ouvert={confirmer}
        onFermer={() => setConfirmer(false)}
        titre="Annuler la réception ?"
        description="La paie redevient prévue. Les montants reçus sont effacés ; les primes prévues restent."
        libelleConfirmer="Annuler la réception"
        chargement={annuler.isPending}
        onConfirmer={() =>
          annuler.mutate(paie.mois, {
            onSuccess: () => {
              setConfirmer(false)
              toast(`Réception de la paie ${deMois(paie.mois)} annulée.`)
            },
            onError: () => toast('L’annulation n’a pas abouti. Réessaie.'),
          })
        }
      />
    </div>
  )
}

interface LignePrime {
  cle: string
  id?: string
  libelle: string
  montant: string
  certitude: Certitude
}

let compteur = 0
const nouvelleCle = () => `n${++compteur}`

function EditionPrimes({ paie, onRetour }: { paie: PaieDto; onRetour: () => void }) {
  const enregistrer = useEnregistrerPrimes()
  const [primes, setPrimes] = useState<LignePrime[]>(() =>
    // Les primes des sources se gèrent dans « Autres revenus » : seules les primes de cette paie sont ici.
    paie.lignes
      .filter((l) => l.type === 'prime' && !l.sourceId)
      .map((l) => ({ cle: l.id ?? nouvelleCle(), libelle: l.libelle, montant: versSaisie(l.montantPrevu ?? 0), certitude: l.certitude })),
  )
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  const changer = (cle: string, modif: Partial<LignePrime>) => setPrimes((ps) => ps.map((p) => (p.cle === cle ? { ...p, ...modif } : p)))

  function soumettre(e: FormEvent) {
    e.preventDefault()
    const problemes: Record<string, string> = {}
    const saisies = primes.map((p) => {
      const lu = lireMontant(p.montant)
      if ('erreur' in lu) problemes[`${p.cle}.montant`] = lu.erreur
      if (!p.libelle.trim()) problemes[`${p.cle}.libelle`] = 'Libellé obligatoire.'
      return { libelle: p.libelle.trim(), certitude: p.certitude, montantPrevu: 'valeur' in lu ? lu.valeur : 0 }
    })
    setErreurs(problemes)
    if (Object.keys(problemes).length > 0) return
    enregistrer.mutate(
      { mois: paie.mois, primes: saisies },
      {
        onSuccess: () => {
          toast(saisies.length ? 'Primes prévues enregistrées.' : 'Primes prévues retirées.')
          onRetour()
        },
        onError: (erreur) => setErreurs({ _: erreur instanceof ErreurApi ? erreur.message : 'Erreur inattendue.' }),
      },
    )
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <p className="text-texte-sm text-gris">
        Primes versées <span className="font-semibold text-encre-2">une seule fois</span> avec cette paie. Elles restent « prévues » jusqu’à la réception.
        Une prime qui revient (chaque juin, chaque trimestre…) s’ajoute dans « Autres revenus ».
      </p>
      {primes.length === 0 && <p className="rounded-champ bg-teinte px-4 py-3 text-texte-sm text-gris">Aucune prime prévue sur cette paie.</p>}
      {primes.map((p, i) => (
        <fieldset key={p.cle} className="flex flex-col gap-3 rounded-bouton border border-filet p-4">
          <legend className="sr-only">Prime {i + 1}</legend>
          <div className="flex items-end gap-2">
            <Champ
              className="flex-1"
              libelle="Libellé"
              value={p.libelle}
              placeholder="Prime de fin d’année"
              onChange={(e) => changer(p.cle, { libelle: e.target.value })}
              erreur={erreurs[`${p.cle}.libelle`]}
            />
            <Bouton
              variante="contour"
              taille="sm"
              className="mb-[5px] h-9 w-9 p-0"
              aria-label={`Retirer la prime ${p.libelle || i + 1}`}
              onClick={() => setPrimes((ps) => ps.filter((x) => x.cle !== p.cle))}
            >
              <Trash2 className="h-4 w-4" />
            </Bouton>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ChampMontant libelle="Montant" value={p.montant} onChange={(e) => changer(p.cle, { montant: e.target.value })} erreur={erreurs[`${p.cle}.montant`]} />
            <label className="flex flex-col gap-1.5">
              <span className="text-texte-sm text-gris">Certitude</span>
              <select value={p.certitude} onChange={(e) => changer(p.cle, { certitude: e.target.value as Certitude })} className={styleSelect}>
                {CERTITUDES.map((c) => (
                  <option key={c} value={c}>
                    {CERTITUDES_LIBELLES[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      ))}
      <Bouton
        variante="puce"
        taille="sm"
        className="self-start"
        onClick={() => setPrimes((ps) => [...ps, { cle: nouvelleCle(), libelle: '', montant: '', certitude: 'probable' }])}
      >
        + Ajouter une prime
      </Bouton>
      {erreurs._ && <p className="text-texte-sm font-medium text-alerte">{erreurs._}</p>}
      <div className="flex justify-end gap-3">
        <Bouton variante="contour" taille="md" onClick={onRetour}>
          Retour
        </Bouton>
        <Bouton type="submit" taille="md" chargement={enregistrer.isPending}>
          Enregistrer
        </Bouton>
      </div>
    </form>
  )
}

interface LigneRecue {
  cle: string
  id?: string
  sourceId?: string
  libelle: string
  prevu: number | null
  montant: string
}

function Reception({ paie, aujourdhui, onRetour, onFini }: { paie: PaieDto; aujourdhui: string; onRetour: () => void; onFini: () => void }) {
  const recevoir = useRecevoirPaie()
  const annuler = useAnnulerReception()
  const correction = paie.statut === 'recue'
  const salaire = paie.lignes.find((l) => l.type === 'salaire')

  const [date, setDate] = useState(dateProposee(paie, aujourdhui))
  const [mois, setMois] = useState(paie.mois)
  const [salaireRecu, setSalaireRecu] = useState(versSaisie(salaire?.montantRecu ?? salaire?.montantPrevu ?? 0))
  const [primes, setPrimes] = useState<LigneRecue[]>(() =>
    paie.lignes
      .filter((l) => l.type === 'prime')
      .map((l) => ({
        cle: l.id ?? l.sourceId ?? nouvelleCle(),
        id: l.id ?? undefined,
        sourceId: l.sourceId ?? undefined,
        libelle: l.libelle,
        prevu: l.montantPrevu,
        montant: versSaisie(l.montantRecu ?? l.montantPrevu ?? 0),
      })),
  )
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  const { recu, ecart } = totauxReception(paie.totalPrevu, [salaireRecu, ...primes.map((p) => p.montant)])
  const changer = (cle: string, modif: Partial<LigneRecue>) => setPrimes((ps) => ps.map((p) => (p.cle === cle ? { ...p, ...modif } : p)))

  function soumettre(e: FormEvent) {
    e.preventDefault()
    const problemes: Record<string, string> = {}
    const luSalaire = lireMontant(salaireRecu, 0)
    if ('erreur' in luSalaire) problemes.salaireRecu = luSalaire.erreur
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problemes.dateReelle = 'Choisis une date.'
    const saisies = primes.map((p) => {
      const lu = lireMontant(p.montant, 0)
      if ('erreur' in lu) problemes[`${p.cle}.montant`] = lu.erreur
      if (!p.libelle.trim()) problemes[`${p.cle}.libelle`] = 'Libellé obligatoire.'
      return { ...(p.id ? { id: p.id } : {}), ...(p.sourceId ? { sourceId: p.sourceId } : {}), libelle: p.libelle.trim(), montantRecu: 'valeur' in lu ? lu.valeur : 0 }
    })
    setErreurs(problemes)
    if (Object.keys(problemes).length > 0 || 'erreur' in luSalaire) return

    recevoir.mutate(
      { mois, dateReelle: date, salaireRecu: luSalaire.valeur, primes: saisies },
      {
        onSuccess: () => {
          const message = correction
            ? 'Réception corrigée.'
            : `Paie confirmée · ${formaterMois(mois, { annee: false, majuscule: true })} commence le ${formaterDate(date, 'court')}`
          toast(message, correction ? undefined : { action: { label: 'Annuler', onClick: () => annuler.mutate(mois) } })
          onFini()
        },
        onError: (erreur) =>
          setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' }),
      },
    )
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="Date réelle" type="date" max={aujourdhui} value={date} onChange={(e) => setDate(e.target.value)} erreur={erreurs.dateReelle} />
        <label className="flex flex-col gap-1.5">
          <span className="text-texte-sm text-gris">Mois financé</span>
          <select value={mois} onChange={(e) => setMois(e.target.value as PaieDto['mois'])} disabled={correction} className={styleSelect}>
            {moisPossibles(paie.mois).map((m) => (
              <option key={m} value={m}>
                {formaterMois(m, { majuscule: true })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ChampMontant
        libelle="Salaire reçu"
        value={salaireRecu}
        onChange={(e) => setSalaireRecu(e.target.value)}
        erreur={erreurs.salaireRecu}
        aide={salaire?.montantPrevu ? <>Prévu : <Montant valeur={salaire.montantPrevu} /></> : undefined}
      />

      {primes.map((p) =>
        p.prevu !== null ? (
          <ChampMontant
            key={p.cle}
            libelle={`${p.libelle} reçue`}
            value={p.montant}
            onChange={(e) => changer(p.cle, { montant: e.target.value })}
            erreur={erreurs[`${p.cle}.montant`]}
            aide={<>Prévu : <Montant valeur={p.prevu} /> · 0 si elle n’est pas venue</>}
          />
        ) : (
          <fieldset key={p.cle} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] items-end gap-2">
            <legend className="sr-only">Prime imprévue</legend>
            <Champ libelle="Prime imprévue" value={p.libelle} placeholder="Heures sup" onChange={(e) => changer(p.cle, { libelle: e.target.value })} erreur={erreurs[`${p.cle}.libelle`]} />
            <ChampMontant libelle="Montant reçu" value={p.montant} onChange={(e) => changer(p.cle, { montant: e.target.value })} erreur={erreurs[`${p.cle}.montant`]} />
            <Bouton
              variante="contour"
              taille="sm"
              className="mb-[5px] h-9 w-9 p-0"
              aria-label="Retirer la prime imprévue"
              onClick={() => setPrimes((ps) => ps.filter((x) => x.cle !== p.cle))}
            >
              <Trash2 className="h-4 w-4" />
            </Bouton>
          </fieldset>
        ),
      )}

      <Bouton
        variante="puce"
        taille="sm"
        className="self-start"
        onClick={() => setPrimes((ps) => [...ps, { cle: nouvelleCle(), libelle: '', prevu: null, montant: '' }])}
      >
        + Prime imprévue
      </Bouton>

      <dl className="chiffres flex flex-col gap-2 rounded-bouton bg-interne p-4 text-texte shadow-bouton">
        <div className="flex justify-between">
          <dt className="text-gris">Prévu</dt>
          <dd className="font-semibold text-encre">
            <Montant valeur={paie.totalPrevu} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gris">Reçu</dt>
          <dd className="font-semibold text-encre">
            <Montant valeur={recu} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gris">Écart</dt>
          <dd className={cn('font-semibold', ecart < 0 ? 'text-alerte' : 'text-encre')}>
            <Montant valeur={ecart} />
          </dd>
        </div>
      </dl>

      {erreurs._ && (
        <p role="alert" className="text-texte-sm font-medium text-alerte">
          {erreurs._}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Bouton variante="contour" taille="md" onClick={onRetour}>
          Retour
        </Bouton>
        <Bouton type="submit" taille="md" chargement={recevoir.isPending}>
          {correction ? 'Enregistrer la correction' : 'Confirmer'}
        </Bouton>
      </div>
    </form>
  )
}
