import { centimes, lireCleMois, lireDate, type CompteEpargne, type MouvementEpargne, type Objectif, type StatutObjectif, type TypeObjectif } from '@mysalary/moteur'
import type { CompteEpargne as LigneCompte, MouvementEpargne as LigneMouvement, Objectif as LigneObjectif } from '@prisma/client'

/** Lignes de la base → objets du moteur. */

export function versCompte(l: LigneCompte): CompteEpargne {
  return { id: l.id, libelle: l.libelle, solde: centimes(l.solde), auLe: lireDate(l.auLe) }
}

export function versMouvement(l: LigneMouvement): MouvementEpargne {
  return {
    id: l.id,
    compteId: l.compteId,
    objectifId: l.objectifId,
    type: l.type as MouvementEpargne['type'],
    date: lireDate(l.date),
    montant: centimes(l.montant),
    libelle: l.libelle,
  }
}

export function versObjectif(l: LigneObjectif): Objectif {
  return {
    id: l.id,
    libelle: l.libelle,
    type: l.type as TypeObjectif,
    montantCible: centimes(l.montantCible),
    montantInitial: centimes(l.montantInitial),
    dateCible: l.dateCible ? lireCleMois(l.dateCible) : null,
    priorite: l.priorite,
    versementMensuel: l.versementMensuel === null ? null : centimes(l.versementMensuel),
    statut: l.statut as StatutObjectif,
    realiseLe: l.realiseLe ? lireDate(l.realiseLe) : null,
    creeLe: lireDate(l.creeLe.toISOString().slice(0, 10)),
  }
}
