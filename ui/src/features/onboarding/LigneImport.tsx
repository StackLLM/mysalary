import { formaterMontant, type ImportDto, type LigneImport, type SaisieDecisionImport } from '@mysalary/partage'
import { useState } from 'react'
import { Bouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { ErreurApi } from '../../lib/api'
import { cn } from '../../lib/cn'
import { lireMontant, versSaisie, type Ton } from '../salaire/saisie'
import { useDeciderLigne } from './requetes'
import { montantLigne, phraseLigne, STATUTS } from './saisie'

const TONS: Record<Ton, string> = { positif: 'bg-positif-fond text-positif', alerte: 'bg-alerte-fond text-alerte', info: 'bg-info-fond text-info', neutre: 'bg-teinte text-encre-2' }

/** Badge d'état d'une ligne importée : « Importé · à confirmer » tant que l'utilisateur ne l'a pas confirmée à son étape. */
export function EtatLigne({ ligne }: { ligne: LigneImport }) {
  const s = STATUTS[ligne.statut]
  return <span className={cn('shrink-0 rounded-pilule px-2.5 py-0.5 text-mention font-semibold', TONS[s.ton])}>{ligne.importable ? s.texte : 'Information'}</span>
}

/**
 * Une ligne proposée par l'import (étape 2) : Importer, Modifier, Ignorer. Les conflits sont posés en question simple :
 * quel salaire, dette ou aide. Rien n'est créé ici : une ligne importée se confirme à son étape.
 */
export function CarteLigneImport({ ligne }: { ligne: LigneImport }) {
  const decider = useDeciderLigne()
  const [edition, setEdition] = useState(false)
  const [libelle, setLibelle] = useState(ligne.libelle)
  const [montant, setMontant] = useState(() => (montantLigne(ligne.donnees) ? versSaisie(montantLigne(ligne.donnees)!) : ''))
  const [autre, setAutre] = useState('')
  const [erreur, setErreur] = useState<string>()
  const d = ligne.donnees

  async function appliquer(decision: SaisieDecisionImport) {
    setErreur(undefined)
    try {
      await decider.mutateAsync({ id: ligne.id, ...decision })
      return true
    } catch (e) {
      setErreur(e instanceof ErreurApi ? (e.champs ? Object.values(e.champs)[0] : undefined) ?? e.message : 'Erreur inattendue. Réessaie.')
      return false
    }
  }

  async function corriger() {
    const lu = montant.trim() ? lireMontant(montant) : null
    if (lu && 'erreur' in lu) return setErreur(lu.erreur)
    if (await appliquer({ libelle, ...(lu ? { montant: lu.valeur } : {}) })) setEdition(false)
  }

  async function autreSalaire() {
    const lu = lireMontant(autre)
    if ('erreur' in lu) return setErreur(lu.erreur)
    if (await appliquer({ choix: lu.valeur })) setAutre('')
  }

  /** Un salaire se choisit et une ligne à classer se range : seules les autres se corrigent. */
  const corrigeable = ligne.importable && d.type !== 'salaire' && d.type !== 'aClasser'

  return (
    <li className={cn('rounded-bouton border border-filet bg-white p-4', ligne.statut === 'ignore' && ligne.importable && 'opacity-60')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-texte font-semibold text-encre">{ligne.libelle}</p>
          <p className="text-texte-sm text-gris">{phraseLigne(ligne)}</p>
        </div>
        <EtatLigne ligne={ligne} />
      </div>
      {ligne.note && <p className="mt-2 text-texte-sm text-gris">{ligne.note}</p>}

      {ligne.importable && d.type === 'salaire' && (
        <fieldset className="mt-3">
          <legend className="text-texte-sm font-medium text-encre">Quel est ton salaire net ?</legend>
          <div className="mt-2 flex flex-col gap-2">
            {d.options.map((o) => (
              <label key={o.montant} className="flex cursor-pointer items-center gap-2.5 text-texte-sm text-encre">
                <input type="radio" name={`salaire-${ligne.id}`} checked={d.choix === o.montant} onChange={() => void appliquer({ choix: o.montant })} className="h-4 w-4 accent-primaire" />
                <span>
                  <span className="chiffres font-semibold">{formaterMontant(o.montant)}</span> <span className="text-gris">· {o.origine}</span>
                </span>
              </label>
            ))}
            <div className="flex items-end gap-2">
              <ChampMontant className="max-w-[200px]" libelle="Un autre montant" placeholder="10 000" value={autre} onChange={(e) => setAutre(e.target.value)} />
              <Bouton variante="contour" taille="sm" className="mb-1" disabled={!autre.trim() || decider.isPending} onClick={() => void autreSalaire()}>
                Choisir
              </Bouton>
            </div>
          </div>
        </fieldset>
      )}

      {ligne.importable && d.type === 'aClasser' && (
        <fieldset className="mt-3">
          <legend className="text-texte-sm font-medium text-encre">Qu’est-ce que c’est ?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['dette', 'aide'] as const).map((choix) => (
              <button
                key={choix}
                type="button"
                role="radio"
                aria-checked={d.destination === choix}
                onClick={() => void appliquer({ destination: choix })}
                className={cn('h-9 rounded-pilule px-4 text-texte-sm font-medium shadow-bouton', d.destination === choix ? 'bg-lien text-white' : 'bg-white text-encre hover:bg-teinte')}
              >
                {choix === 'dette' ? 'Une dette (avec un échéancier)' : 'Une aide récurrente'}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {edition && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Champ libelle="Libellé" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          {montantLigne(d) !== null && <ChampMontant libelle="Montant" value={montant} onChange={(e) => setMontant(e.target.value)} />}
        </div>
      )}
      {erreur && (
        <p role="alert" className="mt-2 text-texte-sm font-medium text-alerte">
          {erreur}
        </p>
      )}

      {ligne.importable && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ligne.statut === 'propose' || edition ? (
            <>
              {edition ? (
                <Bouton variante="puce" taille="sm" onClick={() => void corriger()} disabled={decider.isPending}>
                  Enregistrer la correction
                </Bouton>
              ) : (
                <Bouton variante="puce" taille="sm" onClick={() => void appliquer({ statut: 'importe' })} disabled={decider.isPending} aria-label={`Importer ${ligne.libelle}`}>
                  Importer
                </Bouton>
              )}
              {corrigeable && (
                <Bouton variante="contour" taille="sm" onClick={() => setEdition((e) => !e)} aria-label={`Modifier ${ligne.libelle}`}>
                  {edition ? 'Annuler' : 'Modifier'}
                </Bouton>
              )}
              {!edition && (
                <Bouton variante="contour" taille="sm" onClick={() => void appliquer({ statut: 'ignore' })} disabled={decider.isPending} aria-label={`Ignorer ${ligne.libelle}`}>
                  Ignorer
                </Bouton>
              )}
            </>
          ) : ligne.statut === 'importe' ? (
            <>
              <Bouton variante="contour" taille="sm" onClick={() => setEdition(true)} aria-label={`Modifier ${ligne.libelle}`} disabled={!corrigeable}>
                Modifier
              </Bouton>
              <Bouton variante="contour" taille="sm" onClick={() => void appliquer({ statut: 'ignore' })} disabled={decider.isPending} aria-label={`Ignorer ${ligne.libelle}`}>
                Ignorer
              </Bouton>
            </>
          ) : (
            <Bouton variante="contour" taille="sm" onClick={() => void appliquer({ statut: 'propose' })} disabled={decider.isPending} aria-label={`Reprendre ${ligne.libelle}`}>
              Reprendre
            </Bouton>
          )}
        </div>
      )}
    </li>
  )
}

/** Marque une ligne comme confirmée (créée dans le plan) ou ignorée depuis son étape. */
export function useDecisionEtape() {
  const decider = useDeciderLigne()
  return {
    attente: decider.isPending,
    confirmer: (l: LigneImport) => decider.mutateAsync({ id: l.id, statut: 'confirme' }),
    ignorer: (l: LigneImport) => decider.mutateAsync({ id: l.id, statut: 'ignore' }),
  }
}

export type { ImportDto }
