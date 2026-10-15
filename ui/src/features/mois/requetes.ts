import type { AnneeDto, BilanDto, CumulDto, SaisieCloture, SemainesDto, SuiviAnnuelDto } from '@mysalary/partage'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useActualiserDonnees } from '../../lib/actualisation'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../compte/requetes'

/** Bilan, clôture et réouverture d'un mois. Clôturer ou rouvrir recalcule aussi les mois et les dépenses. */
function useCles() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return { actif, mois: [CLE_COMPTE, id, 'mois'] as const, depenses: [CLE_COMPTE, id, 'depenses'] as const }
}

export function useBilan(cle: string | null) {
  const { mois, actif } = useCles()
  return useQuery({
    queryKey: [...mois, 'bilan', cle],
    queryFn: () => api.lire<BilanDto>(`/mois/${cle}/bilan`),
    enabled: actif && Boolean(cle),
    placeholderData: keepPreviousData,
  })
}

/** Cumul de mois en mois (lot 13) sur une plage : recalculé dès qu'un mois change. */
export function useCumul(du: string, au: string) {
  const { mois, actif } = useCles()
  return useQuery({
    queryKey: [...mois, 'cumul', du, au],
    queryFn: () => api.lire<CumulDto>(`/cumul?du=${du}&au=${au}`),
    enabled: actif,
    placeholderData: keepPreviousData,
  })
}

export function useSemaines(cle: string | null) {
  const { mois, actif } = useCles()
  return useQuery({
    queryKey: [...mois, 'semaines', cle],
    queryFn: () => api.lire<SemainesDto>(`/mois/${cle}/semaines`),
    enabled: actif && Boolean(cle),
    placeholderData: keepPreviousData,
  })
}

/** Toute écriture recharge toutes les vues du compte (lib/actualisation). */
function useInvalider() {
  return useActualiserDonnees()
}

export function useCloturer() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: ({ cle, ...saisie }: SaisieCloture & { cle: string }) => api.creer<void>(`/mois/${cle}/cloturer`, saisie),
    onSuccess: invalider,
  })
}

export function useRouvrir() {
  const invalider = useInvalider()
  return useMutation({ mutationFn: (cle: string) => api.creer<void>(`/mois/${cle}/rouvrir`, {}), onSuccess: invalider })
}

/** Calendrier de l'année (lot 14) : cumul des 12 mois et revenus / charges datés de chaque jour. */
export function useAnnee(annee: number) {
  const { mois, actif } = useCles()
  return useQuery({
    queryKey: [...mois, 'annee', annee],
    queryFn: () => api.lire<AnneeDto>(`/annee/${annee}`),
    enabled: actif,
    placeholderData: keepPreviousData,
  })
}

/** Suivi annuel (lot 18) : revenus, dépenses, épargne de l'année, mois coûteux, objectifs. */
export function useSuiviAnnuel(annee: number) {
  const { mois, actif } = useCles()
  return useQuery({
    queryKey: [...mois, 'annee', annee, 'suivi'],
    queryFn: () => api.lire<SuiviAnnuelDto>(`/annee/${annee}/suivi`),
    enabled: actif,
    placeholderData: keepPreviousData,
  })
}
