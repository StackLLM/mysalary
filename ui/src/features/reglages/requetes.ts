import type { ModificationReglages, Reglages } from '@mysalary/partage'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../profils/requetes'

const cleReglages = (id: string | null) => [CLE_COMPTE, id, 'reglages'] as const

export function useReglages() {
  const { id } = useCompte()
  // Seulement quand le compte retenu existe vraiment : évite une erreur 401 pour un compte supprimé.
  const existe = Boolean(useUtilisateurCourant())
  return useQuery({
    queryKey: cleReglages(id),
    queryFn: () => api.lire<Reglages>('/reglages'),
    enabled: existe,
  })
}

/**
 * Modification avec mise à jour immédiate de l'écran (optimiste) ;
 * en cas d'échec, l'ancienne valeur revient.
 */
export function useModifierReglages() {
  const { id } = useCompte()
  const client = useQueryClient()
  const cle = cleReglages(id)
  return useMutation({
    mutationFn: (modif: ModificationReglages) => api.modifier<Reglages>('/reglages', modif),
    onMutate: async (modif) => {
      await client.cancelQueries({ queryKey: cle })
      const avant = client.getQueryData<Reglages>(cle)
      if (avant) client.setQueryData<Reglages>(cle, { ...avant, ...modif })
      return { avant }
    },
    onError: (_erreur, _modif, contexte) => {
      if (contexte?.avant) client.setQueryData(cle, contexte.avant)
    },
    // Mode de période, début de semaine et report changent le découpage des mois et des semaines.
    onSettled: () => Promise.all([cle, [CLE_COMPTE, id, 'mois'], [CLE_COMPTE, id, 'depenses']].map((queryKey) => client.invalidateQueries({ queryKey }))),
  })
}
