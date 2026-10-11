/** « mysalary-oussama-2026-10-12.json » : le prénom sans accent ni espace, puis le jour de l'export. */
export function nomFichierExport(prenom: string, jour: string): string {
  const nom = prenom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `mysalary-${nom || 'compte'}-${jour}.json`
}

/** Fait télécharger `contenu` par le navigateur. */
export function telecharger(nom: string, contenu: string) {
  const adresse = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }))
  const lien = document.createElement('a')
  lien.href = adresse
  lien.download = nom
  document.body.append(lien)
  lien.click()
  lien.remove()
  URL.revokeObjectURL(adresse)
}

/** Lit un fichier d'export choisi par l'utilisateur ; `null` si ce n'est pas du JSON. */
export async function lireFichierJson(fichier: File): Promise<unknown | null> {
  try {
    return JSON.parse(await fichier.text())
  } catch {
    return null
  }
}
