import { formaterDate, formaterMontant, type CompteSuiviDto, type EpargneDto, type MouvementEpargneDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Champ, ChampMontant } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { BlocTotaux, Identite } from '../../components/Elements'
import { Menu } from '../../components/Menu'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { ErreurApi } from '../../lib/api'
import { elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { dateDuJour } from '../../lib/dates'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { libelleJour } from '../depenses/saisie'
import { lireMontant, versSaisie } from '../salaire/saisie'
import { useEnregistrerCompte, useEpargne, useObjectifs, useSupprimerCompte, useSupprimerMouvement } from './requetes'
import { groupesMouvements, LIBELLES_MOUVEMENT } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'

/** Mon plan › Épargne (UX.md § 5.11, R12–R14) : ce qui est de côté, ce qui est réservé, ce qui reste disponible. */
export function OngletEpargne() {
  const epargne = useEpargne()
  if (epargne.isPending) {
    return (
      <div className={GRILLE} aria-label="Chargement de l’épargne">
        <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
        <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
      </div>
    )
  }
  if (epargne.isError) {
    return (
      <Carte espacement="large">
        <div className="rounded-bouton bg-alerte-fond p-5">
          <p className="text-texte font-medium text-alerte">Impossible de charger ton épargne.</p>
          <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void epargne.refetch()}>
            Réessayer
          </Bouton>
        </div>
      </Carte>
    )
  }
  return <Epargne epargne={epargne.data} />
}

function Epargne({ epargne }: { epargne: EpargneDto }) {
  const { etat, aujourdhui } = epargne
  const { ouvrirVersement } = useSaisieRapide()
  const objectifs = useObjectifs()
  const supprimerMouvement = useSupprimerMouvement()
  const supprimerCompte = useSupprimerCompte()
  const [edition, setEdition] = useState<{ compte?: CompteSuiviDto } | null>(null)
  const [aSupprimer, setASupprimer] = useState<MouvementEpargneDto | null>(null)
  const reserves = (objectifs.data?.objectifs ?? []).filter((o) => o.statut === 'actif' || o.statut === 'pause')
  const groupes = groupesMouvements(epargne.mouvements)

  return (
    <div className={GRILLE}>
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <div className="flex flex-col justify-between gap-5 sm:flex-row">
            <Identite initiale="É" nom="Épargne" detail={`${etat.comptes.length} compte${etat.comptes.length > 1 ? 's' : ''} · ${reserves.length} objectif${reserves.length > 1 ? 's' : ''}`} />
            <div className="flex flex-col gap-1 text-texte text-gris sm:items-end sm:text-right">
              <span>Ce que tu as vraiment de côté</span>
              <span>Jamais compté comme une dépense</span>
            </div>
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Solde',
              lignes: [
                { valeur: <Montant valeur={etat.solde} /> },
                { libelle: 'Réservé aux objectifs', valeur: <Montant valeur={etat.reserve} /> },
                { libelle: 'Disponible', valeur: <Montant valeur={etat.disponible} /> },
              ],
            }}
            droite={{
              titre: 'Comptes',
              lignes:
                etat.comptes.length === 0
                  ? [{ valeur: 'Aucun compte déclaré' }]
                  : etat.comptes.slice(0, 3).map((c, i) => (i === 0 ? { valeur: <Montant valeur={c.soldeActuel} /> } : { libelle: c.libelle, valeur: <Montant valeur={c.soldeActuel} /> })),
            }}
          />

          {etat.depassement > 0 && (
            <div role="alert" className="mt-5 rounded-champ bg-alerte-fond px-4 py-3 text-texte-sm text-alerte">
              <p className="font-semibold">Tes objectifs réservent {formaterMontant(etat.depassement)} de plus que ton épargne déclarée.</p>
              <p className="mt-1 text-encre-2">Réajuste : déclare le solde réel de ton compte, ou baisse ce qui est déjà mis de côté sur un objectif.</p>
            </div>
          )}

          <section className="mt-8">
            <TitreSection
              titre="Comptes"
              sousTitre={
                <>
                  Le solde <span className="font-semibold text-encre-2">déclaré</span> à une date, plus les mouvements notés depuis.
                </>
              }
              action={
                <Bouton variante="puce" taille="sm" onClick={() => setEdition({})}>
                  + Ajouter
                </Bouton>
              }
            />
            {etat.comptes.length === 0 ? (
              <div className="mt-5 rounded-bouton bg-interne p-5">
                <p className="text-texte font-medium text-encre">Aucun compte d’épargne.</p>
                <p className="mt-1 text-texte-sm text-gris">Ajoute ton compte et ce qu’il contient aujourd’hui : tes objectifs sauront ce qui est vraiment disponible.</p>
                <Bouton taille="sm" className="mt-4" onClick={() => setEdition({})}>
                  Ajouter mon compte
                </Bouton>
              </div>
            ) : (
              <ul className="mt-5 flex flex-col gap-3" aria-label="Comptes d’épargne">
                {etat.comptes.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-champ border border-filet bg-white px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-texte font-semibold text-encre">{c.libelle}</span>
                      <span className="block truncate text-texte-sm text-gris">
                        Déclaré : {formaterMontant(c.solde)} le {formaterDate(c.auLe)}
                      </span>
                    </span>
                    <Montant valeur={c.soldeActuel} className="shrink-0 font-semibold text-encre" />
                    <Menu
                      declencheur={
                        <button type="button" aria-label={`Options de ${c.libelle}`} className="rounded-pilule p-1 text-gris-icone hover:text-encre">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      }
                      actions={[
                        { libelle: 'Déclarer le solde', onSelect: () => setEdition({ compte: c }) },
                        {
                          libelle: 'Supprimer',
                          danger: true,
                          onSelect: () =>
                            supprimerCompte.mutate(c.id, {
                              onSuccess: () => toast(`Compte « ${c.libelle} » supprimé.`),
                              onError: (e) => toast(e instanceof ErreurApi ? e.message : 'La suppression n’a pas abouti.'),
                            }),
                        },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <TitreSection
              titre="Mouvements"
              sousTitre={
                <>
                  Versements et retraits <span className="font-semibold text-encre-2">réels</span>, du plus récent au plus ancien.
                </>
              }
              action={
                <Bouton variante="puce" taille="sm" onClick={() => ouvrirVersement()} disabled={etat.comptes.length === 0}>
                  + Verser
                </Bouton>
              }
            />
            {groupes.length === 0 ? (
              <p className="mt-5 text-texte-sm text-gris">Aucun mouvement noté. Un versement vers un objectif apparaîtra ici.</p>
            ) : (
              <div className="mt-5 flex flex-col gap-6">
                {groupes.map((g) => (
                  <section key={g.jour} aria-label={libelleJour(g.jour, aujourdhui)}>
                    <h4 className="mb-3 text-texte-sm font-semibold text-encre">{libelleJour(g.jour, aujourdhui)}</h4>
                    <ul className="flex flex-col gap-2">
                      {g.mouvements.map((m) => (
                        <li key={m.id} className="flex items-center gap-3 rounded-champ border border-filet bg-white px-4 py-3">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-texte font-semibold text-encre">{m.libelle || LIBELLES_MOUVEMENT[m.type]}</span>
                            <span className="block truncate text-texte-sm text-gris">
                              {[LIBELLES_MOUVEMENT[m.type], m.objectif ?? 'épargne libre', m.compte].join(' · ')}
                            </span>
                          </span>
                          <span className={cn('shrink-0 font-semibold', m.montant < 0 ? 'text-encre-2' : 'text-encre')}>
                            {m.montant > 0 ? '+' : ''}
                            <Montant valeur={m.montant} />
                          </span>
                          {m.type === 'achat' ? (
                            <span className="w-7" aria-hidden />
                          ) : (
                            <Menu
                              declencheur={
                                <button type="button" aria-label={`Options du mouvement ${m.libelle || LIBELLES_MOUVEMENT[m.type]}`} className="rounded-pilule p-1 text-gris-icone hover:text-encre">
                                  <MoreHorizontal className="h-5 w-5" />
                                </button>
                              }
                              actions={[{ libelle: 'Supprimer', danger: true, onSelect: () => setASupprimer(m) }]}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <h3 className="mb-4 text-titre text-encre">Réservé aux objectifs</h3>
              <div className="flex flex-col gap-3 rounded-bouton bg-interne p-5 shadow-bouton">
                {reserves.length === 0 ? (
                  <p className="text-texte-sm text-gris">Aucun objectif ne réserve d’épargne.</p>
                ) : (
                  reserves.map((o) => (
                    <Link key={o.id} to={`/objectifs/${o.id}`} className="flex items-baseline justify-between gap-3 text-texte hover:text-lien">
                      <span className="truncate font-medium text-encre">{o.libelle}</span>
                      <Montant valeur={o.epargne} className="shrink-0 font-semibold text-encre" />
                    </Link>
                  ))
                )}
              </div>
            </div>
            <BlocTotaux
              lignes={[
                { libelle: 'Solde', valeur: <Montant valeur={etat.solde} />, fort: true },
                { libelle: 'Réservé', valeur: <Montant valeur={etat.reserve} /> },
                ...(etat.depassement > 0 ? [{ libelle: 'Réservé en trop', valeur: <Montant valeur={etat.depassement} className="text-alerte" /> }] : []),
              ]}
              total={{ libelle: 'Disponible', valeur: <Montant valeur={etat.disponible} /> }}
            />
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <Carte titre="Objectifs">
          <p className="text-texte-sm text-gris">Chaque objectif réserve ce qui est déjà mis de côté pour lui. Le reste de ton épargne est disponible.</p>
          <Link to="/objectifs" className={styleBouton({ variante: 'blanc', className: 'mt-5 w-full' })}>
            Voir mes objectifs
          </Link>
        </Carte>
        <Carte titre="Sur quoi repose ce calcul ?">
          <ul className="flex list-disc flex-col gap-2 pl-4 text-texte-sm text-gris">
            <li>Solde d’un compte = le solde que tu as déclaré, plus les versements et moins les retraits notés depuis ce jour.</li>
            <li>Réservé = ce qui est déjà mis de côté sur tes objectifs actifs ou en pause.</li>
            <li>Disponible = solde − réservé. Il n’est jamais négatif : sinon une alerte te demande de réajuster.</li>
            <li>Un achat réalisé consomme l’épargne de son objectif ; il n’est pas compté comme une dépense.</li>
          </ul>
        </Carte>
      </motion.div>

      <Panneau
        ouvert={edition !== null}
        onFermer={() => setEdition(null)}
        titre={edition?.compte ? `Déclarer le solde de ${edition.compte.libelle}` : 'Nouveau compte d’épargne'}
        description="Le montant réellement présent sur le compte à cette date."
      >
        {edition && <FormulaireCompte key={edition.compte?.id ?? 'nouveau'} compte={edition.compte} aujourdhui={aujourdhui} onTermine={() => setEdition(null)} />}
      </Panneau>

      <Confirmation
        ouvert={aSupprimer !== null}
        onFermer={() => setASupprimer(null)}
        titre="Supprimer ce mouvement ?"
        description={aSupprimer ? `${LIBELLES_MOUVEMENT[aSupprimer.type]} de ${formaterMontant(Math.abs(aSupprimer.montant))} du ${formaterDate(aSupprimer.date)}.` : ''}
        libelleConfirmer="Supprimer"
        chargement={supprimerMouvement.isPending}
        onConfirmer={() =>
          aSupprimer &&
          supprimerMouvement.mutate(aSupprimer.id, {
            onSuccess: () => {
              toast('Mouvement supprimé.')
              setASupprimer(null)
            },
            onError: (e) => toast(e instanceof ErreurApi ? e.message : 'La suppression n’a pas abouti.'),
          })
        }
      />
    </div>
  )
}

function FormulaireCompte({ compte, aujourdhui, onTermine }: { compte?: CompteSuiviDto; aujourdhui: string; onTermine: () => void }) {
  const enregistrer = useEnregistrerCompte()
  const [libelle, setLibelle] = useState(compte?.libelle ?? '')
  const [solde, setSolde] = useState(compte ? versSaisie(compte.soldeActuel) : '')
  const [auLe, setAuLe] = useState(compte ? dateDuJour() : aujourdhui)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const lu = lireMontant(solde, 0)
    const p: Record<string, string> = {}
    if (!libelle.trim()) p.libelle = 'Nom obligatoire.'
    if ('erreur' in lu) p.solde = lu.erreur
    if (auLe > aujourdhui) p.auLe = 'Un solde déclaré ne peut pas être dans le futur.'
    setErreurs(p)
    if ('erreur' in lu || Object.keys(p).length > 0) return
    try {
      await enregistrer.mutateAsync({ id: compte?.id, libelle: libelle.trim(), solde: lu.valeur, auLe })
      toast(compte ? `Solde de « ${libelle.trim()} » déclaré : ${formaterMontant(lu.valeur)}.` : `Compte « ${libelle.trim()} » ajouté.`)
      onTermine()
    } catch (erreur) {
      setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue. Réessaie.' })
    }
  }

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
      <Champ libelle="Nom du compte" placeholder="Compte épargne, livret…" value={libelle} onChange={(e) => setLibelle(e.target.value)} erreur={erreurs.libelle} maxLength={60} />
      <ChampMontant libelle="Solde réel" value={solde} onChange={(e) => setSolde(e.target.value)} erreur={erreurs.solde} />
      <Champ libelle="À la date du" type="date" max={aujourdhui} value={auLe} onChange={(e) => setAuLe(e.target.value)} erreur={erreurs.auLe} aide="Les mouvements notés à partir de ce jour s’y ajoutent." />
      {erreurs._ && (
        <p role="alert" className="text-texte-sm font-medium text-alerte">
          {erreurs._}
        </p>
      )}
      <Bouton type="submit" taille="md" chargement={enregistrer.isPending} className="self-start">
        {compte ? 'Déclarer ce solde' : 'Ajouter ce compte'}
      </Bouton>
    </form>
  )
}
