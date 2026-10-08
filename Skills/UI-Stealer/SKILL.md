---
name: melko-ui-from-image
description: >
  Use when the user gives a UI reference image (mockup, screenshot, Figma/template
  export) plus a short go-ahead ("go", "fais le", "construis", "vas-y") to build a
  front-end — or asks for a "boilerplate UI", a NotebookLM-like app, or to
  clone/reproduce a design "identique à l'image" in the Melko house style.
  The reference image(s) are normally dropped in a `Template/` folder at the project
  ROOT (not attached in chat) — this skill looks there first. Triggers: a design image
  in Template/ + a build command ("go"), "même que l'image", scaffolding a Vite/React
  interface from a screenshot for the Melko team. French project.
---

# Melko · construire une UI depuis une image

## Principe
Entrée = **une (ou plusieurs) image(s) de design déposée(s) dans `Template/` à la
racine du projet + un « go »**. Sortie = le front, **directement**, **sans reposer de
questions** (les choix sont déjà tranchés ci-dessous) et **sans blabla**. On reproduit
la **structure / le layout de l'image**, mais **habillé à la charte Melko** — jamais la
palette d'origine de l'image. Objectif de rendu : **premium, vivant, clean, transitions
douces sans à-coup**.

## Où est l'image : dossier `Template/` à la racine
Le user **ne colle pas l'image dans la conversation** : il la dépose dans un dossier
**`Template/`** à la racine du projet. Sur « go » :
1. **Lister `<racine>/Template/`** et lire chaque image (`Read` sur les `.png/.jpg/.jpeg/
   .webp`). Fallbacks si `Template/` est vide/absent : images à la racine, ou dossier
   `design/` ou `charte-melko/`.
2. **Chaque image = un écran / un état** à reproduire (ex. `accueil.png`, `chat.png`).
   Nommage libre ; se fier au contenu de l'image, pas au nom.
3. Si **aucune** image trouvée nulle part → là seulement, demander où elle est. Sinon,
   ne pas demander : prendre les images de `Template/` et construire.
4. `Template/` est un **dossier d'entrée de design** : le versionner s'il contient des
   refs utiles et légères ; sinon l'exclure du git (ne pas committer des originaux
   lourds).

## Sur « go » : on exécute, on ne discute pas
- Ne PAS re-demander ce qui est déjà tranché. Défauts fermes :
  - **Palette = charte Melko** (Encre/Papier/Forêt/Saphir), pas les couleurs de l'image.
  - **Étendue = accueil + vue conversation/chat** si c'est une app Q&A / NotebookLM-like.
  - **Stack + arborescence maison**, **français partout**.
- Seule exception au « pas de questions » : un choix vraiment bloquant et non
  déductible. Sinon : prendre le défaut recommandé et avancer.
- **Adapter le CONTENU** (textes, cartes, pills) au produit ; **garder la STRUCTURE**
  de l'image.

## Critères non négociables (déjà exprimés — ne plus les redemander)
- **Charte Melko**, pas la palette de l'image. Typo Inter + Instrument Serif (titres
  mixtes serif italique + sans gras).
- **Vivant mais doux** : entrée en cascade (framer-motion), flottements légers, blobs
  d'ambiance lents, hover qui soulève, transition de vue en fondu/spring. **Aucun
  choc/instantané** entre les onglets. Toujours un **bouton « animations off »** +
  respect de `prefers-reduced-motion`.
- **Fenêtre = grand rectangle** centré, **marges gauche/droite généreuses**.
- **Rail latéral en verre = couche ARRIÈRE translucide posée sur le fond** (le fond
  transparaît → effet verre), avec la **carte blanche DEVANT qui la chevauche**.
  ⚠️ Ne JAMAIS mettre un rail translucide *dans* la carte blanche (ça ne paraît pas
  transparent). Icônes en **pastilles claires**, glyphes de l'image.
- **Champ de question premium** : liseré dégradé Forêt→Saphir qui s'illumine au focus,
  ombre profonde, **bouton d'envoi en dégradé**, **micro en cercle contour** (pas
  plein), « + » + séparateur vertical. **Ancré en bas** de l'espace (`mt-auto`), pas
  centré.
- **Mascotte / illustration** : si le user fournit un asset (EPS/JPG/PNG/SVG),
  **L'UTILISER** — ne pas redessiner. L'optimiser (sharp : trim du blanc + resize
  ~1000px + WebP ~30 Ko) et l'afficher en `<img>` avec **`mix-blend-multiply`** (efface
  le fond blanc sur n'importe quel fond). **Statique** par défaut. La placer pour
  qu'elle **repose/touche une carte** si l'image le montre.
- **Bulles / labels ne cachent JAMAIS un visage** : les poser entièrement à côté du
  sujet (`right-full`), pas par-dessus.
- **Français partout** ; fichiers et composants en PascalCase, nommage FR
  (`BarreLaterale`, `ZoneHeros`, `Composeur`…), comme le repo `melko_news`.

## Déroulé (tout le copier-coller est dans references/)
1. **Arborescence + config maison** → `references/boilerplate.md`
2. **Charte** (tokens Tailwind + `index.css` + fonts + contexte animations) → `references/boilerplate.md`
3. **Écran d'accueil** (héros + mascotte, cartes, composer, pills) **+ vue conversation**
   (bulles Q/R, sources citées, indicateur réflexion) → `references/recettes-ui.md`
4. **Mascotte depuis l'asset fourni** → `references/recettes-ui.md`
5. **Scripts start/stop/deploy + Docker** → `references/boilerplate.md`
6. **Vérifier** : `npx tsc --noEmit` · `npx vitest run` · `npm run build` — tout passe.

## Pièges & livraison → `references/pieges-et-livraison.md`
- **Ne PAS se fier aux captures d'écran** : l'outil de capture du navigateur intégré
  **fige** sur les animations infinies / WebGL. Vérifier par **DOM + styles calculés +
  build + tests**, et dire au user de regarder en direct.
- **`.bat` Windows** : jamais de `(` `)` dans un `echo` à l'intérieur d'un bloc
  `if (...)` → cmd casse (`... était inattendu`). Utiliser des `if` sur **une seule
  ligne**.
- Environnement **Windows / PowerShell** : syntaxe PS, pas de bash-ismes.
- **Ports Melko** : prendre le créneau libre suivant (`600x` UI / `300x` back /
  `610x` prod). AskMe = 6009/3009/6109.
- **GitHub** : deux remotes (perso `oa-melko` + org `Melko-energie`), gitignore les gros
  assets sources. **Partage réseau** : `host: true` + IP LAN + règle pare-feu.

## Erreurs déjà commises — à ne pas refaire
| Erreur | Correctif |
|--------|-----------|
| Rail translucide mis DANS la carte blanche | Le sortir en couche arrière sur le fond, carte blanche qui chevauche |
| Robot dessiné à la main alors qu'un asset était fourni | Utiliser l'asset (sharp + `mix-blend-multiply`) |
| Bulle par-dessus le visage de la mascotte | La poser entièrement à gauche (`right-full`) |
| Champ de saisie « banal », centré, vide en dessous | Composer premium (dégradé + glow) ancré en bas (`mt-auto`) |
| Relancer des captures qui timeout | Vérifier via DOM/styles calculés/build/tests |
| `echo (6109)` dans un bloc `if ( )` du .bat | `if` sur une ligne, échos sans parenthèses |
| Reposer des questions déjà tranchées | Appliquer les défauts et avancer |
