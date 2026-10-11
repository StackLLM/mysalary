import type { ExportCompte, ResultatImportCompte, Utilisateur } from '@mysalary/partage'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { CLE_UTILISATEURS } from '../profils/requetes'
import { nomFichierExport, telecharger } from './saisie'

/** Télécharge toutes les données d'un compte en JSON. */
export function useExporterCompte() {
  return useMutation({
    mutationFn: async (utilisateur: Utilisateur) => {
      const donnees = await api.lire<ExportCompte>(`/utilisateurs/${utilisateur.id}/export`)
      telecharger(nomFichierExport(utilisateur.prenom, new Date().toISOString().slice(0, 10)), JSON.stringify(donnees, null, 2))
    },
    onSuccess: () => toast('Export téléchargé.'),
    onError: () => toast('L’export a échoué. Réessaie.'),
  })
}

/** Crée un nouveau compte à partir d'un export. */
export function useImporterCompte() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (fichier: unknown) => api.creer<ResultatImportCompte>('/utilisateurs/import', fichier),
    onSuccess: () => client.invalidateQueries({ queryKey: CLE_UTILISATEURS }),
  })
}

/** Vide le compte et le remet à la mise en route. Tout ce qui était affiché est à recharger. */
export function useReinitialiserCompte() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (utilisateur: Utilisateur) => api.creer<Utilisateur>(`/utilisateurs/${utilisateur.id}/reinitialiser`, {}),
    onSuccess: () => client.invalidateQueries(),
  })
}
