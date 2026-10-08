import {
  centimes,
  lireCleMois,
  lireDate,
  type Certitude,
  type Frequence,
  type RevenuRecu,
  type SourceRevenu,
  type TypeRevenu,
  type Versement,
} from '@mysalary/moteur'
import type { RevenuRecu as LigneRecu, SourceRevenu as LigneSource } from '@prisma/client'

/** Lignes de la base → objets du moteur (montants en centimes, dates civiles vérifiées). */

export function versSource(ligne: LigneSource): SourceRevenu {
  return {
    id: ligne.id,
    libelle: ligne.libelle,
    type: ligne.type as TypeRevenu,
    montant: centimes(ligne.montant),
    frequence: ligne.frequence as Frequence,
    mois: ligne.mois ? ligne.mois.split(',').map(Number) : [],
    versement: ligne.versement as Versement,
    jour: ligne.jour,
    certitude: ligne.certitude as Certitude,
    debut: lireCleMois(ligne.debut),
    fin: ligne.fin ? lireCleMois(ligne.fin) : null,
  }
}

export function versRevenuRecu(ligne: LigneRecu): RevenuRecu {
  return {
    id: ligne.id,
    sourceId: ligne.sourceId,
    moisOccurrence: ligne.moisOccurrence ? lireCleMois(ligne.moisOccurrence) : null,
    date: lireDate(ligne.date),
    montant: centimes(ligne.montant),
    libelle: ligne.libelle,
  }
}
