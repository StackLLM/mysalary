import { Link } from 'react-router-dom'
import { styleBouton } from '../../components/Bouton'
import { Carte } from '../../components/Carte'
import { FilAriane } from '../../components/FilAriane'

/** État vide des pages pas encore construites : dit ce qui manque et propose une suite (UX.md § 8). */
export function PageAVenir({ titre, lot }: { titre: string; lot?: number }) {
  return (
    <>
      <FilAriane etapes={[{ libelle: titre }]} />
      <Carte espacement="large" className="max-w-2xl">
        <h1 className="text-titre text-encre">{lot ? `Cette page arrive au lot ${lot}.` : 'Cette page n’existe pas.'}</h1>
        <p className="mt-2 text-texte text-gris">
          Le design system est prêt. Les écrans se construisent maintenant un par un, avec tes vraies données.
        </p>
        <Link to="/vitrine" className={styleBouton({ variante: 'teinte', taille: 'md', className: 'mt-6' })}>
          Voir la vitrine
        </Link>
      </Carte>
    </>
  )
}
