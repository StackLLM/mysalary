# MySalary — UI

> Direction : **l'interface du template `Templates/image.png`, reproduite à l'identique**, avec la sauge **#7D8C82** à la place du violet.
> Méthode : skill **UI-Stealer** — on garde la structure de l'image, on change la palette, on adapte le contenu.
> Thème clair uniquement.
> Révision du 07/10/2026 : la première version (rail en verre, fenêtre, fond nacré, police serif) s'éloignait du template ; elle est abandonnée à ta demande.

---

## 1. Analyse des sources

### 1.1 Méthode

- Template : une capture d'écran (1342 × 958 px), page « Edit invoice » d'une app de facturation. Pas de code source.
- Couleurs relevées au pixel, zone par zone. Tailles mesurées sur la capture à ± 2 px.
- Rendu vérifié côte à côte dans le navigateur, à la même largeur (1342 px), et contrôlé par le DOM (styles calculés).

### 1.2 Template — structure

| Zone | Observation |
|---|---|
| Barre supérieure | Fond blanc, hauteur ≈ 64 px. Logo à gauche, 5 liens icône + texte, à droite 2 boutons ronds (notifications, réglages), séparateur vertical, avatar rond. |
| Onglet actif | Texte couleur principale + trait de 2 px sous l'onglet. |
| Fil d'Ariane | Premier segment en couleur, reste en gris. Bouton d'action à droite dans une carte blanche. |
| Grille | 2 colonnes : principale ≈ 833 px, latérale ≈ 352 px, gouttière ≈ 48 px. Marge latérale ≈ 56 px. |
| Fond de page | `#F9FAFB`. |
| Cartes | Blanches, rayon ≈ 24 px, sans bordure visible, ombre quasi invisible, padding ≈ 28–30 px. |

### 1.3 Template — composants

| Composant | Détail |
|---|---|
| Carte héro | Dégradé violet `#44459D` → `#5959A9`, rayon ≈ 28 px, grands cercles décoratifs plus clairs, texte blanc, ombre colorée diffuse. |
| Gros montant | ≈ 30 px, gras, noir. Unité en gris à côté du titre. |
| Bouton principal | Plein `#3633BF`, texte blanc semi-gras, hauteur ≈ 60 px, rayon ≈ 16 px, pleine largeur. |
| Bouton secondaire | Fond blanc ou teinté `#F4F5FC`, texte couleur principale, icône à gauche. |
| Bouton puce | Fond `#E2E5FD`, rayon ≈ 10 px, icône + texte petit. |
| Pastille d'état | Fond rouge très clair, texte rouge, rayon complet. |
| Champ | Hauteur ≈ 46 px, rayon ≈ 10 px, bordure 1 px très claire, préfixe d'unité gris. |
| Tableau | En-têtes petits, gris, sans majuscules. Filets fins. Pas de zébrage. |
| Totaux | Libellés gris à gauche, montants à droite, total final plus fort après un filet. |
| Menu « … » | Kebab gris en haut à droite des cartes. |

### 1.4 Usage de la skill UI-Stealer

| Principe de la skill | Application |
|---|---|
| Garder la **structure** de l'image | Repris à l'identique : barre du haut, fil d'Ariane, grande carte + colonne latérale, bandeau, tableau en champs, totaux, boutons pleine largeur. |
| Changer la **palette** | Violet → sauge (§ 2). |
| Adapter le **contenu** au produit | La facture devient un **mois budgétaire** (voir la vitrine). |
| Animations douces, bouton « animations off », `prefers-reduced-motion` | Repris (apparition en cascade, transitions de page). Le bouton est dans les Réglages. |
| Vérifier par DOM, styles calculés, build et tests | Repris. |
| Style maison Melko (rail en verre, fenêtre, blobs, Instrument Serif, mascotte) | **Non repris** : absent du template. |

### 1.5 Correspondance template → MySalary

| Élément du template | Couleur d'origine | MySalary |
|---|---|---|
| Bouton « Send Invoice », bouton `+`, soulignement de l'onglet actif, icône active | `#3633BF` | **`#7D8C82`** (`primaire`) |
| Liens, onglet actif, texte des boutons teintés et blancs | indigo foncé | `#4F6D5C` (`lien`) |
| Fond des boutons teintés (« Add Customer », « Customize ») | `#F4F5FC` | `#F3F5F3` (`teinte`) |
| Bandeau « Invoice Number » | `#3F409A` → `#5959A9` + cercles `#6A69B0` | `#535F57` → `#647369` + cercles `#8D9B92` |
| Fond de page | `#F9FAFB` | `#F9FAFB` (identique) |
| Texte principal / gris | quasi noir / `#75787B` | `#121413` / `#6F7276` |
| Filets et bordures de champs | `#EEEEEE` | `#EEEEEE` (identique) |
| Boutons ronds gris (cloche, réglages) | `#F6F7F9`, icône `#9FA5B8` | `#F6F7F9`, icône `#9AA0A6` |
| Pastille « Due on » | fond `#FCEFEF`, texte rouge | fond `#FCEFEF`, texte `#BF4040` |
| Avatar client | dégradé pêche | dégradé pêche (identique) |
| Interrupteur éteint | `#EDEFF5` | `#EDEFF3` |

Remplacements de contenu : logo « Paypay. » → « MySalary. » ; liens Dashboard / Invoices / Wallet / Activity / Help → Aujourd'hui / Mois / Année / Objectifs / Calendrier / Mon plan ; logo Wise et données de paiement supprimés.

---

## 2. Couleurs

Tokens dans `ui/tailwind.config.js`. Aucune couleur en dur dans les composants.

| Token | Valeur | Usage | Contraste |
|---|---|---|---|
| `primaire` | `#7D8C82` | Bouton plein, `+`, soulignement actif, icône active | texte blanc 3,5:1 → texte du bouton plein en 18 px gras (« grand texte » AA) |
| `primaire-survol` | `#6F7E74` | Survol du bouton plein | |
| `lien` | `#4F6D5C` | Liens, onglet actif, texte des boutons teintés / blancs, logo | 5,7:1 sur blanc |
| `teinte` / `teinte-fort` | `#F3F5F3` / `#E7ECE8` | Boutons teintés, puces, onglets | |
| `bandeau` | `#535F57` → `#647369`, cercles `#8D9B92` | Bandeau héro | texte blanc ≥ 5:1 |
| `page` | `#F9FAFB` | Fond de page | |
| `encre` / `encre-2` | `#121413` / `#3D4140` | Texte principal | |
| `gris` | `#6F7276` | Texte secondaire, libellés, en-têtes de tableau | 4,8:1 sur blanc |
| `gris-icone` / `gris-bouton` | `#9AA0A6` / `#F6F7F9` | Icônes inactives, boutons ronds | décoratif |
| `filet` / `filet-fort` | `#EEEEEE` / `#E2E4E7` | Filets, bordures de champs | |
| `interne` | `#FBFCFC` | Bloc interne (« Wire Transfer ») | |
| `alerte` | `#BF4040` sur `#FCEFEF` | Pastille d'alerte, écart défavorable | 4,7:1 |
| `positif` | `#2F7A5A` sur `#E7F2EC` | Écart favorable, objectif sûr | |
| `attention` | `#8F6218` sur `#F7EFDF` | Objectif fragile, à confirmer | |
| `info` | `#4F6B8A` sur `#EAEFF5` | Hypothèse, badge vérifié | |
| `peche` | `#F5BEA2` → `#F09463` | Avatars | |

### 2.6 Couleurs de données

Validées au lot 2 avec le validateur de la skill `dataviz` (lisibilité, daltonisme). La première palette sauge pâle échouait : trop grise.

| Usage | Couleur |
|---|---|
| Série unique (rythme, trajectoire) | `sauge` `#7D8C82`, trait `sauge-700` |
| Revenus | `#3A74B8` bleu ardoise |
| Dépenses | `#D08A2E` cuivre (contraste < 3:1 → étiquettes ou légende visibles obligatoires) |
| Épargne | `#9C4F8C` prune |
| Cible d'objectif | `encre` en pointillé |
| Projection | trait pointillé + hachure `sauge-400` à 45° |

Règles :
- 3 séries maximum par graphique. Au-delà : regrouper en « Autres » ou découper en petits graphiques.
- Vert et terracotta sont réservés aux statuts (positif / négatif), jamais à une série.
- La répartition des dépenses par catégorie est un graphique à **une seule couleur** (barres triées, libellés à côté), pas un graphique multicolore.

---|---|
| Revenus | `sauge-700` `#545F57` |
| Dépenses | `#C9A38A` (sable rosé) |
| Épargne | `sauge` `#7D8C82` |
| Cible d'objectif | `encre` en pointillé |
| Projection | hachure `sauge-400` à 45° |
| Catégories (max 6) | `#7D8C82`, `#C9A38A`, `#8FA3B8`, `#B9A66B`, `#A08BA6`, `#6F9C93`, puis « Autres » en gris |

À valider au lot 2 avec la skill `dataviz` (écart entre séries, daltonisme).

---

## 3. Typographie

- **Plus Jakarta Sans** (400 à 800), hébergée localement. C'est la police libre la plus proche de la police géométrique du template (type Gilroy).
- Tous les montants en `tabular-nums`. Séparateur de milliers : espace insécable (`10 000 DH`). L'espace fine est trop étroite dans cette police.

| Token | Taille / interligne | Poids | Usage (élément du template) |
|---|---|---|---|
| `logo` | 22 / 28 | 800 | « Paypay. » |
| `nav` | 15 / 20 | 500 | Liens de navigation |
| `montant` | 30 / 36 | 700 | « $4,800.00 » |
| `titre` | 18 / 24 | 600 | « Dipa Inhouse », « Payment Method » |
| `titre-carte` | 16 / 22 | 500 | « Client Details », « Amount Due » |
| `texte` | 15 / 22 | 400 | Texte courant, adresses |
| `texte-sm` | 14 / 20 | 400 | En-têtes de tableau, sous-titres |
| `mention` | 12 / 16 | 500 | Badges |
| `bouton` | 17 / 22 | 600 | « Previews », « Download » |
| `bouton-plein` | 18 / 24 | 700 | « Send Invoice » |

---

## 4. Espacement, grille, rayons

| Mesure | Valeur (template) |
|---|---|
| Barre du haut | 64 px, blanche, collante |
| Marges latérales de page | 56 px (bureau), 20 px (mobile) |
| Grille | carte principale fluide + colonne latérale **352 px**, gouttière 48 px |
| Padding de la grande carte | 30 px |
| Padding des cartes latérales | 24 px |
| Écart entre cartes latérales | 32 px |

| Rayon | Valeur | Usage |
|---|---|---|
| `champ` | 12 px | Champs, cellules, bouton « menu » |
| `bouton` | 16 px | Boutons 52–60 px, bloc interne |
| `carte` / `bandeau` | 24 px | Cartes, bandeau |
| `pilule` | 999 px | Boutons ronds, avatars, pastilles |

---

## 5. Mise en page

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ MySalary.  ▦ Aujourd'hui  ▤ Mois  ▥ Année  ◎ Objectifs  ▣ Calendrier  ▭ Mon plan   (🔔)(⚙) │ (O) │
│                        ‾‾‾‾‾‾‾ soulignement de l'onglet actif                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Mois / février 2027 (27 janv. → 26 févr.)                      [Gérer le mois ▾] │
│ ┌───────────────────────────────────────────┐  ┌──────────────────┐            │
│ │ (O) Oussama                  lignes grises │  │ Objectif …   ••• │            │
│ │ ┌───────── bandeau sauge + cercles ───────┐│  └──────────────────┘            │
│ │ └─────────────────────────────────────────┘│  ┌──────────────────┐            │
│ │ Détail du mois                [Personnaliser]│ │ Reste à dépenser │            │
│ │ ligne │ prévu │ réel │ écart │ (+)          │  └──────────────────┘            │
│ │ Épargne du mois        │ totaux             │  [Aperçu] [Exporter]           ›│
│ └───────────────────────────────────────────┘  [ Ajouter une dépense ]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Sous 1024 px : les liens quittent la barre du haut pour une barre d'onglets blanche en bas (4 liens + bouton `+` central). Les colonnes passent l'une sous l'autre.
- Le bouton rond « › » collé au bord droit n'apparaît qu'en très grand écran (≥ 1280 px).

---

## 6. Ombres

| Token | Valeur | Usage |
|---|---|---|
| `carte` | `0 4px 30px -6px rgba(17,20,19,.04)` | Cartes (presque invisible, comme le template) |
| `bouton` | `0 2px 12px -2px rgba(17,20,19,.05)` | Boutons blancs, bloc interne, pouce de l'interrupteur |
| `bandeau` | `0 22px 40px -22px rgba(74,86,78,.55)` | Halo coloré sous le bandeau |
| `flottant` | `0 8px 24px -6px rgba(17,20,19,.16)` | Bouton « › », bouton `+` mobile, panneau |
| `focus` | anneau 3 px sauge à 30 % | Focus clavier |

Pas d'effet glass dans l'interface (absent du template). Seuls les toasts et infobulles utilisent un fond sombre translucide.

---

## 7. Composants

Tous visibles sur la vitrine (`/vitrine`). Noms en français (règle de la skill).

| Composant | Élément du template |
|---|---|
| `Entete` | Barre du haut : logo, liens icône + texte, onglet actif souligné, boutons ronds, séparateur, avatar |
| `BarreOngletsMobile` | Équivalent mobile de la barre du haut |
| `FilAriane` | « Invoices / edit invoice (INV-…) » + action à droite |
| `Bouton` `menu` | « Manage Invoice ▾ » |
| `Carte` (+ `TitreSection`, `Separateur`) | Cartes blanches, titre + « ••• », titre de section + sous-titre |
| `Identite`, `Avatar` | « Dipa Inhouse » / « Zaky Grizzly » (avatar + nom + ligne grise, badge vérifié) |
| `CarteBandeau` | Bandeau « Invoice Number / Billed to » |
| `Bouton` `puce` | « Customize » |
| `Cellule`, `Champ`, `ChampMontant` | Champs du tableau (« $ 40.00 »), « Description » |
| icône `IconePlusRond` | Bouton `+` de ligne |
| `Paire`, bloc `interne` | « Wire Transfer » : clé grise, valeur foncée |
| `BlocTotaux` | Sub Total / Discount / Total tax / Total Amount |
| `Bouton` `teinte` | « Add Customer » |
| `Pastille` | « Due on Jan 20, 2022 » |
| `Interrupteur` | « Also attach pdf in mail » |
| `Bouton` `blanc` | « Previews », « Download » |
| `Bouton` `principal` | « Send Invoice » |
| `BoutonFlottant` | « › » au bord droit |
| Icônes pleines (`icones.tsx`) | Icônes duotones du template (Lucide n'a pas d'équivalent plein) |

Composants MySalary dans le même style : `Montant`, `Kpi`, `BadgeNature`, `BadgeRisque`, `BadgeExemple`, `BarreProgression`, `Tableau`, `Onglets`, `Pilule`, `Panneau`, `Notifications`, graphiques.

---

## 8. Graphiques

Recharts, habillé par un thème commun.

| Besoin | Type |
|---|---|
| Rythme de dépense du mois | Aire cumulée réelle + ligne prévue pointillée |
| Revenus / dépenses / épargne par mois | Barres groupées fines, rayon haut 6 px |
| Trajectoire d'objectif | Aire réelle pleine + aire projetée hachurée + cible pointillée + 3 scénarios en lignes fines |
| Répartition des dépenses | Barres horizontales triées (pas de camembert) |
| KPI | Sparkline sans axes |

Règles :
- Axes fins `filet`, graduations `mention` `meta`, quadrillage horizontal très léger.
- Pas de légende pour une seule série. Sinon en haut à gauche, en ligne.
- Infobulle `verre-sombre` : date, valeur, nature.
- La zone projetée commence toujours par une ligne verticale « aujourd'hui ».
- Dégradé doux sous les aires (`sauge` 18 % → 0 %).
- Animation d'entrée 600 ms, une seule fois.
- Équivalent texte pour l'accessibilité.

---

## 9. Animations

framer-motion, variantes partagées : apparition en cascade des blocs, transition douce entre pages, compteur animé sur le montant clé, panneau qui glisse.

- Bascule « animations off » dans les Réglages (lot 3) ; `prefers-reduced-motion` respecté.
- Rien ne bouge en boucle.

---

## 10. Icônes

- Navigation, boutons ronds et actions : **icônes pleines dessinées pour MySalary** (`ui/src/components/icones.tsx`), dans le style duotone du template : glyphe gris `#9AA0A6`, actif en sauge, détails « percés » en blanc.
- Petites icônes utilitaires (chevrons, alerte) : Lucide.

---

## 11. Responsive

| Largeur | Adaptation |
|---|---|
| ≥ 1280 | Identique au template, bouton « › » visible |
| 1024–1279 | Même grille, marges réduites |
| < 1024 | Liens en barre du bas ; colonne latérale sous la carte principale |
| < 640 | Bandeau et en-têtes en une colonne ; tableaux défilent dans leur carte |

Aucun défilement horizontal de page (vérifié à 375 px).

---

## 12. Règles de cohérence

1. Toute nouvelle page reprend la structure du template : fil d'Ariane, carte principale, colonne latérale de 352 px.
2. Un seul bouton plein par écran, en bas de la colonne latérale.
3. Un seul montant de 30 px par carte.
4. Couleur d'alerte seulement si une action est utile.
5. Réel / prévu / projeté : même badge, même hachure, partout.
6. Montants en `tabular-nums`, format `10 000 DH`.
7. Pas plus de 3 séries par graphique.
8. Aucune couleur, ombre ou rayon en dur hors des tokens.
9. Tout nouveau composant passe d'abord par la vitrine.
10. Si un élément ne figure pas dans le template, il doit en suivre le style (cartes blanches, rayons, gris, sauge).
