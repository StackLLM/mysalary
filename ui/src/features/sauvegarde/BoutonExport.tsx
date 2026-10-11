import type { Utilisateur } from '@mysalary/partage'
import { Download } from 'lucide-react'
import { Bouton } from '../../components/Bouton'
import { useExporterCompte } from './requetes'

/** Télécharge les données du compte (JSON). Proposé avant toute suppression ou réinitialisation. */
export function BoutonExport({ utilisateur, className }: { utilisateur: Utilisateur; className?: string }) {
  const exporter = useExporterCompte()
  return (
    <Bouton variante="contour" taille="md" className={className} chargement={exporter.isPending} onClick={() => exporter.mutate(utilisateur)}>
      <Download className="h-4 w-4" aria-hidden />
      Exporter mes données
    </Bouton>
  )
}
