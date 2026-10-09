import type { ModePeriode, ModificationReglages, Reglages } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { Cellule, Champ } from '../../components/Champ'
import { Identite, Interrupteur } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { dateCourte } from '../../lib/dates'
import { useCompte } from '../../state/compte'
import { useRenommerUtilisateur, useUtilisateurCourant } from '../profils/requetes'
import { SuppressionCompte } from '../profils/SuppressionCompte'
import { useModifierReglages, useReglages } from './requetes'

const MODES: { valeur: ModePeriode; titre: string; description: string }[] = [
  {
    valeur: 'cyclePaie',
    titre: 'Cycle de paie',
    description: 'Le mois commence le jour de ta paie. Exemple : la paie du 27 janvier finance février.',
  },
  { valeur: 'calendaire', titre: 'Mois calendaire', description: 'Du 1er au dernier jour du mois. Pour une paie versée le 1er.' },
]

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/** Écran Réglages (UX.md § 5.12) : chaque changement s'enregistre seul, avec « Annuler ». */
export function PageReglages() {
  const utilisateur = useUtilisateurCourant()
  const reglages = useReglages()
  const modifier = useModifierReglages()

  function changer(modif: ModificationReglages, message: string) {
    const avant = reglages.data
    if (!avant) return
    const retour = Object.fromEntries(Object.keys(modif).map((k) => [k, avant[k as keyof Reglages]])) as ModificationReglages
    modifier.mutate(modif, {
      onSuccess: () => toast(message, { action: { label: 'Annuler', onClick: () => modifier.mutate(retour) } }),
      onError: () => toast('Le réglage n’a pas été enregistré. Réessaie.'),
    })
  }

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Réglages' }]} detail={utilisateur?.prenom} />
      </motion.div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
        <motion.div variants={elementApparition} className="min-w-0">
          <Carte espacement="large">
            {reglages.isPending || !utilisateur ? (
              <div className="flex flex-col gap-4" aria-label="Chargement des réglages">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-bouton bg-teinte" />
                ))}
              </div>
            ) : reglages.isError ? (
              <div className="rounded-bouton bg-alerte-fond p-5">
                <p className="text-texte font-medium text-alerte">Impossible de charger tes réglages.</p>
                <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void reglages.refetch()}>
                  Réessayer
                </Bouton>
              </div>
            ) : (
              <>
                <Section titre="Profil" sousTitre="Ton prénom et la devise de tes montants.">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <ChampPrenom id={utilisateur.id} prenom={utilisateur.prenom} />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-texte-sm text-gris">Devise</span>
                      <Cellule>{utilisateur.devise}</Cellule>
                      <span className="text-mention text-gris">Fixée à la création du compte.</span>
                    </div>
                  </div>
                </Section>

                <Separateur className="my-7" />

                <Section
                  titre="Mois budgétaire"
                  sousTitre={
                    <>
                      Comment MySalary découpe tes <span className="font-semibold text-encre-2">mois</span>.
                    </>
                  }
                >
                  <div role="radiogroup" aria-label="Mode de période" className="grid gap-3 sm:grid-cols-2">
                    {MODES.map((m) => {
                      const actif = reglages.data.modePeriode === m.valeur
                      return (
                        <button
                          key={m.valeur}
                          type="button"
                          role="radio"
                          aria-checked={actif}
                          onClick={() => !actif && changer({ modePeriode: m.valeur }, `Mode « ${m.titre} » choisi.`)}
                          className={cn(
                            'flex flex-col gap-1 rounded-bouton border p-4 text-left transition-colors',
                            actif ? 'border-primaire bg-teinte' : 'border-filet bg-white hover:border-filet-fort',
                          )}
                        >
                          <span className="flex items-center gap-2 text-texte font-semibold text-encre">
                            <span
                              className={cn('grid h-4 w-4 place-items-center rounded-pilule border-2', actif ? 'border-primaire' : 'border-filet-fort')}
                              aria-hidden
                            >
                              {actif && <span className="h-1.5 w-1.5 rounded-pilule bg-primaire" />}
                            </span>
                            {m.titre}
                            {m.valeur === 'cyclePaie' && <span className="text-mention font-medium text-gris">recommandé</span>}
                          </span>
                          <span className="pl-6 text-texte-sm text-gris">{m.description}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-mention text-gris">Le jour de paie se règlera dans « Mon plan › Salaire ».</p>
                </Section>

                <Separateur className="my-7" />

                <Section titre="Semaine" sousTitre="Pour le suivi semaine par semaine.">
                  <div className="flex flex-col gap-5">
                    <label className="flex flex-col gap-1.5 sm:max-w-xs">
                      <span className="text-texte-sm text-gris">La semaine commence le</span>
                      <select
                        value={reglages.data.debutSemaine}
                        onChange={(e) => changer({ debutSemaine: Number(e.target.value) }, 'Début de semaine enregistré.')}
                        className="h-[46px] rounded-champ border border-filet bg-white px-4 text-texte font-medium text-encre hover:border-filet-fort focus:border-primaire focus:shadow-focus focus:outline-none"
                      >
                        {JOURS.map((j, i) => (
                          <option key={j} value={i + 1}>
                            {j}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Interrupteur
                      libelle="Reporter le reste d’une semaine sur la suivante"
                      actif={reglages.data.reportHebdo}
                      onChange={(v) => changer({ reportHebdo: v }, v ? 'Report activé.' : 'Report désactivé.')}
                    />
                  </div>
                </Section>

                <Separateur className="my-7" />

                <Section titre="Scénarios" sousTitre="Ce que chaque scénario retient pour les projections (objectifs, simulateur).">
                  <ReglesScenarios regles={reglages.data.reglesScenarios} onChange={(r, message) => changer({ reglesScenarios: r }, message)} />
                </Section>

                <Separateur className="my-7" />

                <Section titre="Affichage">
                  <Interrupteur
                    libelle="Animations"
                    actif={reglages.data.animations}
                    onChange={(v) => changer({ animations: v }, v ? 'Animations activées.' : 'Animations coupées.')}
                  />
                </Section>
              </>
            )}
          </Carte>
        </motion.div>

        <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
          {utilisateur && <CarteCompte />}
        </motion.div>
      </div>
    </motion.div>
  )
}

function Section({ titre, sousTitre, children }: { titre: string; sousTitre?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <TitreSection titre={titre} sousTitre={sousTitre} />
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Prénom : enregistré quand on quitte le champ ou qu'on appuie sur Entrée. */
function ChampPrenom({ id, prenom }: { id: string; prenom: string }) {
  const renommer = useRenommerUtilisateur()
  const [valeur, setValeur] = useState(prenom)
  const [erreur, setErreur] = useState<string>()

  function enregistrer() {
    if (valeur.trim() === prenom) return
    renommer.mutate(
      { id, prenom: valeur },
      {
        onSuccess: (u) => {
          setErreur(undefined)
          setValeur(u.prenom)
          toast('Prénom enregistré.', { action: { label: 'Annuler', onClick: () => renommer.mutate({ id, prenom }) } })
        },
        onError: (e) => setErreur(e instanceof ErreurApi ? (e.champs?.prenom ?? e.message) : 'Erreur inattendue.'),
      },
    )
  }

  return (
    <Champ
      libelle="Prénom"
      value={valeur}
      onChange={(e) => setValeur(e.target.value)}
      onBlur={enregistrer}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      erreur={erreur}
      autoComplete="given-name"
    />
  )
}

function CarteCompte() {
  const utilisateur = useUtilisateurCourant()
  const compte = useCompte()
  const naviguer = useNavigate()
  const [confirmer, setConfirmer] = useState(false)
  if (!utilisateur) return null

  return (
    <>
      <Carte titre="Compte">
        <Identite
          initiale={utilisateur.prenom.charAt(0).toUpperCase()}
          nom={utilisateur.prenom}
          detail={`Créé le ${dateCourte(utilisateur.creeLe)}`}
        />
        <Separateur className="my-5" />
        <p className="text-texte-sm text-gris">Tes données restent sur cet ordinateur et sont séparées de celles des autres comptes.</p>
        <Bouton
          variante="teinte"
          taille="md"
          className="mt-6 w-full"
          onClick={() => {
            compte.quitter()
            naviguer('/profils')
          }}
        >
          Changer de compte
        </Bouton>
      </Carte>

      <Carte titre="Zone sensible">
        <p className="text-texte-sm text-gris">La suppression efface définitivement toutes les données de ce compte.</p>
        <Bouton variante="danger" taille="md" className="mt-5 w-full" onClick={() => setConfirmer(true)}>
          Supprimer ce compte
        </Bouton>
      </Carte>

      <SuppressionCompte utilisateur={confirmer ? utilisateur : null} onFermer={() => setConfirmer(false)} onSupprime={() => naviguer('/profils')} />
    </>
  )
}

const NOMS_SCENARIOS = { prudent: 'Prudent', realiste: 'Réaliste', ambitieux: 'Ambitieux' } as const

/** Règles des scénarios (Plan.md § 7.3, UX.md § 5.12) : revenus retenus et dépenses flexibles. Les revenus garantis comptent toujours. */
function ReglesScenarios({ regles, onChange }: { regles: Reglages['reglesScenarios']; onChange: (r: Reglages['reglesScenarios'], message: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {(['prudent', 'realiste', 'ambitieux'] as const).map((s) => {
        const r = regles[s]
        const basculer = (certitude: 'probable' | 'incertain', oui: boolean) =>
          onChange(
            { ...regles, [s]: { ...r, revenus: oui ? [...r.revenus, certitude] : r.revenus.filter((c) => c !== certitude) } },
            `${NOMS_SCENARIOS[s]} : revenus ${certitude === 'probable' ? 'probables' : 'incertains'} ${oui ? 'retenus' : 'écartés'}.`,
          )
        return (
          <fieldset key={s} className="rounded-bouton border border-filet p-4">
            <legend className="px-1 text-texte font-semibold text-encre">{NOMS_SCENARIOS[s]}</legend>
            <p className="text-texte-sm text-gris">Revenus garantis : toujours retenus.</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-texte-sm text-encre">
              {(['probable', 'incertain'] as const).map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-[#7D8C82]" checked={r.revenus.includes(c)} onChange={(e) => basculer(c, e.target.checked)} />
                  Revenus {c === 'probable' ? 'probables' : 'incertains'}
                </label>
              ))}
            </div>
            <div className="mt-3">
              <Interrupteur
                libelle="Dépenses flexibles : moyenne réelle des 3 derniers mois si plus élevée"
                actif={r.flexibleMoyenne}
                onChange={(v) => onChange({ ...regles, [s]: { ...r, flexibleMoyenne: v } }, `${NOMS_SCENARIOS[s]} : ${v ? 'moyenne réelle des dépenses flexibles' : 'dépenses flexibles prévues'}.`)}
              />
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
