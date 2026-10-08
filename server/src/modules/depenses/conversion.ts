import { centimes, lireDate, type Depense } from '@mysalary/moteur'
import type { Depense as LigneDepense } from '@prisma/client'

/** Ligne de la base → dépense du moteur. */
export function versDepense(l: LigneDepense): Depense {
  return {
    id: l.id,
    date: lireDate(l.date),
    montant: centimes(l.montant),
    categorieId: l.categorieId,
    libelle: l.libelle,
    chargeId: l.chargeId,
    echeance: l.echeance ? lireDate(l.echeance) : null,
    ponctuelId: l.ponctuelId,
  }
}
