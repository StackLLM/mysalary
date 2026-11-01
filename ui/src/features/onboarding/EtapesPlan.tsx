import { decalerMois, lireCleMois } from '@mysalary/moteur'
import { formaterDate, formaterMontant, type ChargeDto, type LigneImport, type OnboardingDto, type SaisieCharge, type SaisieDette, type SaisieObjectif, type SaisiePonctuel, type SaisieSource } from '@mysalary/partage'
import { Check } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Champ, ChampMontant } from '../../components/Champ'
import { Panneau } from '../../components/Panneau'
import { Selection } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { FormulaireCharge, FormulairePonctuel, type ProposeCharge } from '../charges/FormulaireCharge'
import { useCategories, useCharges, useDettes, useEnregistrerCharge, useEnregistrerDette, useEnregistrerPonctuel, usePonctuels } from '../charges/requetes'
import { FormulaireDette } from '../dettes/FormulaireDette'
import { useEnregistrerObjectif, useObjectifs } from '../epargne/requetes'
import { moisSouhaitables } from '../objectifs/saisie'
import { FormulaireSource } from '../revenus/FormulaireSource'
import { useEnregistrerSource, useSources } from '../revenus/requetes'
import { FormulaireContrat } from '../salaire/FormulaireContrat'
import { PanneauPaie } from '../salaire/PanneauPaie'
import { useContrats, useCreerContrat, usePaies } from '../salaire/requetes'
import { lireMontant, resumeContrat, versSaisie } from '../salaire/saisie'
import { EtatLigne, useDecisionEtape } from './LigneImport'
import { aConfirmer, categorieParNom, phraseLigne, SUGGESTIONS_CHARGES, SUGGESTIONS_ENVELOPPES } from './saisie'

export interface ProprietesEtape {
  onboarding: OnboardingDto
  aujourdhui: string
  moisCourant: string
  aller: (etape: number) => void
}

function Titre({ titre, aide }: { titre: string; aide: ReactNode }) {
  return (
    <div>
      <h2 className="text-titre text-encre">{titre}</h2>
      <p className="mt-1 max-w-2xl text-texte-sm text-gris">{aide}</p>
    </div>
  )
}

/** Lignes importées pas encore confirmées : « importé · à confirmer ». Confirmer ouvre le formulaire de l'étape, prérempli. */
function BlocAConfirmer({ lignes, surConfirmer, libelleConfirmer = 'Confirmer' }: { lignes: LigneImport[]; surConfirmer: (l: LigneImport) => void; libelleConfirmer?: string }) {
  const { ignorer, attente } = useDecisionEtape()
  if (lignes.length === 0) return null
  return (
    <section aria-label="Importé, à confirmer" className="mt-5 rounded-bouton border border-info/30 bg-info-fond/50 p-4">
      <p className="text-texte-sm font-semibold text-info">Importé de ton ancien fichier · à confirmer</p>
      <p className="mt-0.5 text-texte-sm text-gris">Rien n’est dans ton plan tant que tu ne confirmes pas.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {lignes.map((l) => (
          <li key={l.id} className="rounded-champ bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-texte font-medium text-encre">{l.libelle}</span>
                <span className="chiffres block text-texte-sm italic text-gris">{phraseLigne(l)}</span>
              </span>
              <EtatLigne ligne={l} />
            </div>
            {l.note && <p className="mt-1.5 text-mention text-gris">{l.note}</p>}
            <div className="mt-2.5 flex gap-2">
              <Bouton variante="puce" taille="sm" onClick={() => surConfirmer(l)} aria-label={`${libelleConfirmer} ${l.libelle}`}>
                {libelleConfirmer}
              </Bouton>
              <Bouton variante="contour" taille="sm" disabled={attente} onClick={() => void ignorer(l)} aria-label={`Ignorer ${l.libelle}`}>
                Ignorer
              </Bouton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Ce qui est déjà dans le plan : le retour arrière ne perd rien. */
function DejaDansLePlan({ titre, elements, vide }: { titre: string; elements: { id: string; libelle: string; detail: string }[]; vide: string }) {
  return (
    <section aria-label={titre} className="mt-5">
      <h3 className="text-texte font-semibold text-encre">{titre}</h3>
      {elements.length === 0 ? (
        <p className="mt-2 rounded-champ bg-interne p-3 text-texte-sm text-gris">{vide}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {elements.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 rounded-champ border border-filet bg-white px-3 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-positif" aria-hidden />
                <span className="truncate text-texte font-medium text-encre">{e.libelle}</span>
              </span>
              <span className="chiffres shrink-0 text-texte-sm text-gris">{e.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const dh = (c: number) => formaterMontant(c)

// --- 3. Salaire ---

export function EtapeSalaire({ onboarding, aujourdhui, moisCourant, aller }: ProprietesEtape) {
  const contrats = useContrats()
  const creer = useCreerContrat()
  const { confirmer } = useDecisionEtape()
  const paies = usePaies(decalerMois(lireCleMois(moisCourant), -1), decalerMois(lireCleMois(moisCourant), 1))
  const [paieOuverte, setPaieOuverte] = useState(false)
  const ligne = aConfirmer(onboarding.import?.lignes, 3)[0]
  const contrat = contrats.data?.at(-1)
  const donnees = ligne?.donnees.type === 'salaire' ? ligne.donnees : null
  const proposition = donnees
    ? { ...(donnees.choix ? { montantNet: donnees.choix } : {}), ...(donnees.jour ? { jourHabituel: donnees.jour } : {}), ...(donnees.financeMoisSuivant !== null ? { financeMoisSuivant: donnees.financeMoisSuivant } : {}) }
    : undefined
  const paie = paies.data?.paies.filter((p) => p.statut !== 'recue' && p.datePrevue <= aujourdhui).at(-1) ?? null
  const recue = paies.data?.paies.filter((p) => p.statut === 'recue').at(-1)

  return (
    <div>
      <Titre titre="Ton salaire" aide="Le salaire net habituel, son jour de versement, et si cette paie sert à vivre le mois suivant. Il définit ton premier mois budgétaire." />
      {contrats.isPending ? (
        <div className="mt-5 h-40 animate-pulse rounded-bouton bg-interne" />
      ) : contrat ? (
        <div className="mt-5">
          <div className="rounded-bouton bg-interne p-4 shadow-bouton">
            <p className="text-texte-sm text-gris">Salaire net habituel</p>
            <p className="chiffres text-montant text-encre">{dh(contrat.montantNet)}</p>
            <p className="mt-1 text-texte-sm text-gris">{resumeContrat(contrat)}</p>
          </div>
          <section aria-label="Dernière paie reçue" className="mt-5">
            <h3 className="text-texte font-semibold text-encre">Ta dernière paie reçue</h3>
            {paie ? (
              <div className="mt-2 rounded-bouton border border-filet bg-white p-4">
                <p className="text-texte text-encre">
                  Une paie était prévue le <span className="font-semibold">{formaterDate(paie.datePrevue)}</span>. L’as-tu reçue ?
                </p>
                <Bouton className="mt-3" variante="puce" taille="sm" onClick={() => setPaieOuverte(true)}>
                  Noter ma dernière paie reçue
                </Bouton>
              </div>
            ) : recue ? (
              <p className="mt-2 flex items-center gap-2 rounded-champ bg-positif-fond p-3 text-texte-sm text-positif">
                <Check className="h-4 w-4" aria-hidden /> Paie reçue le {formaterDate(recue.dateReelle ?? recue.datePrevue)} : {dh(recue.totalRecu ?? 0)}.
              </p>
            ) : (
              <p className="mt-2 rounded-champ bg-interne p-3 text-texte-sm text-gris">Aucune paie à confirmer pour l’instant. Tu pourras le faire dès qu’une paie est reçue.</p>
            )}
          </section>
          <PanneauPaie paie={paieOuverte ? paie : null} aujourdhui={aujourdhui} modeInitial="reception" onFermer={() => setPaieOuverte(false)} />
        </div>
      ) : (
        <div className="mt-5">
          {ligne && (
            <p className="mb-4 rounded-champ bg-info-fond/60 p-3 text-texte-sm text-info">
              <span className="font-semibold">Importé · à confirmer.</span> Vérifie les valeurs, complète le mois d’effet, puis enregistre.
            </p>
          )}
          <FormulaireContrat
            initial={proposition}
            aujourdhui={aujourdhui}
            libelleBouton={ligne ? 'Confirmer mon salaire' : 'Enregistrer mon salaire'}
            chargement={creer.isPending}
            onEnregistrer={async (saisie) => {
              await creer.mutateAsync(saisie)
              if (ligne) await confirmer(ligne)
              toast('Salaire enregistré.')
            }}
          />
          <Bouton variante="contour" taille="sm" className="mt-5" onClick={() => aller(4)}>
            Mes revenus varient, je n’ai pas de salaire fixe
          </Bouton>
        </div>
      )}
    </div>
  )
}

// --- 4. Primes ---

type SourceOuverte = { ligne?: LigneImport } | null

export function EtapePrimes({ onboarding, aujourdhui }: ProprietesEtape) {
  const contrats = useContrats()
  const sources = useSources()
  const enregistrer = useEnregistrerSource()
  const { confirmer } = useDecisionEtape()
  const [ouverte, setOuverte] = useState<SourceOuverte>(null)
  const lignes = aConfirmer(onboarding.import?.lignes, 4)
  const finance = contrats.data?.at(-1)?.financeMoisSuivant ?? null
  const d = ouverte?.ligne?.donnees.type === 'prime' ? ouverte.ligne.donnees : null

  return (
    <div>
      <Titre titre="Tes primes" aide="Primes sur la paie ou à part, une fois ou à répétition, avec ta certitude. « Je ne sais pas encore » est une réponse : passe à l’étape suivante." />
      <BlocAConfirmer lignes={lignes} surConfirmer={(ligne) => setOuverte({ ligne })} />
      <DejaDansLePlan
        titre="Déjà dans ton plan"
        vide="Aucune prime ni revenu variable pour l’instant."
        elements={(sources.data ?? []).map((s) => ({ id: s.id, libelle: s.libelle, detail: dh(s.montant) }))}
      />
      <Bouton className="mt-5" variante="teinte" taille="md" onClick={() => setOuverte({})}>
        Ajouter une prime ou un revenu variable
      </Bouton>
      <Panneau ouvert={ouverte !== null} onFermer={() => setOuverte(null)} titre="Prime ou revenu variable" description="Un montant, une fréquence, ta certitude.">
        {ouverte && (
          <FormulaireSource
            key={ouverte.ligne?.id ?? 'nouvelle'}
            aujourdhui={aujourdhui}
            financeMoisSuivant={finance}
            prefill={d ? { libelle: ouverte.ligne!.libelle, type: 'prime', montant: d.montant, frequence: 'unique', debut: d.mois } : undefined}
            chargement={enregistrer.isPending}
            onEnregistrer={async (saisie: SaisieSource) => {
              await enregistrer.mutateAsync(saisie)
              if (ouverte.ligne) await confirmer(ouverte.ligne)
              toast(`« ${saisie.libelle} » ajoutée.`)
              setOuverte(null)
            }}
          />
        )}
      </Panneau>
    </div>
  )
}

// --- 5 et 6. Charges fixes et enveloppes ---

type ChargeOuverte = { ligne?: LigneImport; libelle?: string; categorie?: string; montant?: number } | null

function EtapeCharges({ nature, etape, onboarding, aujourdhui, moisCourant }: ProprietesEtape & { nature: 'fixe' | 'enveloppe'; etape: 5 | 6 }) {
  const charges = useCharges()
  const categories = useCategories()
  const enregistrer = useEnregistrerCharge()
  const { confirmer } = useDecisionEtape()
  const [ouverte, setOuverte] = useState<ChargeOuverte>(null)
  const fixe = nature === 'fixe'
  const lignes = aConfirmer(onboarding.import?.lignes, etape)
  const suggestions = fixe ? SUGGESTIONS_CHARGES : SUGGESTIONS_ENVELOPPES
  const deja = (charges.data ?? []).filter((c: ChargeDto) => c.nature === nature)

  /** La catégorie est retrouvée par son nom au moment d'afficher : le formulaire se prépare une fois les catégories chargées. */
  const prefillDe = (o: NonNullable<ChargeOuverte>): ProposeCharge | undefined =>
    o.libelle ? { libelle: o.libelle, categorieId: o.categorie ? categorieParNom(categories.data, o.categorie) : undefined, ...(o.montant ? { montant: o.montant } : {}) } : undefined
  const confirmerLigne = (l: LigneImport) => {
    const d = l.donnees
    if (d.type !== 'charge' && d.type !== 'enveloppe') return
    setOuverte({ ligne: l, libelle: l.libelle, categorie: d.categorie, montant: d.montant })
  }

  return (
    <div>
      {fixe ? (
        <Titre titre="Tes charges fixes" aide="Ce qui tombe à date fixe : téléphone, internet, abonnements, assurance, aide familiale, sport. Choisis une suggestion ou ajoute la tienne ; le montant et le jour sont toujours à toi." />
      ) : (
        <Titre titre="Tes enveloppes" aide="Un budget par mois pour ce qui varie : nourriture, transport, loisirs. Tu choisiras ensuite de le consommer librement, par semaine ou par jour. Base du suivi hebdomadaire." />
      )}
      <BlocAConfirmer lignes={lignes} surConfirmer={confirmerLigne} />
      <section aria-label="Suggestions" className="mt-5">
        <p className="text-texte-sm text-gris">Suggestions (sans montant, à compléter) :</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s.libelle} type="button" onClick={() => setOuverte({ libelle: s.libelle, categorie: s.categorie })} className="h-9 rounded-pilule bg-white px-4 text-texte-sm font-medium text-encre shadow-bouton hover:bg-teinte">
              {s.libelle}
            </button>
          ))}
        </div>
        {fixe && <p className="mt-2 text-mention text-gris">Un crédit est une dette, pas une charge sans fin : il se note à l’étape 7.</p>}
      </section>
      <DejaDansLePlan
        titre="Déjà dans ton plan"
        vide={fixe ? 'Aucune charge fixe pour l’instant.' : 'Aucune enveloppe pour l’instant.'}
        elements={deja.map((c) => ({ id: c.id, libelle: c.libelle, detail: `${dh(c.montant)}${fixe && c.jour ? ` · le ${c.jour}` : ' par mois'}` }))}
      />
      <Bouton className="mt-5" variante="teinte" taille="md" onClick={() => setOuverte({})}>
        {fixe ? 'Ajouter une charge fixe' : 'Ajouter une enveloppe'}
      </Bouton>
      <Panneau ouvert={ouverte !== null} onFermer={() => setOuverte(null)} titre={fixe ? 'Charge fixe' : 'Enveloppe'} description="Décris-la une fois : MySalary la prévoit dans chaque mois concerné.">
        {ouverte && (
          <FormulaireCharge
            key={`${ouverte.ligne?.id ?? ouverte.libelle ?? 'nouvelle'}-${categories.isSuccess}`}
            nature={nature}
            prefill={prefillDe(ouverte)}
            aujourdhui={aujourdhui}
            moisCourant={moisCourant}
            chargement={enregistrer.isPending}
            onEnregistrer={async (saisie: SaisieCharge) => {
              await enregistrer.mutateAsync(saisie)
              if (ouverte.ligne) await confirmer(ouverte.ligne)
              toast(`« ${saisie.libelle} » ajoutée à ton plan.`)
              setOuverte(null)
            }}
          />
        )}
      </Panneau>
    </div>
  )
}

export const EtapeChargesFixes = (p: ProprietesEtape) => <EtapeCharges {...p} nature="fixe" etape={5} />
export const EtapeEnveloppes = (p: ProprietesEtape) => <EtapeCharges {...p} nature="enveloppe" etape={6} />

// --- 7. Dettes et ponctuels ---

type Ouvert7 = { type: 'dette' | 'aide' | 'ponctuel'; ligne?: LigneImport; libelle?: string; montant?: number; mois?: string } | null

export function EtapeDettes({ onboarding, aujourdhui, moisCourant }: ProprietesEtape) {
  const dettes = useDettes()
  const ponctuels = usePonctuels()
  const categories = useCategories()
  const enregistrerDette = useEnregistrerDette()
  const enregistrerCharge = useEnregistrerCharge()
  const enregistrerPonctuel = useEnregistrerPonctuel()
  const { confirmer } = useDecisionEtape()
  const [ouvert, setOuvert] = useState<Ouvert7>(null)
  const lignes = aConfirmer(onboarding.import?.lignes, 7)

  function confirmerLigne(l: LigneImport) {
    const d = l.donnees
    if (d.type === 'ponctuel') setOuvert({ type: 'ponctuel', ligne: l, libelle: l.libelle, montant: d.montant, mois: d.mois })
    else if (d.type === 'aClasser') setOuvert({ type: d.destination === 'aide' ? 'aide' : 'dette', ligne: l, libelle: d.destination === 'aide' ? `Aide : ${d.nom}` : d.nom })
  }
  const fin = async (message: string) => {
    if (ouvert?.ligne) await confirmer(ouvert.ligne)
    toast(message)
    setOuvert(null)
  }

  return (
    <div>
      <Titre titre="Dettes et ponctuels" aide="Une dette est un total à rembourser avec un échéancier, pas une charge permanente. Un ponctuel est une dépense connue, avec sa date : assurance annuelle, permis, réparation." />
      <BlocAConfirmer lignes={lignes} surConfirmer={confirmerLigne} />
      <DejaDansLePlan
        titre="Dettes"
        vide="Aucune dette pour l’instant."
        elements={(dettes.data ?? []).map((x) => ({ id: x.id, libelle: x.libelle, detail: `${dh(x.montantTotal)} · ${dh(x.mensualite)} par mois` }))}
      />
      <DejaDansLePlan
        titre="Ponctuels prévus"
        vide="Aucun ponctuel prévu pour l’instant."
        elements={(ponctuels.data ?? []).map((x) => ({ id: x.id, libelle: x.libelle, detail: `${dh(x.montant)} · ${formaterDate(x.date, 'court')}` }))}
      />
      <div className="mt-5 flex flex-wrap gap-3">
        <Bouton variante="teinte" taille="md" onClick={() => setOuvert({ type: 'dette' })}>
          Ajouter une dette
        </Bouton>
        <Bouton variante="teinte" taille="md" onClick={() => setOuvert({ type: 'ponctuel' })}>
          Ajouter un ponctuel
        </Bouton>
      </div>
      <Panneau
        ouvert={ouvert !== null}
        onFermer={() => setOuvert(null)}
        titre={ouvert?.type === 'dette' ? 'Dette' : ouvert?.type === 'aide' ? 'Aide récurrente' : 'Ponctuel'}
        description={ouvert?.type === 'dette' ? 'Un total et un échéancier : la dette se termine.' : ouvert?.type === 'aide' ? 'Une charge fixe, chaque mois.' : 'Une dépense unique et datée.'}
      >
        {ouvert?.type === 'dette' && (
          <FormulaireDette
            key={ouvert.ligne?.id ?? 'dette'}
            aujourdhui={aujourdhui}
            prefill={ouvert.libelle ? { libelle: ouvert.libelle, creancier: ouvert.ligne?.libelle } : undefined}
            chargement={enregistrerDette.isPending}
            onEnregistrer={async (saisie: SaisieDette) => {
              await enregistrerDette.mutateAsync(saisie)
              await fin(`Dette « ${saisie.libelle} » ajoutée.`)
            }}
          />
        )}
        {ouvert?.type === 'aide' && (
          <FormulaireCharge
            key={`${ouvert.ligne?.id ?? 'aide'}-${categories.isSuccess}`}
            nature="fixe"
            prefill={{ libelle: ouvert.libelle, categorieId: categorieParNom(categories.data, 'Famille') }}
            aujourdhui={aujourdhui}
            moisCourant={moisCourant}
            chargement={enregistrerCharge.isPending}
            onEnregistrer={async (saisie: SaisieCharge) => {
              await enregistrerCharge.mutateAsync(saisie)
              await fin(`« ${saisie.libelle} » ajoutée à ton plan.`)
            }}
          />
        )}
        {ouvert?.type === 'ponctuel' && (
          <FormulairePonctuel
            key={`${ouvert.ligne?.id ?? 'ponctuel'}-${categories.isSuccess}`}
            aujourdhui={aujourdhui}
            dateInitiale={ouvert.mois ? `${ouvert.mois}-01` : undefined}
            prefill={ouvert.libelle ? { libelle: ouvert.libelle, montant: ouvert.montant, categorieId: categorieParNom(categories.data, ouvert.ligne?.donnees.type === 'ponctuel' ? ouvert.ligne.donnees.categorie : 'Autre') } : undefined}
            chargement={enregistrerPonctuel.isPending}
            onEnregistrer={async (saisie: SaisiePonctuel) => {
              await enregistrerPonctuel.mutateAsync(saisie)
              await fin(`« ${saisie.libelle} » prévu le ${formaterDate(saisie.date)}.`)
            }}
          />
        )}
      </Panneau>
    </div>
  )
}

// --- 8. Épargne ---

export function EtapeEpargne({ onboarding }: ProprietesEtape) {
  const { confirmer, ignorer, attente } = useDecisionEtape()
  const lignes = aConfirmer(onboarding.import?.lignes, 8)

  return (
    <div>
      <Titre titre="Ton épargne" aide="Rien à déclarer ici : ton épargne se note objectif par objectif. Ce que tu as déjà de côté se règle à l’étape suivante, avec ton premier objectif." />
      {lignes.length > 0 && (
        <section aria-label="Importé, à confirmer" className="mt-5 rounded-bouton border border-info/30 bg-info-fond/50 p-4">
          <p className="text-texte-sm font-semibold text-info">Importé de ton ancien fichier · à confirmer</p>
          <ul className="mt-3 flex flex-col gap-2">
            {lignes.map((l) => (
              <li key={l.id} className="rounded-champ bg-white p-3">
                <p className="text-texte font-medium text-encre">
                  Tu mettais <span className="chiffres italic">{phraseLigne(l)}</span> de côté.
                </p>
                <p className="mt-1 text-mention text-gris">Ce n’est pas une charge : cette somme sera proposée comme versement mensuel de ton premier objectif.</p>
                <div className="mt-2.5 flex gap-2">
                  <Bouton variante="puce" taille="sm" disabled={attente} onClick={() => void confirmer(l)} aria-label={`Garder la proposition ${l.libelle}`}>
                    Garder la proposition
                  </Bouton>
                  <Bouton variante="contour" taille="sm" disabled={attente} onClick={() => void ignorer(l)} aria-label={`Ignorer ${l.libelle}`}>
                    Ignorer
                  </Bouton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// --- 9. Premier objectif ---

export function EtapeObjectif({ onboarding, moisCourant }: ProprietesEtape) {
  const objectifs = useObjectifs()
  const enregistrer = useEnregistrerObjectif()
  const { confirmer } = useDecisionEtape()
  const lignes = aConfirmer(onboarding.import?.lignes, 9)
  const versement = (onboarding.import?.lignes ?? []).find((l) => l.donnees.type === 'epargne' && l.statut === 'confirme')
  const [proposition, setProposition] = useState<LigneImport | null>(null)
  const d = proposition?.donnees.type === 'objectif' ? proposition.donnees : null
  const versementPropose = versement?.donnees.type === 'epargne' ? versement.donnees.montant : null

  const [libelle, setLibelle] = useState('')
  const [cible, setCible] = useState('')
  const [dejaDeCote, setDejaDeCote] = useState('')
  const [date, setDate] = useState('')
  const [versementSaisi, setVersementSaisi] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  function remplir(l: LigneImport | null) {
    setProposition(l)
    const o = l?.donnees.type === 'objectif' ? l.donnees : null
    setLibelle(o?.libelle ?? '')
    setCible(o ? versSaisie(o.montantCible) : '')
    setDejaDeCote(o && o.montantInitial > 0 ? versSaisie(o.montantInitial) : '')
    setDate(o?.dateCible ?? '')
    setVersementSaisi(o?.versementMensuel ? versSaisie(o.versementMensuel) : '')
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    const lu = { cible: lireMontant(cible), initial: dejaDeCote.trim() ? lireMontant(dejaDeCote, 0) : { valeur: 0 }, versement: versementSaisi.trim() ? lireMontant(versementSaisi) : null }
    const p: Record<string, string> = {}
    if (!libelle.trim()) p.libelle = 'Donne un nom à ton objectif.'
    if ('erreur' in lu.cible) p.montantCible = lu.cible.erreur
    if ('erreur' in lu.initial) p.montantInitial = lu.initial.erreur
    else if ('valeur' in lu.cible && lu.initial.valeur > lu.cible.valeur) p.montantInitial = 'Déjà plus que la cible.'
    if (lu.versement && 'erreur' in lu.versement) p.versementMensuel = lu.versement.erreur
    setErreurs(p)
    if (Object.keys(p).length > 0 || !('valeur' in lu.cible) || !('valeur' in lu.initial)) return
    const saisie: SaisieObjectif = {
      libelle: libelle.trim(),
      type: d ? (d.typeObjectif as SaisieObjectif['type']) : 'autre',
      montantCible: lu.cible.valeur,
      montantInitial: lu.initial.valeur,
      dateCible: date || null,
      versementMensuel: lu.versement && 'valeur' in lu.versement ? lu.versement.valeur : null,
    }
    try {
      await enregistrer.mutateAsync(saisie)
      if (proposition) await confirmer(proposition)
      toast(`Objectif « ${saisie.libelle} » créé.`)
      remplir(null)
    } catch (err) {
      setErreurs(err instanceof ErreurApi ? { ...(err.champs ?? {}), _: err.message } : { _: 'Erreur inattendue. Réessaie.' })
    }
  }

  const sansObjectif = (objectifs.data?.objectifs ?? []).length === 0

  return (
    <div>
      <Titre titre="Ton premier objectif" aide="Un nom, une cible, une date souhaitée (facultative). Le montant déjà mis de côté pour lui est ton point de départ réel." />
      <BlocAConfirmer lignes={lignes} libelleConfirmer="Confirmer" surConfirmer={remplir} />
      <DejaDansLePlan
        titre="Tes objectifs"
        vide="Aucun objectif pour l’instant. Ce n’est pas obligatoire : tu peux en créer un plus tard."
        elements={(objectifs.data?.objectifs ?? []).map((o) => ({ id: o.id, libelle: o.libelle, detail: dh(o.montantCible) }))}
      />
      <form onSubmit={creer} noValidate className="mt-5 flex flex-col gap-4 rounded-bouton border border-filet bg-white p-4" aria-label={proposition ? `Confirmer ${proposition.libelle}` : 'Nouvel objectif'}>
        <h3 className="text-texte font-semibold text-encre">{proposition ? `Confirmer « ${proposition.libelle} »` : sansObjectif ? 'Créer mon premier objectif' : 'Ajouter un objectif'}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Nom de l’objectif" placeholder="Une moto, un voyage…" value={libelle} onChange={(e) => setLibelle(e.target.value)} erreur={erreurs.libelle} />
          <ChampMontant libelle="Montant à atteindre" placeholder="30 000" value={cible} onChange={(e) => setCible(e.target.value)} erreur={erreurs.montantCible} />
          <ChampMontant libelle="Déjà mis de côté pour lui" placeholder="0" value={dejaDeCote} onChange={(e) => setDejaDeCote(e.target.value)} erreur={erreurs.montantInitial} aide="Facultatif." />
          <Selection libelle="Date souhaitée" value={date} onChange={(e) => setDate(e.target.value)}>
            <option value="">Sans date</option>
            {moisSouhaitables(moisCourant).map((m) => (
              <option key={m} value={m}>
                {formaterDate(`${m}-01`, 'moyen').replace(/^1 /, '')}
              </option>
            ))}
          </Selection>
          <ChampMontant
            libelle="Versement mensuel"
            placeholder="1 000"
            value={versementSaisi}
            onChange={(e) => setVersementSaisi(e.target.value)}
            erreur={erreurs.versementMensuel}
            aide={versementPropose && !versementSaisi ? `Proposé d’après ton ancien fichier : ${dh(versementPropose)} (à confirmer). Facultatif.` : 'Facultatif.'}
          />
        </div>
        {versementPropose && !versementSaisi && (
          <Bouton type="button" variante="contour" taille="sm" className="self-start" onClick={() => setVersementSaisi(versSaisie(versementPropose))}>
            Utiliser {dh(versementPropose)} par mois
          </Bouton>
        )}
        {erreurs._ && (
          <p role="alert" className="text-texte-sm font-medium text-alerte">
            {erreurs._}
          </p>
        )}
        <div className="flex gap-2">
          <Bouton type="submit" variante="teinte" taille="md" chargement={enregistrer.isPending}>
            {proposition ? 'Confirmer cet objectif' : 'Créer cet objectif'}
          </Bouton>
          {proposition && (
            <Bouton type="button" variante="contour" taille="md" onClick={() => remplir(null)}>
              Annuler
            </Bouton>
          )}
        </div>
      </form>
    </div>
  )
}

