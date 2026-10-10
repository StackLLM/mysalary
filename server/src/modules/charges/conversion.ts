import {
  centimes,
  type AjustementSemaine,
  lireCleMois,
  lireDate,
  type Certitude,
  type Charge,
  type Dette,
  type FrequenceCharge,
  type NatureCharge,
  type PaiementDette,
  type Ponctuel,
} from '@mysalary/moteur'
import type { Charge as LigneCharge, Dette as LigneDette, PaiementDette as LignePaiement, Ponctuel as LignePonctuel } from '@prisma/client'

/** Lignes de la base → objets du moteur. */

export function versCharge(l: LigneCharge): Charge {
  return {
    id: l.id,
    libelle: l.libelle,
    categorieId: l.categorieId,
    nature: l.nature as NatureCharge,
    montant: centimes(l.montant),
    frequence: l.frequence as FrequenceCharge,
    mois: l.mois ? l.mois.split(',').map(Number) : [],
    jour: l.jour,
    debut: lireCleMois(l.debut),
    fin: l.fin ? lireCleMois(l.fin) : null,
    essentielle: l.essentielle,
    unite: l.unite === 'semaine' || l.unite === 'jour' ? l.unite : 'mois',
    rythme: l.rythme === null ? null : centimes(l.rythme),
    semaines: lireAjustements(l.semaines),
  }
}

/** « 2026-10-05:10000;2026-10-12:0 » ↔ montants choisis semaine par semaine. */
export const lireAjustements = (texte: string): AjustementSemaine[] =>
  texte
    ? texte.split(';').map((morceau) => {
        const [debut, montant] = morceau.split(':')
        return { debut: lireDate(debut!), montant: centimes(Number(montant)) }
      })
    : []

export const ecrireAjustements = (liste: { debut: string; montant: number }[]) => liste.map((a) => `${a.debut}:${a.montant}`).join(';')

export function versPonctuel(l: LignePonctuel): Ponctuel {
  return {
    id: l.id,
    libelle: l.libelle,
    categorieId: l.categorieId,
    montant: centimes(l.montant),
    date: lireDate(l.date),
    certitude: l.certitude as Certitude,
  }
}

export function versDette(l: LigneDette): Dette {
  return {
    id: l.id,
    libelle: l.libelle,
    creancier: l.creancier,
    montantTotal: centimes(l.montantTotal),
    mensualite: centimes(l.mensualite),
    premiereEcheance: lireDate(l.premiereEcheance),
  }
}

export function versPaiement(l: LignePaiement): PaiementDette {
  return { id: l.id, detteId: l.detteId, date: lireDate(l.date), montant: centimes(l.montant) }
}
