import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { FilAriane } from '../../components/FilAriane'
import { Onglets } from '../../components/Onglets'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { OngletCharges } from '../charges/OngletCharges'
import { OngletDettes } from '../dettes/OngletDettes'
import { OngletEpargne } from '../epargne/OngletEpargne'
import { OngletRevenus } from '../revenus/OngletRevenus'
import { OngletSalaire } from '../salaire/OngletSalaire'

const ONGLETS = [
  { valeur: 'salaire', libelle: 'Salaire & primes' },
  { valeur: 'revenus', libelle: 'Autres revenus' },
  { valeur: 'charges', libelle: 'Charges & enveloppes' },
  { valeur: 'dettes', libelle: 'Dettes' },
  { valeur: 'epargne', libelle: 'Épargne' },
] as const

/** Mon plan (UX.md § 5.11) : ce qui génère le prévu. L'onglet est gardé dans l'adresse. */
export function PagePlan() {
  const [parametres, setParametres] = useSearchParams()
  const actif = ONGLETS.find((o) => o.valeur === parametres.get('onglet')) ?? ONGLETS[0]

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane etapes={[{ libelle: 'Mon plan', chemin: '/plan' }, { libelle: actif.libelle }]} />
      </motion.div>
      <motion.div variants={elementApparition} className="-mt-2">
        <Onglets
          valeur={actif.valeur}
          onChange={(v) => setParametres(v === 'salaire' ? {} : { onglet: v }, { replace: true })}
          onglets={ONGLETS.map((o) => ({
            valeur: o.valeur,
            libelle: o.libelle,
            contenu:
              o.valeur === 'salaire' ? (
                <OngletSalaire />
              ) : o.valeur === 'revenus' ? (
                <OngletRevenus />
              ) : o.valeur === 'charges' ? (
                <OngletCharges />
              ) : o.valeur === 'dettes' ? (
                <OngletDettes />
              ) : (
                <OngletEpargne />
              ),
          }))}
        />
      </motion.div>
    </motion.div>
  )
}
