import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Bouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { FilAriane } from '../../components/FilAriane'
import { Onglets } from '../../components/Onglets'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { useMoisCourant } from '../salaire/requetes'
import { OngletDepenses } from './OngletDepenses'
import { OngletEnsemble } from './OngletEnsemble'
import { useBilan } from './requetes'

const ONGLETS = [
  { valeur: 'ensemble', libelle: 'Vue d’ensemble' },
  { valeur: 'depenses', libelle: 'Dépenses' },
  { valeur: 'semaines', libelle: 'Semaines' },
] as const

/** Mois (UX.md § 5.3) : un mois budgétaire, prévu et réel. Le mois et l'onglet sont gardés dans l'adresse. */
export function PageMois() {
  const [parametres, setParametres] = useSearchParams()
  const courant = useMoisCourant()
  const cle = parametres.get('mois') ?? courant.data?.cle ?? null
  const bilan = useBilan(cle)
  const actif = ONGLETS.find((o) => o.valeur === parametres.get('onglet')) ?? ONGLETS[0]

  const changer = (valeurs: { mois?: string; onglet?: string }) => {
    const suite = { mois: valeurs.mois ?? cle ?? undefined, onglet: valeurs.onglet ?? actif.valeur }
    setParametres(
      Object.fromEntries(Object.entries({ mois: suite.mois, onglet: suite.onglet === 'ensemble' ? undefined : suite.onglet }).filter(([, v]) => v)) as Record<string, string>,
      { replace: valeurs.onglet !== undefined },
    )
  }
  const changerMois = (mois: string) => changer({ mois })

  const chargement = (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12" aria-label="Chargement du mois">
      <div className="h-96 animate-pulse rounded-carte bg-white shadow-carte" />
      <div className="h-64 animate-pulse rounded-carte bg-white shadow-carte" />
    </div>
  )
  const erreur = (
    <Carte espacement="large">
      <div className="rounded-bouton bg-alerte-fond p-5">
        <p className="text-texte font-medium text-alerte">Impossible de charger ce mois.</p>
        <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => [courant, bilan].forEach((q) => void q.refetch())}>
          Réessayer
        </Bouton>
      </div>
    </Carte>
  )

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Mois', chemin: '/mois' }, { libelle: actif.libelle }]} />
      </motion.div>
      <motion.div variants={elementApparition} className="-mt-2">
        <Onglets
          valeur={actif.valeur}
          onChange={(onglet) => changer({ onglet })}
          onglets={ONGLETS.map((o) => ({
            valeur: o.valeur,
            libelle: o.libelle,
            contenu:
              courant.isError || bilan.isError ? (
                erreur
              ) : !cle || bilan.isPending ? (
                chargement
              ) : o.valeur === 'ensemble' ? (
                <OngletEnsemble bilan={bilan.data} changerMois={changerMois} />
              ) : o.valeur === 'depenses' ? (
                <OngletDepenses cle={cle} verrouille={bilan.data.cloture !== null} changerMois={changerMois} />
              ) : (
                <Carte espacement="large" className="max-w-2xl">
                  <h2 className="text-titre text-encre">Cet onglet arrive au lot 9.</h2>
                  <p className="mt-2 text-texte text-gris">Le suivi semaine par semaine (budget flexible, dépensé, reste) se construit au prochain lot.</p>
                </Carte>
              ),
          }))}
        />
      </motion.div>
    </motion.div>
  )
}
