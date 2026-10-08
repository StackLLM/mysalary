import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Carte } from '../../components/Carte'
import { FilAriane } from '../../components/FilAriane'
import { Onglets } from '../../components/Onglets'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { OngletCharges } from '../charges/OngletCharges'
import { OngletDettes } from '../dettes/OngletDettes'
import { OngletRevenus } from '../revenus/OngletRevenus'
import { OngletSalaire } from '../salaire/OngletSalaire'

const ONGLETS = [
  { valeur: 'salaire', libelle: 'Salaire & primes', lot: 4 },
  { valeur: 'revenus', libelle: 'Autres revenus', lot: 5 },
  { valeur: 'charges', libelle: 'Charges & enveloppes', lot: 6 },
  { valeur: 'dettes', libelle: 'Dettes', lot: 6 },
  { valeur: 'epargne', libelle: 'Épargne', lot: 10 },
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
                <Carte espacement="large" className="max-w-2xl">
                  <h2 className="text-titre text-encre">{`Cet onglet arrive au lot ${o.lot}.`}</h2>
                  <p className="mt-2 text-texte text-gris">Salaire et revenus sont prêts. Les autres parties du plan se construisent lot par lot.</p>
                </Carte>
              ),
          }))}
        />
      </motion.div>
    </motion.div>
  )
}
