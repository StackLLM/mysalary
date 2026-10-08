import { additionner, centimes } from '@mysalary/moteur'
import type { DetteDto } from '@mysalary/partage'

/** Totaux de toutes les dettes et prochaine échéance attendue, toutes dettes confondues. */
export function totauxDettes(dettes: DetteDto[]) {
  const prochaines = dettes
    .filter((d) => d.etat.prochaine)
    .map((d) => ({ detteId: d.id, libelle: d.libelle, date: d.etat.prochaine!.date, attendu: d.etat.prochaine!.attendu }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return {
    total: additionner(...dettes.map((d) => centimes(d.montantTotal))),
    paye: additionner(...dettes.map((d) => d.etat.paye)),
    restant: additionner(...dettes.map((d) => d.etat.restant)),
    prochaine: prochaines[0] ?? null,
  }
}
