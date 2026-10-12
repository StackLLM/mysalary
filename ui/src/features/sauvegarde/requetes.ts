import type { ExportCompte, ResultatImportCompte, Utilisateur } from '@mysalary/partage'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { CLE_SESSION } from '../compte/requetes'
import { nomFichierExport, telecharger } from './saisie'

/** Télécharge toutes les données du compte connecté en JSON. */
export function useExporterCompte() {
  return useMutation({
    mutationFn: async (utilisateur: Utilisateur) => {
      const donnees = await api.lire<ExportCompte>('/compte/export')
      telecharger(nomFichierExport(utilisateur.prenom, new Date().toISOString().slice(0, 10)), JSON.stringify(donnees, null, 2))
    },
    onSuccess: () => toast('Export téléchargé.'),
    onError: () => toast('L’export a échoué. Réessaie.'),
  })
}

/** Restaure un export dans le compte connecté (vide). Tout ce qui était affiché est à recharger. */
export function useRestaurerCompte() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (fichier: unknown) => api.creer<ResultatImportCompte>('/compte/restauration', fichier),
    onSuccess: ({ utilisateur }) => {
      client.setQueryData(CLE_SESSION, utilisateur)
      return client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== CLE_SESSION[0] })
    },
  })
}

/** Vide le compte (mot de passe exigé) et le remet à la mise en route. Tout ce qui était affiché est à recharger. */
export function useReinitialiserCompte() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (motDePasse: string) => api.creer<Utilisateur>('/compte/reinitialisation', { motDePasse }),
    onSuccess: (u) => {
      client.setQueryData(CLE_SESSION, u)
      return client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== CLE_SESSION[0] })
    },
  })
}
