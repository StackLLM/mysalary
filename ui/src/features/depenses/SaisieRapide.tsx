import { formaterMontant, type DepenseDto, type SaisieDepense } from '@mysalary/partage'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { Panneau } from '../../components/Panneau'
import { Pilule } from '../../components/Pilule'
import { Choix, Selection } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { dateDuJour } from '../../lib/dates'
import { ChampCategorie } from '../charges/ChampCategorie'
import { FormulaireVersement } from '../epargne/FormulaireVersement'
import { IconeCategorie } from '../charges/IconeCategorie'
import { useCategories } from '../charges/requetes'
import { useUtilisateurCourant } from '../profils/requetes'
import { lireMontant, versSaisie } from '../salaire/saisie'
import { useEnregistrerDepense, useRattachements, useSupprimerDepense } from './requetes'
import { ContexteSaisieRapide, useSaisieRapide } from './contexteSaisieRapide'
import { categoriesFrequentes, cleDe, HORS_PLAN, lienPropose, optionsLien, versLien, type CleLien, type OptionLien } from './saisie'

export { useSaisieRapide }

/** Vrai quand la frappe vise un champ ou une fenêtre : la touche N ne doit pas ouvrir la saisie. */
export function frappeOccupee(e: KeyboardEvent): boolean {
  const cible = e.target instanceof Element ? e.target : null
  return Boolean(cible?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]'))
}

type Mode = 'depense' | 'epargne'

/**
 * Saisie rapide (UX.md § 4.3), accessible partout : bouton +, touche N. Une dépense, ou un versement d'épargne
 * (jamais une dépense, R11). Elle n'existe que lorsqu'un compte est ouvert.
 */
export function FournisseurSaisieRapide({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<{ mode: Mode; depense?: DepenseDto; date?: string; objectifId?: string; cle: number } | null>(null)
  // Toujours appelé (règle des hooks) : `useUtilisateurCourant` ne rend un compte que si un id est choisi.
  const actif = Boolean(useUtilisateurCourant())
  const surProfils = useLocation().pathname === '/profils'
  const ouvrir = useCallback((depense?: DepenseDto, options?: { date?: string }) => setEtat({ mode: 'depense', depense, date: options?.date, cle: Date.now() }), [])
  const ouvrirVersement = useCallback((options?: { objectifId?: string }) => setEtat({ mode: 'epargne', objectifId: options?.objectifId, cle: Date.now() }), [])

  const naviguer = useNavigate()
  useEffect(() => {
    if (!actif || surProfils) return
    const surTouche = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || frappeOccupee(e)) return
      const touche = e.key.toLowerCase()
      // N : nouvelle saisie ; S : simulateur (Plan.md, lot 11).
      if (touche === 'n') {
        e.preventDefault()
        ouvrir()
      } else if (touche === 's') {
        e.preventDefault()
        naviguer('/simulateur')
      }
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [actif, surProfils, ouvrir, naviguer])

  const valeur = useMemo(
    () => ({
      ouvrir: (d?: DepenseDto, options?: { date?: string }) => (actif ? ouvrir(d, options) : toast('Ouvre d’abord ton compte.')),
      ouvrirVersement: (options?: { objectifId?: string }) => (actif ? ouvrirVersement(options) : toast('Ouvre d’abord ton compte.')),
    }),
    [actif, ouvrir, ouvrirVersement],
  )

  return (
    <ContexteSaisieRapide.Provider value={valeur}>
      {children}
      {actif && (
        <Panneau
          ouvert={etat !== null}
          onFermer={() => setEtat(null)}
          titre={etat?.depense ? 'Modifier la dépense' : etat?.mode === 'epargne' ? 'Mettre de côté' : 'Nouvelle dépense'}
          description={etat?.depense ? undefined : etat?.mode === 'epargne' ? 'Un versement réel vers ton épargne. Entrée pour valider.' : 'Ce qui est sorti vraiment. Entrée pour valider.'}
        >
          {etat && !etat.depense && (
            <div className="mb-6">
              <Choix
                libelle="Je note"
                valeur={etat.mode}
                onChange={(mode) => setEtat({ ...etat, mode, cle: Date.now() })}
                options={[
                  { valeur: 'depense', libelle: 'Une dépense' },
                  { valeur: 'epargne', libelle: 'De l’épargne' },
                ]}
              />
            </div>
          )}
          {etat?.mode === 'epargne' ? (
            <FormulaireVersement key={etat.cle} objectifId={etat.objectifId} onTermine={() => setEtat(null)} />
          ) : (
            etat && <FormulaireDepense key={etat.cle} initiale={etat.depense} dateProposee={etat.date} onTermine={() => setEtat(null)} onAutre={() => ouvrir()} />
          )}
        </Panneau>
      )}
    </ContexteSaisieRapide.Provider>
  )
}

function FormulaireDepense({ initiale, dateProposee, onTermine, onAutre }: { initiale?: DepenseDto; dateProposee?: string; onTermine: () => void; onAutre: () => void }) {
  const aujourdhui = dateDuJour()
  const categories = useCategories()
  const enregistrer = useEnregistrerDepense()
  const supprimer = useSupprimerDepense()
  const [montant, setMontant] = useState(initiale ? versSaisie(initiale.montant) : '')
  const [categorieId, setCategorieId] = useState(initiale?.categorieId ?? '')
  const [autre, setAutre] = useState(false)
  const [date, setDate] = useState<string>(initiale?.date ?? (dateProposee && dateProposee < aujourdhui ? dateProposee : aujourdhui))
  const [libelle, setLibelle] = useState(initiale?.libelle ?? '')
  const [note, setNote] = useState(initiale?.note ?? '')
  const [lien, setLien] = useState<CleLien>(initiale ? cleDe(initiale) : HORS_PLAN)
  const [lienTouche, setLienTouche] = useState(Boolean(initiale))
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const enchainer = useRef(false)

  const dateValide = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= aujourdhui
  const rattachements = useRattachements(dateValide ? date : null)
  const options = useMemo<OptionLien[]>(() => {
    const liste = rattachements.data ? optionsLien(rattachements.data) : []
    // En modification, le lien actuel reste proposé même si la ligne est maintenant payée.
    if (initiale && initiale.imputation !== 'horsPlan' && !liste.some((o) => o.cle === cleDe(initiale))) {
      liste.unshift({ cle: cleDe(initiale), libelle: initiale.ligne ?? 'Ligne actuelle', detail: 'Lien actuel', categorieId: initiale.categorieId, reste: null })
    }
    return liste
  }, [rattachements.data, initiale])

  // Proposition automatique tant que l'utilisateur n'a pas choisi lui-même.
  useEffect(() => {
    if (!lienTouche && categorieId) setLien(lienPropose(options, categorieId))
  }, [options, categorieId, lienTouche])

  const choisi = options.find((o) => o.cle === lien)
  const frequentes = categoriesFrequentes(categories.data ?? [])
  const horsPuces = Boolean(categorieId) && !frequentes.some((c) => c.id === categorieId)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = lireMontant(montant)
    const p: Record<string, string> = {}
    if ('erreur' in lu) p.montant = lu.erreur
    if (!categorieId) p.categorieId = 'Choisis une catégorie.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) p.date = 'Choisis une date.'
    else if (date > aujourdhui) p.date = 'Une dépense réelle ne peut pas être dans le futur.'
    setErreurs(p)
    if (Object.keys(p).length > 0 || 'erreur' in lu) return
    const saisie: SaisieDepense = { date, montant: lu.valeur, categorieId, libelle: libelle.trim(), ...(note.trim() ? { note: note.trim() } : {}), ...versLien(lien) }
    try {
      const { id } = await enregistrer.mutateAsync({ ...saisie, id: initiale?.id })
      const quoi = `${formaterMontant(lu.valeur)}${choisi ? ` · ${choisi.libelle}` : ''}`
      if (initiale) toast(`Dépense modifiée : ${quoi}.`)
      else toast(`Dépense notée : ${quoi}.`, { action: { label: 'Annuler', onClick: () => supprimer.mutate(id) } })
      if (enchainer.current && !initiale) onAutre()
      else onTermine()
    } catch (erreur) {
      setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' })
    } finally {
      enchainer.current = false
    }
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <ChampMontant libelle="Montant" autoFocus placeholder="0" value={montant} onChange={(e) => setMontant(e.target.value)} erreur={erreurs.montant} className="[&_input]:text-titre" />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-texte-sm text-gris">Catégorie</legend>
        <div className="flex flex-wrap gap-2">
          {frequentes.map((c) => (
            <Pilule
              key={c.id}
              active={categorieId === c.id}
              onClick={() => {
                setCategorieId(c.id)
                setAutre(false)
              }}
            >
              <IconeCategorie icone={c.icone} className="-ml-1.5 h-6 w-6" />
              {c.libelle}
            </Pilule>
          ))}
          <Pilule active={autre || horsPuces} onClick={() => setAutre(true)}>
            Autre…
          </Pilule>
        </div>
        {(autre || horsPuces) && <ChampCategorie valeur={categorieId} onChange={setCategorieId} />}
        {erreurs.categorieId && <span className="text-mention text-alerte">{erreurs.categorieId}</span>}
      </fieldset>

      <Selection
        libelle="Rattacher au plan"
        value={lien}
        onChange={(e) => {
          setLien(e.target.value)
          setLienTouche(true)
          // Montant pas encore saisi : on propose ce qui reste à payer sur la ligne choisie.
          const reste = options.find((o) => o.cle === e.target.value)?.reste
          if (!montant.trim() && reste) setMontant(versSaisie(reste))
        }}
        erreur={erreurs.chargeId ?? erreurs.echeance ?? erreurs.ponctuelId}
        aide={
          choisi
            ? lienTouche
              ? choisi.detail
              : `Est-ce le paiement de « ${choisi.libelle} » ? ${choisi.detail}.`
            : 'Ni charge, ni enveloppe : comptée « hors plan ».'
        }
      >
        <option value={HORS_PLAN}>Hors plan</option>
        {options.some((o) => !o.cle.startsWith('enveloppe:')) && (
          <optgroup label="À payer">
            {options
              .filter((o) => !o.cle.startsWith('enveloppe:'))
              .map((o) => (
                <option key={o.cle} value={o.cle}>
                  {o.libelle} · {o.detail}
                </option>
              ))}
          </optgroup>
        )}
        {options.some((o) => o.cle.startsWith('enveloppe:')) && (
          <optgroup label="Enveloppes">
            {options
              .filter((o) => o.cle.startsWith('enveloppe:'))
              .map((o) => (
                <option key={o.cle} value={o.cle}>
                  {o.libelle}
                </option>
              ))}
          </optgroup>
        )}
      </Selection>

      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="Date" type="date" max={aujourdhui} value={date} onChange={(e) => setDate(e.target.value)} erreur={erreurs.date} />
        <Champ libelle="Libellé (facultatif)" placeholder="Marché, pharmacie…" value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={60} erreur={erreurs.libelle} />
      </div>
      <Champ libelle="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />

      {erreurs._ && (
        <p role="alert" className="text-texte-sm font-medium text-alerte">
          {erreurs._}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Bouton type="submit" taille="md" chargement={enregistrer.isPending}>
          {initiale ? 'Enregistrer les changements' : 'Noter la dépense'}
        </Bouton>
        {!initiale && (
          <Bouton type="submit" variante="contour" taille="md" disabled={enregistrer.isPending} onClick={() => (enchainer.current = true)}>
            Noter et en ajouter une autre
          </Bouton>
        )}
      </div>
    </form>
  )
}

