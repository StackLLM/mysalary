import { deMois, formaterDate, formaterMois, formaterMontant, type CategorieDto, type DepenseDto, type LigneAPayer, type SuiviDepensesDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { BlocTotaux, Identite } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { Menu } from '../../components/Menu'
import { Montant } from '../../components/Montant'
import { Selection } from '../../components/Selection'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { IconeCategorie } from '../charges/IconeCategorie'
import { useCategories } from '../charges/requetes'
import { part, STATUTS_ECHEANCE } from '../charges/saisie'
import { useEnregistrerDepense, useSuiviDepenses, useSupprimerDepense } from '../depenses/requetes'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { detailDepense, IMPUTATIONS, journal, joursRestants, libelleDepense, libelleJour, moisVoisin, saisiePaiement } from '../depenses/saisie'
import type { Ton } from '../salaire/saisie'

const STYLE_LIGNE = 'flex items-center gap-2.5 rounded-champ border border-filet bg-white px-3 py-3 sm:gap-3 sm:px-4'

const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }

/** Mois › Dépenses (UX.md § 5.5) : le réel du mois, ce qui reste prévu, et le rattachement au plan. */
export function PageMois() {
  const [parametres, setParametres] = useSearchParams()
  const demande = parametres.get('mois')
  const suivi = useSuiviDepenses(demande)
  const categories = useCategories()

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Mois', chemin: '/mois' }, { libelle: 'Dépenses' }]} />
      </motion.div>
      {suivi.isPending || categories.isPending ? (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12" aria-label="Chargement du mois">
          <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
          <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
        </div>
      ) : suivi.isError || categories.isError ? (
        <Carte espacement="large">
          <div className="rounded-bouton bg-alerte-fond p-5">
            <p className="text-texte font-medium text-alerte">Impossible de charger ce mois.</p>
            <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => [suivi, categories].forEach((q) => void q.refetch())}>
              Réessayer
            </Bouton>
          </div>
        </Carte>
      ) : (
        <Mois suivi={suivi.data} categories={categories.data} changerMois={(cle) => setParametres({ mois: cle })} />
      )}
    </motion.div>
  )
}

function Mois({ suivi, categories, changerMois }: { suivi: SuiviDepensesDto; categories: CategorieDto[]; changerMois: (cle: string) => void }) {
  const { ouvrir } = useSaisieRapide()
  const enregistrer = useEnregistrerDepense()
  const supprimer = useSupprimerDepense()
  const [filtre, setFiltre] = useState<string>('')
  const parId = new Map(categories.map((c) => [c.id, c]))
  const { mois, totaux, restePrevu, aujourdhui } = suivi
  const liste = journal(suivi.depenses, suivi.paiementsDettes, filtre || null)
  const restants = joursRestants(mois, aujourdhui)
  const nom = formaterMois(mois.cle, { majuscule: true })
  const court = formaterMois(mois.cle, { annee: false })
  const aVenir = mois.statut === 'aVenir'

  function payer(ligne: LigneAPayer) {
    enregistrer.mutate(saisiePaiement(ligne, aujourdhui), {
      onSuccess: ({ id }) =>
        toast(`« ${ligne.libelle} » payé : ${formaterMontant(ligne.reste)}.`, { action: { label: 'Annuler', onClick: () => supprimer.mutate(id) } }),
      onError: () => toast('Le paiement n’a pas été noté. Réessaie.'),
    })
  }

  function effacer(d: DepenseDto) {
    supprimer.mutate(d.id, {
      onSuccess: () =>
        toast(`Dépense de ${formaterMontant(d.montant)} supprimée.`, {
          action: {
            label: 'Annuler',
            onClick: () =>
              enregistrer.mutate({
                date: d.date,
                montant: d.montant,
                categorieId: d.categorieId,
                libelle: d.libelle,
                ...(d.note ? { note: d.note } : {}),
                chargeId: d.chargeId,
                echeance: d.echeance,
                ponctuelId: d.ponctuelId,
              }),
          },
        }),
      onError: () => toast('La suppression n’a pas abouti. Réessaie.'),
    })
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <Identite
              initiale={nom.charAt(0)}
              nom={`Dépenses ${deMois(mois.cle, { annee: false })}`}
              detail={`Du ${formaterDate(mois.debut, 'court')} au ${formaterDate(mois.fin, 'court')}`}
            />
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Bouton variante="contour" taille="sm" className="h-10 w-10 rounded-pilule p-0" aria-label="Mois précédent" onClick={() => changerMois(moisVoisin(mois.cle, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Bouton>
              <span className="min-w-[132px] text-center">
                <span className="block text-texte font-semibold text-encre">{nom}</span>
                <span className="block text-mention text-gris">
                  {restants !== null ? `${restants} jour${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''}` : aVenir ? 'À venir' : 'Terminé'}
                </span>
              </span>
              <Bouton variante="contour" taille="sm" className="h-10 w-10 rounded-pilule p-0" aria-label="Mois suivant" onClick={() => changerMois(moisVoisin(mois.cle, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Bouton>
            </div>
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Dépensé (réel)',
              lignes: [
                { valeur: <Montant valeur={totaux.total} /> },
                { libelle: 'Hors plan', valeur: <Montant valeur={totaux.horsPlan} /> },
                { libelle: 'Paiements de dettes', valeur: <Montant valeur={totaux.dette} /> },
              ],
            }}
            droite={{
              titre: 'Encore prévu',
              lignes: [
                { valeur: <Montant valeur={restePrevu.total} /> },
                { libelle: 'Charges à payer', valeur: <Montant valeur={restePrevu.lignes} /> },
                { libelle: 'Échéances de dettes', valeur: <Montant valeur={restePrevu.dettes} /> },
                { libelle: 'Enveloppes', valeur: <Montant valeur={restePrevu.enveloppes} /> },
              ],
            }}
          />

          <section className="mt-8">
            <TitreSection
              titre="Dépenses"
              sousTitre={
                <>
                  Ce qui est sorti <span className="font-semibold text-encre-2">vraiment</span>, jour par jour.
                </>
              }
              action={
                <Bouton variante="puce" taille="sm" onClick={() => ouvrir()} disabled={aVenir}>
                  + Ajouter
                </Bouton>
              }
            />
            <div className="mt-5 flex flex-col gap-3 border-y border-filet py-4 sm:flex-row sm:items-end sm:justify-between">
              <Selection libelle="Catégorie" value={filtre} onChange={(e) => setFiltre(e.target.value)} className="sm:w-64">
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.libelle}
                  </option>
                ))}
              </Selection>
              <p className="text-texte text-gris" aria-live="polite">
                {liste.nombre} ligne{liste.nombre > 1 ? 's' : ''} · <Montant valeur={liste.total} className="font-semibold text-encre" />
              </p>
            </div>

            {liste.nombre === 0 ? (
              <p className="pt-5 text-texte-sm text-gris">
                {aVenir ? 'Mois à venir : rien de réel pour l’instant.' : filtre ? 'Aucune dépense dans cette catégorie ce mois-ci.' : 'Aucune dépense notée sur cette période.'}
              </p>
            ) : (
              <div className="flex flex-col gap-6 pt-5">
                {liste.groupes.map((g) => (
                  <section key={g.jour} aria-label={libelleJour(g.jour, aujourdhui)}>
                    <h4 className="mb-3 flex items-baseline justify-between gap-3 text-texte-sm">
                      <span className="font-semibold text-encre">{libelleJour(g.jour, aujourdhui)}</span>
                      <Montant valeur={g.total} className="text-gris" />
                    </h4>
                    <ul className="flex flex-col gap-2">
                      {g.lignes.map((l) =>
                        l.type === 'depense' ? (
                          <LigneDepense key={l.depense.id} depense={l.depense} categorie={parId.get(l.depense.categorieId)} nom={libelleDepense(l.depense, parId)} detail={detailDepense(l.depense, parId)} onModifier={() => ouvrir(l.depense)} onSupprimer={() => effacer(l.depense)} />
                        ) : (
                          <li key={l.paiement.id} className={STYLE_LIGNE}>
                            <IconeCategorie icone="banque" className="hidden h-9 w-9 sm:grid" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-texte font-semibold text-encre">{l.paiement.libelle}</span>
                              <span className="block truncate text-texte-sm text-gris">Paiement de dette</span>
                            </span>
                            <Montant valeur={l.paiement.montant} className="font-semibold text-encre" />
                            <span className="w-7" aria-hidden />
                          </li>
                        ),
                      )}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <h3 className="mb-4 text-titre text-encre">Enveloppes {deMois(mois.cle, { annee: false })}</h3>
              <div className="flex flex-col gap-4 rounded-bouton bg-interne p-5 shadow-bouton">
                {suivi.enveloppes.length === 0 ? (
                  <p className="text-texte-sm text-gris">Aucune enveloppe ce mois-ci. Elles se définissent dans Mon plan.</p>
                ) : (
                  suivi.enveloppes.map((e) => (
                    <div key={e.id}>
                      <div className="flex items-baseline justify-between gap-3 text-texte">
                        <span className="truncate font-medium text-encre">{e.libelle}</span>
                        <span className="shrink-0 text-texte-sm text-gris">
                          <Montant valeur={e.depense} className="font-semibold text-encre" /> / <Montant valeur={e.budget} />
                        </span>
                      </div>
                      <BarreProgression className="mt-2" valeur={part(e.depense, e.budget)} libelle={`${e.libelle} : ${Math.round(part(e.depense, e.budget) * 100)} % du budget`} />
                      <p className={cn('mt-1 text-mention', e.reste < 0 ? 'text-alerte' : 'text-gris')}>
                        {e.reste < 0 ? `Dépassée de ${formaterMontant(-e.reste)}` : `Reste ${formaterMontant(e.reste)}`}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <BlocTotaux
              lignes={[
                { libelle: 'Charges fixes', valeur: <Montant valeur={totaux.fixe} />, fort: true },
                { libelle: 'Enveloppes', valeur: <Montant valeur={totaux.enveloppe} /> },
                { libelle: 'Ponctuels', valeur: <Montant valeur={totaux.ponctuel} /> },
                { libelle: IMPUTATIONS.horsPlan, valeur: <Montant valeur={totaux.horsPlan} /> },
                { libelle: 'Paiements de dettes', valeur: <Montant valeur={totaux.dette} /> },
              ]}
              total={{ libelle: `Dépensé en ${court}`, valeur: <Montant valeur={totaux.total} /> }}
            />
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <Carte titre="À payer ce mois">
          {suivi.lignes.length === 0 ? (
            <p className="text-texte-sm text-gris">Aucune charge fixe ni ponctuel prévu ce mois-ci.</p>
          ) : (
            <ul className="flex flex-col gap-4" aria-label="À payer ce mois">
              {suivi.lignes.map((l) => {
                const statut = STATUTS_ECHEANCE[l.statut]
                return (
                  <li key={`${l.id}-${l.date}`} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-texte font-medium text-encre">{l.libelle}</span>
                      <span className="block text-texte-sm text-gris">
                        {formaterDate(l.date, 'court')} · <span className={TONS[statut.ton]}>{statut.texte}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Montant valeur={l.statut === 'payee' ? l.montant : l.reste} className={cn('font-semibold', l.statut === 'payee' ? 'text-gris' : 'text-encre')} />
                      {l.statut !== 'payee' && !aVenir && (
                        <Bouton variante="puce" taille="sm" className="h-7 px-2.5" onClick={() => payer(l)} disabled={enregistrer.isPending} aria-label={`Marquer ${l.libelle} payé`}>
                          Payé
                        </Bouton>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Carte>

        <Carte titre="Où va l’argent" precision="(réel)">
          <ul className="flex flex-col gap-3 text-texte">
            {(['fixe', 'enveloppe', 'ponctuel', 'horsPlan'] as const).map((i) => (
              <li key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-gris">{IMPUTATIONS[i]}</span>
                  <Montant valeur={totaux[i]} className="font-semibold text-encre" />
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-pilule bg-teinte" aria-hidden>
                  <div className="h-full rounded-pilule bg-primaire" style={{ width: `${part(totaux[i], totaux.total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Carte>

        <Bouton className="w-full" onClick={() => ouvrir()} disabled={aVenir}>
          Ajouter une dépense
        </Bouton>
      </motion.div>
    </div>
  )
}

function LigneDepense({
  depense: d,
  categorie,
  nom,
  detail,
  onModifier,
  onSupprimer,
}: {
  depense: DepenseDto
  categorie?: CategorieDto
  nom: string
  detail: string
  onModifier: () => void
  onSupprimer: () => void
}) {
  return (
    <li className={STYLE_LIGNE}>
      {categorie ? <IconeCategorie icone={categorie.icone} className="hidden h-9 w-9 sm:grid" /> : <span className="hidden h-9 w-9 sm:block" />}
      <button type="button" onClick={onModifier} className="min-w-0 flex-1 text-left" aria-label={`Modifier ${nom}`}>
        <span className="block truncate text-texte font-semibold text-encre" title={nom}>
          {nom}
        </span>
        <span className="line-clamp-2 text-texte-sm text-gris" title={[detail, d.note].filter(Boolean).join(' — ')}>
          {detail}
        </span>
      </button>
      <Montant valeur={d.montant} className="font-semibold text-encre" />
      <Menu
        declencheur={
          <button type="button" aria-label={`Options de ${nom}`} className="rounded-pilule p-1 text-gris-icone hover:text-encre">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        }
        actions={[
          { libelle: 'Modifier', onSelect: onModifier },
          { libelle: 'Supprimer', danger: true, onSelect: onSupprimer },
        ]}
      />
    </li>
  )
}
