import { formaterDate, formaterMois, type CategorieDto, type ChargeDto, type PonctuelDto, type ResumeChargesDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Cellule } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { BlocTotaux, Identite } from '../../components/Elements'
import { IconePlusRond } from '../../components/icones'
import { Menu } from '../../components/Menu'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { CERTITUDES_INFO } from '../revenus/saisie'
import { FormulaireCharge, FormulairePonctuel } from './FormulaireCharge'
import { IconeCategorie } from './IconeCategorie'
import {
  useCategories,
  useCharges,
  useEnregistrerCharge,
  useEnregistrerPonctuel,
  usePonctuels,
  useResumeCharges,
  useSupprimerCharge,
  useSupprimerPonctuel,
} from './requetes'
import { dateOuMois, GROUPES, libelleQuandCharge, ORIGINES, part, RYTHMES } from './saisie'

const COLONNES = 'grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.55fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-2.5'

type Edition =
  | { type: 'fixe' | 'enveloppe'; charge?: ChargeDto }
  | { type: 'ponctuel'; ponctuel?: PonctuelDto }
  | null
type Suppression = { type: 'charge'; id: string; libelle: string } | { type: 'ponctuel'; id: string; libelle: string } | null

/** Mon plan › Charges & enveloppes (ux-ui.md (UX) § 5.11). */
export function OngletCharges() {
  const resume = useResumeCharges()
  const charges = useCharges()
  const ponctuels = usePonctuels()
  const categories = useCategories()
  const requetes = [resume, charges, ponctuels, categories]

  if (requetes.some((q) => q.isPending)) {
    return (
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12" aria-label="Chargement des charges">
        <div className="flex flex-col gap-4 rounded-carte bg-white p-[30px] shadow-carte">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-bouton bg-teinte" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
      </div>
    )
  }
  if (requetes.some((q) => q.isError) || !resume.data || !charges.data || !ponctuels.data || !categories.data) {
    return (
      <Carte espacement="large">
        <div className="rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de charger tes charges.</p>
          <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => requetes.forEach((q) => void q.refetch())}>
            Réessayer
          </Bouton>
        </div>
      </Carte>
    )
  }
  return <Charges resume={resume.data} charges={charges.data} ponctuels={ponctuels.data} categories={categories.data} />
}

interface ProprietesCharges {
  resume: ResumeChargesDto
  charges: ChargeDto[]
  ponctuels: PonctuelDto[]
  categories: CategorieDto[]
}

function Charges({ resume, charges, ponctuels, categories }: ProprietesCharges) {
  const [edition, setEdition] = useState<Edition>(null)
  const [suppression, setSuppression] = useState<Suppression>(null)
  const enregistrerCharge = useEnregistrerCharge()
  const enregistrerPonctuel = useEnregistrerPonctuel()
  const supprimerCharge = useSupprimerCharge()
  const supprimerPonctuel = useSupprimerPonctuel()

  const parId = new Map(categories.map((c) => [c.id, c]))
  const fixes = charges.filter((c) => c.nature === 'fixe')
  const enveloppes = charges.filter((c) => c.nature === 'enveloppe')
  const aVenir = ponctuels.filter((p) => !p.passe)
  const t = resume.duMois.totaux
  const totalGroupes = t.total
  const nomMois = formaterMois(resume.mois.cle, { majuscule: true })

  const categorie = (id: string) => {
    const c = parId.get(id)
    return c ? (
      <span className="flex min-w-0 items-center gap-2" title={c.libelle}>
        <IconeCategorie icone={c.icone} className="h-7 w-7" />
        <span className="truncate text-texte-sm font-medium text-encre">{c.libelle}</span>
      </span>
    ) : (
      <span className="text-texte-sm text-gris">—</span>
    )
  }

  const menu = (libelle: string, modifier: () => void, supprimer: () => void) => (
    <Menu
      declencheur={
        <button type="button" aria-label={`Options de ${libelle}`} className="rounded-pilule p-1 text-gris-icone hover:text-encre">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      }
      actions={[
        { libelle: 'Modifier', onSelect: modifier },
        { libelle: 'Supprimer', danger: true, onSelect: supprimer },
      ]}
    />
  )

  const titreEdition =
    edition?.type === 'ponctuel'
      ? edition.ponctuel
        ? 'Modifier le ponctuel'
        : 'Nouveau ponctuel'
      : edition?.type === 'enveloppe'
        ? edition.charge
          ? 'Modifier l’enveloppe'
          : 'Nouvelle enveloppe'
        : edition?.charge
          ? 'Modifier la charge'
          : 'Nouvelle charge fixe'

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <div className="flex flex-col justify-between gap-5 sm:flex-row">
            <Identite initiale="C" nom="Charges du plan" detail={`${fixes.length} fixe${fixes.length > 1 ? 's' : ''} · ${enveloppes.length} enveloppe${enveloppes.length > 1 ? 's' : ''} · ${aVenir.length} ponctuel${aVenir.length > 1 ? 's' : ''} à venir`} />
            <div className="flex flex-col gap-1 text-texte text-gris sm:items-end sm:text-right">
              <span>Par mois, en moyenne</span>
              <span>
                Fixes : <Montant valeur={resume.equivalentMensuel.fixe} />
              </span>
              <span>
                Enveloppes : <Montant valeur={resume.equivalentMensuel.enveloppe} />
              </span>
            </div>
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Mois budgétaire en cours',
              lignes: [
                { valeur: nomMois },
                { libelle: 'Du', valeur: `${formaterDate(resume.mois.debut, 'court')} au ${formaterDate(resume.mois.fin, 'court')}` },
                { libelle: 'Fixes + échéances', valeur: <Montant valeur={t.fixe + t.dette} /> },
              ],
            }}
            droite={{
              titre: 'Charges prévues',
              lignes: [
                { valeur: <Montant valeur={t.total} /> },
                { libelle: 'Enveloppes', valeur: <Montant valeur={t.enveloppe} /> },
                { libelle: 'Ponctuels', valeur: <Montant valeur={t.ponctuel} /> },
              ],
            }}
          />

          <Section
            titre="Charges fixes"
            sousTitre={
              <>
                Montant et date <span className="font-semibold text-encre-2">connus</span> : téléphone, loyer, abonnements.
              </>
            }
            onAjouter={() => setEdition({ type: 'fixe' })}
            entetes={['Charge', 'Quand', 'Catégorie', 'Montant', 'Par mois']}
            vide="Aucune charge fixe. Ajoute ton loyer, ton téléphone, tes abonnements."
          >
            {fixes.map((c) => (
              <li key={c.id} className={cn(COLONNES, !c.active && 'opacity-60')}>
                <BoutonLibelle libelle={c.libelle} onClick={() => setEdition({ type: 'fixe', charge: c })} />
                <Cellule titre={libelleQuandCharge(c)}>
                  <span className="font-medium">{c.active ? libelleQuandCharge(c) : 'Terminée'}</span>
                </Cellule>
                {categorie(c.categorieId)}
                <Cellule className="px-3" prefixe="DH">
                  <Montant valeur={c.montant} sansDevise />
                </Cellule>
                <Cellule className="px-3" prefixe="DH" attenue>
                  <Montant valeur={c.equivalentMensuel} sansDevise />
                </Cellule>
                {menu(c.libelle, () => setEdition({ type: 'fixe', charge: c }), () => setSuppression({ type: 'charge', id: c.id, libelle: c.libelle }))}
              </li>
            ))}
          </Section>

          <Section
            titre="Enveloppes"
            sousTitre={
              <>
                Un budget du mois que tu consommes <span className="font-semibold text-encre-2">librement, par semaine ou par jour</span> : nourriture, transport, loisirs.
              </>
            }
            onAjouter={() => setEdition({ type: 'enveloppe' })}
            entetes={['Enveloppe', 'Période', 'Catégorie', 'Budget du mois', 'Rythme']}
            vide="Aucune enveloppe. Elles servent au suivi de la semaine."
          >
            {enveloppes.map((c) => (
              <li key={c.id} className={cn(COLONNES, !c.active && 'opacity-60')}>
                <BoutonLibelle libelle={c.libelle} onClick={() => setEdition({ type: 'enveloppe', charge: c })} />
                <Cellule>
                  <span className="font-medium">{c.active ? `Dès ${formaterMois(c.debut)}${c.fin ? ` → ${formaterMois(c.fin)}` : ''}` : 'Terminée'}</span>
                </Cellule>
                {categorie(c.categorieId)}
                <Cellule className="px-3" prefixe="DH">
                  <Montant valeur={c.montant} sansDevise />
                </Cellule>
                <Cellule className="px-3" attenue={(c.unite ?? 'mois') === 'mois'} titre={RYTHMES[c.unite ?? 'mois'].explication}>
                  {c.unite === 'jour' && c.rythme ? (
                    <span className="whitespace-nowrap">
                      <Montant valeur={c.rythme} /> <span className="text-mention text-gris">/ jour</span>
                    </span>
                  ) : (
                    RYTHMES[c.unite ?? 'mois'].court
                  )}
                </Cellule>
                {menu(c.libelle, () => setEdition({ type: 'enveloppe', charge: c }), () => setSuppression({ type: 'charge', id: c.id, libelle: c.libelle }))}
              </li>
            ))}
          </Section>

          <Section
            titre="Ponctuels prévus"
            sousTitre={
              <>
                Une dépense <span className="font-semibold text-encre-2">unique</span> et datée : assurance annuelle, permis, réparation.
              </>
            }
            onAjouter={() => setEdition({ type: 'ponctuel' })}
            entetes={['Dépense', 'Date', 'Catégorie', 'Montant', 'Certitude']}
            vide="Aucun ponctuel prévu."
          >
            {ponctuels.map((p) => (
              <li key={p.id} className={cn(COLONNES, p.passe && 'opacity-60')}>
                <BoutonLibelle libelle={p.libelle} onClick={() => setEdition({ type: 'ponctuel', ponctuel: p })} />
                <Cellule attenue={p.passe}>{formaterDate(p.date)}</Cellule>
                {categorie(p.categorieId)}
                <Cellule className="px-3" prefixe="DH">
                  <Montant valeur={p.montant} sansDevise />
                </Cellule>
                <span className="truncate text-texte-sm font-medium text-gris">{p.passe ? 'Passé' : p.certitude === 'garanti' ? 'Sûr' : CERTITUDES_INFO[p.certitude].libelle}</span>
                {menu(p.libelle, () => setEdition({ type: 'ponctuel', ponctuel: p }), () => setSuppression({ type: 'ponctuel', id: p.id, libelle: p.libelle }))}
              </li>
            ))}
          </Section>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <h3 className="mb-4 text-titre text-encre">Répartition de {formaterMois(resume.mois.cle, { annee: false })}</h3>
              <div className="flex flex-col gap-4 rounded-bouton bg-interne p-5 shadow-bouton">
                {(['essentiel', 'flexible', 'engagement'] as const).map((g) => (
                  <div key={g}>
                    <div className="flex items-baseline justify-between gap-3 text-texte">
                      <span className="font-medium text-encre">{GROUPES[g].libelle}</span>
                      <Montant valeur={resume.parGroupe[g]} className="font-semibold text-encre" />
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-pilule bg-teinte" aria-hidden>
                      <div className="h-full rounded-pilule bg-primaire" style={{ width: `${part(resume.parGroupe[g], totalGroupes) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-mention text-gris">Les échéances de dettes comptent en « engagement ».</p>
              </div>
            </div>
            <BlocTotaux
              lignes={[
                { libelle: 'Charges fixes', valeur: <Montant valeur={t.fixe} />, fort: true },
                { libelle: 'Enveloppes', valeur: <Montant valeur={t.enveloppe} /> },
                { libelle: 'Ponctuels', valeur: <Montant valeur={t.ponctuel} /> },
                { libelle: 'Échéances de dettes', valeur: <Montant valeur={t.dette} /> },
              ]}
              total={{ libelle: `Prévu en ${formaterMois(resume.mois.cle, { annee: false })}`, valeur: <Montant valeur={t.total} /> }}
            />
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <Carte titre="À payer bientôt">
          {resume.prochaines.length === 0 ? (
            <p className="text-texte-sm text-gris">Rien de daté d’ici la fin du mois prochain.</p>
          ) : (
            <ul className="flex flex-col gap-4" aria-label="À payer bientôt">
              {resume.prochaines.map((l, i) => (
                <li key={`${l.id}-${l.date}-${i}`} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-texte font-medium text-encre">{l.libelle}</span>
                    <span className="block text-texte-sm text-gris">
                      {dateOuMois(l)} · {ORIGINES[l.origine].toLowerCase()}
                    </span>
                  </span>
                  <Montant valeur={l.montant} className="font-semibold text-encre" />
                </li>
              ))}
            </ul>
          )}
        </Carte>

        <Carte titre="Charges essentielles" precision="(par mois)">
          <span className="text-montant text-encre">
            <Montant valeur={resume.equivalentMensuel.essentiel} anime />
          </span>
          <Separateur className="my-5" />
          <p className="text-texte-sm text-gris">Ce dont tu as besoin chaque mois quoi qu’il arrive. Il servira à proposer la cible de ton fonds de sécurité (3 à 6 mois).</p>
        </Carte>

        <div className="grid grid-cols-2 gap-4">
          <Bouton variante="blanc" onClick={() => setEdition({ type: 'enveloppe' })}>
            <IconePlusRond className="h-5 w-5" /> Enveloppe
          </Bouton>
          <Bouton variante="blanc" onClick={() => setEdition({ type: 'ponctuel' })}>
            <IconePlusRond className="h-5 w-5" /> Ponctuel
          </Bouton>
        </div>
        <Bouton className="w-full" onClick={() => setEdition({ type: 'fixe' })}>
          Ajouter une charge fixe
        </Bouton>
      </motion.div>

      <Panneau ouvert={edition !== null} onFermer={() => setEdition(null)} titre={titreEdition} description="Décris-la une fois : MySalary la prévoit dans chaque mois concerné.">
        {edition?.type === 'ponctuel' ? (
          <FormulairePonctuel
            key={edition.ponctuel?.id ?? 'nouveau'}
            initial={edition.ponctuel}
            aujourdhui={resume.aujourdhui}
            chargement={enregistrerPonctuel.isPending}
            onEnregistrer={async (saisie) => {
              await enregistrerPonctuel.mutateAsync({ ...saisie, id: edition.ponctuel?.id })
              toast(edition.ponctuel ? 'Ponctuel modifié.' : `« ${saisie.libelle} » prévu le ${formaterDate(saisie.date)}.`)
              setEdition(null)
            }}
          />
        ) : edition ? (
          <FormulaireCharge
            key={edition.charge?.id ?? edition.type}
            nature={edition.type}
            initial={edition.charge}
            aujourdhui={resume.aujourdhui}
            moisCourant={resume.mois.cle}
            moisSemaines={[resume.mois, resume.moisSuivant]}
            chargement={enregistrerCharge.isPending}
            onEnregistrer={async (saisie) => {
              await enregistrerCharge.mutateAsync({ ...saisie, id: edition.charge?.id })
              toast(edition.charge ? 'Modification enregistrée.' : `« ${saisie.libelle} » ajoutée à ton plan.`)
              setEdition(null)
            }}
          />
        ) : null}
      </Panneau>

      <Confirmation
        ouvert={suppression !== null}
        onFermer={() => setSuppression(null)}
        titre={`Supprimer « ${suppression?.libelle ?? ''} » ?`}
        description="Elle disparaît de tous les mois prévus. Pour l’arrêter seulement à partir d’un mois, choisis plutôt un dernier mois."
        libelleConfirmer="Supprimer"
        chargement={supprimerCharge.isPending || supprimerPonctuel.isPending}
        onConfirmer={() => {
          if (!suppression) return
          const action = suppression.type === 'charge' ? supprimerCharge : supprimerPonctuel
          action.mutate(suppression.id, {
            onSuccess: () => {
              toast(`« ${suppression.libelle} » supprimé.`)
              setSuppression(null)
            },
            onError: () => toast('La suppression n’a pas abouti. Réessaie.'),
          })
        }}
      />
    </div>
  )
}

function BoutonLibelle({ libelle, onClick }: { libelle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={libelle}
      aria-label={`Modifier ${libelle}`}
      className="flex h-[46px] items-center truncate rounded-champ border border-filet bg-white px-4 text-left text-texte font-semibold text-encre transition-colors hover:border-primaire"
    >
      {libelle}
    </button>
  )
}

function Section({
  titre,
  sousTitre,
  onAjouter,
  entetes,
  vide,
  children,
}: {
  titre: string
  sousTitre: ReactNode
  onAjouter: () => void
  entetes: string[]
  vide: string
  children: ReactNode[]
}) {
  return (
    <section className="mt-8">
      <TitreSection
        titre={titre}
        sousTitre={sousTitre}
        action={
          <Bouton variante="puce" taille="sm" onClick={onAjouter}>
            + Ajouter
          </Bouton>
        }
      />
      <div className="relative -mx-1 mt-5 overflow-x-auto px-1">
        <div className="min-w-[720px]">
          <div className={cn(COLONNES, 'border-y border-filet px-4 py-4 text-texte-sm text-gris')}>
            {entetes.map((e) => (
              <span key={e}>{e}</span>
            ))}
            <span />
          </div>
          {children.length === 0 ? (
            <p className="px-4 pt-5 text-texte-sm text-gris">{vide}</p>
          ) : (
            <ul className="flex flex-col gap-3 pt-5" aria-label={titre}>
              {children}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
