import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BadgeExemple, BadgeNature, BadgeRisque } from '../../components/Badges'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton } from '../../components/Bouton'
import { Carte, Separateur, TitreSection } from '../../components/Carte'
import { CarteBandeau } from '../../components/CarteBandeau'
import { Cellule, Champ, ChampMontant } from '../../components/Champ'
import { BlocTotaux, BoutonFlottant, Identite, Interrupteur, Paire, Pastille } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { GraphiqueFlux } from '../../components/graphiques/GraphiqueFlux'
import { GraphiqueTrajectoire } from '../../components/graphiques/GraphiqueTrajectoire'
import { IconeOeil, IconePlusRond, IconeReglerFiltre, IconeTelecharger, IconeVerifie } from '../../components/icones'
import { Kpi } from '../../components/Kpi'
import { Montant } from '../../components/Montant'
import { Onglets } from '../../components/Onglets'
import { Panneau } from '../../components/Panneau'
import { Pilule } from '../../components/Pilule'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { cn } from '../../lib/cn'
import { fluxExemple, lignesMoisExemple, totauxMoisExemple, trajectoireExemple } from './donneesExemple'

const COLONNES = 'grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_28px] items-center gap-3 sm:gap-5'

/**
 * Vitrine du lot 2 : l'écran du template (Templates/image.png) reproduit à l'identique,
 * avec un contenu MySalary. Toutes les données sont des exemples.
 */
export function PageVitrine() {
  const [panneau, setPanneau] = useState(false)
  const [report, setReport] = useState(false)
  const [onglet, setOnglet] = useState('ensemble')
  const [filtre, setFiltre] = useState('tout')

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane
          etapes={[{ libelle: 'Mois', chemin: '/mois' }, { libelle: 'février 2027' }]}
          detail="27 janv. → 26 févr."
          action={
            <Bouton variante="menu" taille="menu">
              Gérer le mois <ChevronDown className="h-4 w-4" />
            </Bouton>
          }
        />
      </motion.div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
        {/* Colonne principale : la carte « facture » du template */}
        <motion.div variants={elementApparition} className="min-w-0">
          <Carte espacement="large">
            <div className="flex flex-col justify-between gap-5 sm:flex-row">
              <Identite initiale="O" nom="Oussama" detail="Salaire versé le 27 de chaque mois" />
              <div className="flex flex-col gap-1 text-texte text-gris sm:items-end sm:text-right">
                <BadgeExemple className="mb-1 self-start sm:self-end" />
                <span>Mois budgétaire de paie à paie</span>
                <span>27 janv. 2027 → 26 févr. 2027</span>
                <span>30 jours</span>
              </div>
            </div>

            <CarteBandeau
              className="mt-7"
              gauche={{
                titre: 'Mois budgétaire',
                lignes: [{ valeur: 'Février 2027' }, { libelle: 'Début', valeur: '27 janv. 2027' }, { libelle: 'Fin', valeur: '26 févr. 2027' }],
              }}
              droite={{
                titre: 'Paie reçue',
                lignes: [
                  { valeur: <Montant valeur={1_000_000} /> },
                  { libelle: 'Prime', valeur: <Montant valeur={100_000} /> },
                  { libelle: 'Reçue le', valeur: '27 janv. 2027' },
                ],
              }}
            />

            <div className="mt-7">
              <TitreSection
                titre="Détail du mois"
                sousTitre={
                  <>
                    Prévu et réel pour chaque ligne du <span className="font-semibold text-encre-2">mois</span>.
                  </>
                }
                action={
                  <Bouton variante="puce" taille="sm">
                    <IconeReglerFiltre className="h-4 w-4" /> Personnaliser
                  </Bouton>
                }
              />
            </div>

            <div className="relative -mx-1 mt-5 overflow-x-auto px-1">
              <div className="min-w-[620px]">
                <div className={cn(COLONNES, 'border-y border-filet px-4 py-4 text-texte-sm text-gris')}>
                  <span>Ligne</span>
                  <span>Prévu</span>
                  <span>Réel</span>
                  <span>Écart</span>
                  <span />
                </div>
                <ul className="flex flex-col gap-3 pt-5">
                  {lignesMoisExemple.map((l, i) => (
                    <li key={l.id} className="flex flex-col gap-3">
                      <div className={COLONNES}>
                        <Cellule className="truncate" titre={`${l.libelle} · ${l.categorie}`}>
                          {l.libelle}
                        </Cellule>
                        <Cellule prefixe="DH">
                          <Montant valeur={l.prevu} sansDevise />
                        </Cellule>
                        {l.reel === null ? (
                          <div className="flex h-[46px] items-center">
                            <BadgeNature nature="prevu" />
                          </div>
                        ) : (
                          <Cellule prefixe="DH">
                            <Montant valeur={l.reel} sansDevise />
                          </Cellule>
                        )}
                        <Cellule prefixe="DH" attenue={l.ecart === null || l.ecart === 0}>
                          {l.ecart === null ? '—' : <Montant valeur={l.ecart} sansDevise className={cn(l.ecart < 0 && 'text-alerte')} />}
                        </Cellule>
                        {i === lignesMoisExemple.length - 1 ? (
                          <button type="button" aria-label="Ajouter une ligne" onClick={() => setPanneau(true)} className="text-primaire hover:text-primaire-survol">
                            <IconePlusRond className="h-[26px] w-[26px]" />
                          </button>
                        ) : (
                          <span />
                        )}
                      </div>
                      {i === 0 && (
                        <div className={COLONNES}>
                          <Champ libelle="Note sur le salaire" libelleMasque placeholder="Note" />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Separateur className="my-7" />

            <div className="grid gap-8 md:grid-cols-2 md:gap-12">
              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-titre text-encre">Épargne du mois</h3>
                  <Bouton variante="lien" taille="texte">
                    Choisir un objectif
                  </Bouton>
                </div>
                <div className="flex flex-col gap-3 rounded-bouton bg-interne p-5 shadow-bouton">
                  <div className="flex items-center justify-between">
                    <span className="text-texte font-medium text-encre">Objectif moto</span>
                    <BadgeRisque risque="probable" />
                  </div>
                  <Paire cle="Cible" valeur={<Montant valeur={8_500_000} />} />
                  <Paire cle="Déjà épargné" valeur={<Montant valeur={2_550_000} />} />
                  <Paire cle="Versement du mois" valeur={<Montant valeur={400_000} />} />
                </div>
              </div>
              <BlocTotaux
                lignes={[
                  { libelle: 'Revenus', valeur: <Montant valeur={totauxMoisExemple.revenus} />, fort: true },
                  { libelle: 'Dépenses', valeur: <Montant valeur={totauxMoisExemple.depenses} /> },
                  { libelle: 'Épargne', valeur: <Montant valeur={totauxMoisExemple.epargne} /> },
                ]}
                total={{ libelle: 'Reste du mois', valeur: <Montant valeur={totauxMoisExemple.reste} /> }}
              />
            </div>
          </Carte>
        </motion.div>

        {/* Colonne latérale du template */}
        <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
          <Carte titre="Objectif prioritaire" menu>
            <Identite initiale="M" nom="Moto" detail="Cible : juillet 2027" />
            <Separateur className="my-5" />
            <div className="flex items-center gap-1.5 text-texte font-medium text-encre">
              Épargne réservée <IconeVerifie className="h-4 w-4 text-info" />
            </div>
            <p className="mt-1 text-texte text-gris">25 500 DH sur 85 000 DH · 30 %</p>
            <BarreProgression className="mt-4" valeur={0.3} projection={0.25} rythme={0.42} libelle="Progression de l’objectif moto" />
            <Bouton variante="teinte" taille="md" className="mt-6 w-full">
              Ajouter un versement
            </Bouton>
          </Carte>

          <Carte titre="Reste à dépenser" precision="(MAD)" menu>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-montant text-encre">
                <Montant valeur={418_000} anime />
              </span>
              <span className="text-texte text-gris">(au 7 févr.)</span>
            </div>
            <div className="mt-5">
              <Pastille>Loisirs dépassés de 320 DH</Pastille>
            </div>
            <Separateur className="my-6" />
            <Interrupteur libelle="Reporter le reste sur la semaine suivante" actif={report} onChange={setReport} />
          </Carte>

          <div className="grid grid-cols-2 gap-4">
            <Bouton variante="blanc">
              <IconeOeil className="h-5 w-5" /> Aperçu
            </Bouton>
            <Bouton variante="blanc">
              <IconeTelecharger className="h-5 w-5" /> Exporter
            </Bouton>
          </div>
          <Bouton className="w-full" onClick={() => setPanneau(true)}>
            Ajouter une dépense
          </Bouton>
        </motion.div>
      </div>

      {/* Autres composants, dans le même style */}
      <motion.section variants={elementApparition} className="mt-14 flex flex-col gap-8">
        <div>
          <h2 className="text-titre text-encre">Autres composants</h2>
          <p className="mt-1 text-texte-sm text-gris">Mêmes cartes, mêmes boutons, mêmes champs que l’écran ci-dessus.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 [&>*]:min-w-0">
          <Carte titre="Trajectoire de l’objectif moto" action={<BadgeExemple />}>
            <GraphiqueTrajectoire points={trajectoireExemple} cible={8_500_000} aujourdhui="janv." libelle="Épargne cumulée vers l’objectif moto, réel puis projection (exemple)" />
          </Carte>
          <Carte titre="Revenus, dépenses, épargne" action={<BadgeExemple />}>
            <GraphiqueFlux points={fluxExemple} libelle="Revenus, dépenses et épargne par mois (exemple)" />
          </Carte>
        </div>

        <Carte titre="Indicateurs" action={<BadgeExemple />}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi libelle="Taux d’épargne" valeur="36 %" comparaison="+4 pts vs prévu" tendance="favorable" />
            <Kpi libelle="Taux de charges" valeur="26 %" comparaison="stable" />
            <Kpi libelle="Écart du mois" valeur={<Montant valeur={-32_000} />} comparaison="Loisirs au-dessus du prévu" tendance="defavorable" />
            <Kpi libelle="Délai avant objectif" valeur="9 mois" nature="projete" comparaison="1 mois d’avance" tendance="favorable" />
          </div>
        </Carte>

        <div className="grid gap-8 lg:grid-cols-2 [&>*]:min-w-0">
          <Carte titre="Onglets et filtres">
            <Onglets
              valeur={onglet}
              onChange={setOnglet}
              onglets={[
                { valeur: 'ensemble', libelle: 'Vue d’ensemble', contenu: <p className="text-texte-sm text-gris">Contenu de la vue d’ensemble.</p> },
                { valeur: 'semaines', libelle: 'Semaines', contenu: <p className="text-texte-sm text-gris">Contenu des semaines.</p> },
                { valeur: 'depenses', libelle: 'Dépenses', contenu: <p className="text-texte-sm text-gris">Contenu des dépenses.</p> },
              ]}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {['Tout', 'Essentiel', 'Flexible', 'Engagements'].map((f) => (
                <Pilule key={f} active={filtre === f.toLowerCase()} onClick={() => setFiltre(f.toLowerCase())}>
                  {f}
                </Pilule>
              ))}
            </div>
          </Carte>
          <Carte titre="Champs et états">
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampMontant libelle="Montant" placeholder="0" defaultValue="250" />
              <ChampMontant libelle="Montant" defaultValue="-20" erreur="Entre un montant supérieur à 0." />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <BadgeNature nature="prevu" />
              <BadgeNature nature="projete" />
              <BadgeNature nature="importe" />
              <BadgeRisque risque="sur" />
              <BadgeRisque risque="fragile" />
              <BadgeRisque risque="horsPortee" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Bouton
                variante="contour"
                taille="sm"
                onClick={() => toast('Dépense supprimée', { action: { label: 'Annuler', onClick: () => toast('Suppression annulée') } })}
              >
                Toast avec Annuler
              </Bouton>
              <Bouton variante="danger" taille="sm">
                Supprimer
              </Bouton>
              <Bouton taille="sm" chargement>
                Enregistrement
              </Bouton>
            </div>
          </Carte>
        </div>
      </motion.section>

      <BoutonFlottant libelle="Afficher le panneau latéral" />

      <Panneau
        ouvert={panneau}
        onFermer={() => setPanneau(false)}
        titre="Nouvelle dépense"
        description="Exemple de panneau de saisie rapide."
        pied={
          <>
            <Bouton variante="contour" taille="md" onClick={() => setPanneau(false)}>
              Annuler
            </Bouton>
            <Bouton
              taille="md"
              onClick={() => {
                setPanneau(false)
                toast('Dépense ajoutée (exemple)', { action: { label: 'Annuler', onClick: () => undefined } })
              }}
            >
              Ajouter
            </Bouton>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <ChampMontant libelle="Montant" autoFocus placeholder="0" />
          <div className="flex flex-wrap gap-2">
            {['Courses', 'Transport', 'Loisirs', 'Santé'].map((c, i) => (
              <Pilule key={c} active={i === 0}>
                {c}
              </Pilule>
            ))}
          </div>
          <Champ libelle="Note" placeholder="Facultatif" />
        </div>
      </Panneau>
    </motion.div>
  )
}
