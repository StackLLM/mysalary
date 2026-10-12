import { formaterDate, formaterMois, formaterMontant, type ObjectifDetailDto } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeNature, BadgeRisque } from '../../components/Badges'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton, styleBouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Champ } from '../../components/Champ'
import { Confirmation } from '../../components/Confirmation'
import { BlocTotaux, Identite } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { GraphiqueTrajectoire } from '../../components/graphiques/GraphiqueTrajectoire'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { Selection } from '../../components/Selection'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { dateDuJour } from '../../lib/dates'
import { useSaisieRapide } from '../depenses/SaisieRapide'
import { LIBELLES_MOUVEMENT } from '../epargne/saisie'
import { useObjectif, useRealiserObjectif, useStatutObjectif, useSupprimerObjectif } from '../epargne/requetes'
import { PlanCumul } from './PlanCumul'
import { phraseObjectif, pointsTrajectoire, propositions, RISQUES_PHRASES, SCENARIOS_LIBELLES, texteEstimation, texteRegle, TYPES } from './saisie'

const GRILLE = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12'

/** Objectif (UX.md § 5.8) : savoir quand et comment l'atteindre. */
export function PageObjectif() {
  const { id } = useParams()
  const [cumul, setCumul] = useState<number>()
  const detail = useObjectif(id, cumul)
  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Objectifs', chemin: '/objectifs' }, { libelle: detail.data?.objectif.libelle ?? 'Objectif' }]} />
      </motion.div>
      {detail.isError ? (
        <Carte espacement="large">
          <div className="rounded-bouton bg-alerte-fond p-5">
            <p className="text-texte font-medium text-alerte">{detail.error instanceof ErreurApi && detail.error.statut === 404 ? 'Cet objectif n’existe pas.' : 'Impossible de charger cet objectif.'}</p>
            <Link to="/objectifs" className={styleBouton({ variante: 'contour', taille: 'sm', className: 'mt-4' })}>
              Retour aux objectifs
            </Link>
          </div>
        </Carte>
      ) : detail.isPending ? (
        <div className={GRILLE} aria-label="Chargement de l’objectif">
          <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
          <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
        </div>
      ) : (
        <Detail detail={detail.data} onCumul={setCumul} calcul={detail.isPlaceholderData || detail.isFetching} />
      )}
    </motion.div>
  )
}

function Detail({ detail, onCumul, calcul }: { detail: ObjectifDetailDto; onCumul: (centimes: number | undefined) => void; calcul: boolean }) {
  const { objectif: o, aujourdhui } = detail
  const navigate = useNavigate()
  const { ouvrirVersement } = useSaisieRapide()
  const statut = useStatutObjectif()
  const supprimer = useSupprimerObjectif()
  const [demande, setDemande] = useState<'realiser' | 'abandonner' | 'supprimer' | null>(null)
  const { libelle: nomType } = TYPES[o.type]
  const actif = o.statut === 'actif'
  const ouvert = o.statut === 'actif' || o.statut === 'pause'
  const trajectoire = pointsTrajectoire(detail.trajectoire)
  const leviers = propositions(o)

  const changer = (nouveau: 'actif' | 'pause' | 'abandonne', message: string) =>
    statut.mutate(
      { id: o.id, statut: nouveau },
      {
        onSuccess: () => {
          toast(message)
          setDemande(null)
        },
        onError: (e) => toast(e instanceof ErreurApi ? e.message : 'Le changement n’a pas abouti.'),
      },
    )

  return (
    <div className={GRILLE}>
      <motion.div variants={elementApparition} className="min-w-0">
        <Carte espacement="large">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <Identite initiale={o.libelle.charAt(0).toUpperCase()} nom={o.libelle} detail={`${nomType} · priorité ${o.priorite}`} />
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {o.statut === 'pause' && <span className="rounded-pilule bg-teinte px-2.5 py-1 text-mention text-gris">En pause</span>}
              {o.statut === 'realise' && <span className="rounded-pilule bg-positif-fond px-2.5 py-1 text-mention text-positif">Réalisé le {formaterDate(o.realiseLe!)}</span>}
              {o.statut === 'abandonne' && <span className="rounded-pilule bg-teinte px-2.5 py-1 text-mention text-gris">Abandonné</span>}
              {ouvert && o.atteint && <span className="rounded-pilule bg-positif-fond px-2.5 py-1 text-mention text-positif">Cible atteinte</span>}
              {o.risque && !o.atteint && <BadgeRisque risque={o.risque} />}
            </div>
          </div>

          <CarteBandeau
            className="mt-7"
            gauche={{
              titre: 'Épargné',
              lignes: [
                { valeur: <Montant valeur={o.epargne} /> },
                { libelle: 'Cible', valeur: <Montant valeur={o.montantCible} /> },
                { libelle: 'Restant', valeur: <Montant valeur={o.restant} /> },
              ],
            }}
            droite={{
              titre: 'Date estimée (projection)',
              lignes: o.estimations
                ? [
                    { valeur: texteEstimation(o.estimations.realiste) },
                    { libelle: 'Prudent', valeur: texteEstimation(o.estimations.prudent) },
                    { libelle: 'Ambitieux', valeur: texteEstimation(o.estimations.ambitieux) },
                  ]
                : [{ valeur: o.statut === 'pause' ? 'En pause' : '—' }, { libelle: 'Souhaitée', valeur: o.dateCible ? formaterMois(o.dateCible) : 'sans date' }],
            }}
          />

          <div className="mt-5">
            <BarreProgression valeur={o.progression} libelle={`${Math.round(o.progression * 100)} % de la cible`} />
            <p className="mt-2 text-texte-sm text-gris">
              {Math.round(o.progression * 100)} % · {phraseObjectif(o)}
            </p>
          </div>

          {o.atteint && ouvert && (
            <div className="mt-5 rounded-champ bg-positif-fond px-4 py-3 text-texte-sm text-positif">
              <p className="font-semibold">Bravo, la cible est atteinte.</p>
              <p className="mt-1 text-encre-2">Quand tu achètes, marque-le comme réalisé : l’épargne sert à l’achat, sans le compter comme une dépense.</p>
            </div>
          )}
          {leviers.length > 0 && ouvert && (
            <div className="mt-5 rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2">
              <p className="font-semibold">Pour tenir {formaterMois(o.dateCible!)}, deux leviers :</p>
              <ul className="mt-1 list-disc pl-4">
                {leviers.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          )}

          {detail.scenariosCumul && <PlanCumul detail={detail} onCumul={onCumul} calcul={calcul} onVerser={(montant) => ouvrirVersement({ objectifId: o.id, montant })} />}

          <section className="mt-8">
            <TitreSection
              titre="Trajectoire"
              sousTitre={
                <>
                  Le réel en plein, la projection <span className="font-semibold text-encre-2">réaliste</span> hachurée, la cible en pointillé.
                </>
              }
              action={<BadgeNature nature="projete" />}
            />
            <div className="mt-5">
              <GraphiqueTrajectoire points={trajectoire.points} cible={o.montantCible} aujourdhui={trajectoire.aujourdhui} libelle={`Trajectoire de ${o.libelle} : épargné réel et projeté`} />
            </div>
          </section>

          <Separateur className="my-7" />

          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <h3 className="mb-4 text-titre text-encre">Versements</h3>
              <div className="flex flex-col gap-3 rounded-bouton bg-interne p-5 shadow-bouton">
                {detail.versements.length === 0 ? (
                  <p className="text-texte-sm text-gris">Aucun versement noté. {o.montantInitial > 0 && `Déjà mis de côté à la création : ${formaterMontant(o.montantInitial)}.`}</p>
                ) : (
                  <ul className="flex flex-col gap-3" aria-label="Versements">
                    {detail.versements.map((v) => (
                      <li key={v.id} className="flex items-baseline justify-between gap-3 text-texte">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-encre">{LIBELLES_MOUVEMENT[v.type]}</span>
                          <span className="block text-texte-sm text-gris">
                            {formaterDate(v.date)} · {v.compte}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-encre">
                          {v.montant > 0 ? '+' : ''}
                          <Montant valeur={v.montant} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <BlocTotaux
              lignes={[
                { libelle: 'Versement mensuel choisi', valeur: o.versementMensuel ? <Montant valeur={o.versementMensuel} /> : 'aucun', fort: true },
                ...(o.effortMensuel !== null
                  ? [
                      { libelle: `Nécessaire par mois (${o.moisRestants} mois)`, valeur: <Montant valeur={o.effortMensuel} /> },
                      { libelle: 'Nécessaire par semaine', valeur: <Montant valeur={o.effortHebdo ?? 0} /> },
                    ]
                  : []),
                ...(o.versementPrevuCeMois !== null ? [{ libelle: 'Prévu ce mois (projection)', valeur: <Montant valeur={o.versementPrevuCeMois} /> }] : []),
              ]}
              total={{ libelle: 'Restant', valeur: <Montant valeur={o.restant} /> }}
            />
          </div>
        </Carte>
      </motion.div>

      <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
        <Carte titre="Actions">
          <div className="flex flex-col gap-3">
            {ouvert && (
              <Bouton className="w-full" onClick={() => ouvrirVersement({ objectifId: o.id })}>
                Verser
              </Bouton>
            )}
            {ouvert && (
              <Bouton variante="blanc" className="w-full" onClick={() => setDemande('realiser')}>
                Marquer comme réalisé
              </Bouton>
            )}
            {actif && (
              <Link to={`/simulateur?objectif=${o.id}`} className={styleBouton({ variante: 'blanc', className: 'w-full' })}>
                Simuler
              </Link>
            )}
            {o.statut !== 'realise' && (
              <Link to={`/objectifs/${o.id}/modifier`} className={styleBouton({ variante: 'blanc', className: 'w-full' })}>
                Modifier
              </Link>
            )}
            {actif && (
              <Bouton variante="blanc" className="w-full" onClick={() => changer('pause', `« ${o.libelle} » mis en pause.`)}>
                Mettre en pause
              </Bouton>
            )}
            {(o.statut === 'pause' || o.statut === 'abandonne') && (
              <Bouton variante="blanc" className="w-full" onClick={() => changer('actif', `« ${o.libelle} » repris.`)}>
                Reprendre
              </Bouton>
            )}
            {o.statut === 'realise' && (
              <Bouton variante="blanc" className="w-full" onClick={() => changer('actif', `Achat annulé : « ${o.libelle} » est repris avec son épargne.`)}>
                Annuler l’achat
              </Bouton>
            )}
            {ouvert && (
              <Bouton variante="contour" className="w-full" onClick={() => setDemande('abandonner')}>
                Abandonner
              </Bouton>
            )}
            <button type="button" onClick={() => setDemande('supprimer')} className="mt-1 text-texte-sm font-medium text-alerte hover:underline">
              Supprimer l’objectif
            </button>
          </div>
        </Carte>
        {o.risque && (
          <Carte titre="Risque de retard">
            <BadgeRisque risque={o.risque} />
            <p className="mt-3 text-texte-sm text-gris">{RISQUES_PHRASES[o.risque]}</p>
          </Carte>
        )}
        <Carte titre="Sur quoi repose ce calcul ?">
          <ul className="flex list-disc flex-col gap-2 pl-4 text-texte-sm text-gris">
            {(['prudent', 'realiste', 'ambitieux'] as const).map((s) => (
              <li key={s}>
                {SCENARIOS_LIBELLES[s]} : {texteRegle(detail.regles[s])} Capacité ce mois : {formaterMontant(detail.capacite[s])}.
              </li>
            ))}
            <li>Le versement choisi passe d’abord, puis ce qui reste va aux objectifs par priorité.</li>
          </ul>
        </Carte>
      </motion.div>

      <PanneauRealisation detail={detail} ouvert={demande === 'realiser'} onFermer={() => setDemande(null)} aujourdhui={aujourdhui} />
      <Confirmation
        ouvert={demande === 'abandonner'}
        onFermer={() => setDemande(null)}
        titre={`Abandonner « ${o.libelle} » ?`}
        description={`Ses ${formaterMontant(o.epargne)} ne seront plus réservés : ils redeviennent disponibles dans ton épargne. Tu pourras le reprendre.`}
        libelleConfirmer="Abandonner"
        ton="principal"
        chargement={statut.isPending}
        onConfirmer={() => changer('abandonne', `« ${o.libelle} » abandonné.`)}
      />
      <Confirmation
        ouvert={demande === 'supprimer'}
        onFermer={() => setDemande(null)}
        titre={`Supprimer « ${o.libelle} » ?`}
        description="L’objectif disparaît. Ses versements restent dans ton épargne, en épargne libre."
        libelleConfirmer="Supprimer"
        chargement={supprimer.isPending}
        onConfirmer={() =>
          supprimer.mutate(o.id, {
            onSuccess: () => {
              toast(`« ${o.libelle} » supprimé.`)
              navigate('/objectifs')
            },
            onError: (e) => toast(e instanceof ErreurApi ? e.message : 'La suppression n’a pas abouti.'),
          })
        }
      />
    </div>
  )
}

/** Achat réalisé (R19) : l'épargné sort du compte choisi à la date de l'achat, sans dépense. */
function PanneauRealisation({ detail, ouvert, onFermer, aujourdhui }: { detail: ObjectifDetailDto; ouvert: boolean; onFermer: () => void; aujourdhui: string }) {
  const realiser = useRealiserObjectif()
  const { objectif: o, comptes } = detail
  const [date, setDate] = useState(dateDuJour())
  const [compteId, setCompteId] = useState(comptes[0]?.id ?? '')
  const [erreur, setErreur] = useState<string | null>(null)

  function soumettre(e: FormEvent) {
    e.preventDefault()
    if (date > aujourdhui) return setErreur('Un achat réalisé ne peut pas être dans le futur.')
    realiser.mutate(
      { id: o.id, date, compteId },
      {
        onSuccess: () => {
          toast(`« ${o.libelle} » réalisé. ${formaterMontant(o.epargne)} ont servi à l’achat.`)
          onFermer()
        },
        onError: (e) => setErreur(e instanceof ErreurApi ? e.message : 'Erreur inattendue. Réessaie.'),
      },
    )
  }

  return (
    <Panneau ouvert={ouvert} onFermer={onFermer} titre={`Réaliser « ${o.libelle} »`} description="L’épargne de l’objectif sert à l’achat. Ce n’est pas une dépense : elle n’est comptée qu’une fois.">
      {comptes.length === 0 ? (
        <div className="rounded-bouton bg-interne p-5">
          <p className="text-texte font-medium text-encre">Aucun compte d’épargne.</p>
          <p className="mt-2 text-texte-sm text-gris">L’argent de l’achat sort d’un compte : déclare d’abord ton épargne.</p>
          <Link to="/plan?onglet=epargne" className={styleBouton({ taille: 'sm', className: 'mt-4' })}>
            Ajouter un compte
          </Link>
        </div>
      ) : (
        <form onSubmit={soumettre} noValidate className="flex flex-col gap-5">
          <p className="rounded-champ bg-teinte px-4 py-3 text-texte-sm text-encre-2">
            <Montant valeur={o.epargne} className="font-semibold" /> sortent de ton épargne{o.atteint ? '.' : ` (la cible de ${formaterMontant(o.montantCible)} n’était pas atteinte).`}
          </p>
          <Champ libelle="Date de l’achat" type="date" max={aujourdhui} value={date} onChange={(e) => setDate(e.target.value)} />
          {comptes.length > 1 && (
            <Selection libelle="Compte" value={compteId} onChange={(e) => setCompteId(e.target.value)}>
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </Selection>
          )}
          {erreur && (
            <p role="alert" className="text-texte-sm font-medium text-alerte">
              {erreur}
            </p>
          )}
          <Bouton type="submit" taille="lg" className="w-full" chargement={realiser.isPending}>
            Marquer comme réalisé
          </Bouton>
        </form>
      )}
    </Panneau>
  )
}
