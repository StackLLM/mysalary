# Lot 2 — Design system

> Statut : **clôturé et validé**, refait à l'identique du template (07/10/2026). Référence : `UI.md`, skill UI-Stealer, `Plan.md` § 14.

## Objectif

Construire tous les éléments visuels de MySalary et les valider sur une **page vitrine**, avant de construire les vrais écrans.

## Périmètre

| Inclus | Exclu |
|---|---|
| Tailwind 3.4 + tokens de `UI.md` (sauge, nacre, encre, ardoise, sémantiques, séries) | Écrans métier (lots 3 et suivants) |
| Polices Inter + Instrument Serif, locales | Données réelles |
| Fond nacré + blobs, **fenêtre** + **rail en verre** (recette de la skill), barre d'onglets mobile | |
| Animations : variantes partagées, transitions de vue, bascule on/off, `prefers-reduced-motion` | |
| Composants : Bouton, Champ, ChampMontant, ChampPremium, Carte, CarteHeros, Montant animé, Kpi, Pilule, BadgeNature, BadgeRisque, BarreProgression, Tableau, Onglets, Panneau, Notifications, TitreMixte | |
| Graphiques : thème commun, trajectoire (réel / projeté hachuré / cible), barres revenus · dépenses · épargne, infobulles | |
| Routage : vitrine, page technique, pages à venir | |
| Tests de composants (jsdom) | |

Toutes les données de la vitrine sont marquées **« exemple »**.

## Décision : palette des graphiques

La palette catégorielle prévue dans `UI.md` (§ 2.6) a été passée au validateur de la skill `dataviz`. Elle **échoue** : trop grise (chroma), séries indiscernables pour les daltoniens.

Palette retenue (3 séries, validée en tous couples) :

| Série | Couleur | Remarque |
|---|---|---|
| Revenus | `#3A74B8` bleu ardoise | |
| Dépenses | `#D08A2E` cuivre | contraste < 3:1 → étiquettes visibles obligatoires |
| Épargne | `#9C4F8C` prune | |

Les vert et terracotta sont écartés des séries : ils sont réservés aux statuts (positif / négatif). Une série unique (rythme, trajectoire) reste en sauge.

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Le rail est une couche **derrière** la fenêtre, pas dedans (vérifié par test DOM et dans le navigateur).
- [x] Bascule animations : coupe les mouvements, respecte `prefers-reduced-motion`.
- [x] Contrastes AA sur les textes (dégradé héro assombri en fin : `#69776E` au lieu de `#7D8C82`).
- [x] Page vitrine lisible à 375, 768, 1280 px, sans défilement horizontal.
- [x] Validation visuelle sur la vitrine.

## Révision du 07/10/2026 — interface identique au template

Ton retour : le rendu ne ressemblait pas à `Templates/image.png`. La première version appliquait le style maison de la skill (rail en verre, fenêtre posée sur un fond nacré, police serif, blobs animés), absent du template.

Refait à l'identique du template :

- barre du haut blanche (logo, liens icône + texte, onglet actif souligné, boutons ronds gris, séparateur, avatar) ;
- fil d'Ariane + bouton menu à droite ;
- grande carte + colonne latérale de 352 px ;
- bandeau à cercles, tableau en champs avec bouton `+`, bloc interne, totaux ;
- cartes latérales (avatar, « ••• », bouton teinté, montant 30 px, pastille, interrupteur) ;
- deux boutons blancs + grand bouton plein ; bouton « › » au bord droit ;
- couleurs relevées au pixel, violet remplacé par la sauge (`UI.md` § 1.5) ;
- police Plus Jakarta Sans, icônes pleines dessinées dans le style du template.

La vitrine montre cet écran avec un contenu MySalary (un mois budgétaire), puis les autres composants dans le même style.

Corrigé pendant la vérification :

- **bug** : l'utilitaire de fusion des classes supprimait la couleur quand une taille de texte personnalisée suivait (`text-lien` + `text-texte`) → configuré et testé ;
- séparateur de milliers trop fin dans cette police → espace insécable ;
- débordement horizontal en mobile causé par les textes pour lecteurs d'écran → conteneurs défilants positionnés.

Résultat : `npm run verifier` OK, **39 tests**, aucun défilement horizontal à 375 px, rendu comparé au template à 1342 px.

## Résultat

- `npm run verifier` : types OK, **37 tests** OK (dont 13 de composants), build OK.
- Vérifié dans le navigateur à 1440 px et 375 px :
  - rail : fond blanc 25 %, flou 40 px, couche z-0 ; fenêtre z-10 qui le chevauche de 32 px ;
  - polices Inter et Instrument Serif chargées en local ;
  - aucun défilement horizontal en mobile ; le tableau masque la colonne « Prévu » et reste lisible ;
  - panneau de saisie, toast avec « Annuler », bascule des animations (blobs figés, classe `sans-animations`).
- Corrigé pendant la vérification : axe du graphique de trajectoire (valeurs rondes), étiquette « Aujourd'hui » qui chevauchait la cible.

## Écarts et remarques

- **Palette des graphiques remplacée** (voir plus haut) : la palette sauge pâle échouait au validateur.
- Paquet JS principal ≈ 540 ko (framer-motion, Radix, zod). Sans effet pour une app locale ; à optimiser au lot de finition.
- Les captures d'écran du navigateur intégré se figent parfois (blobs animés en boucle) : contrôle fait par le DOM et les styles calculés, comme le recommande la skill.
- Pages à venir : chaque destination du rail affiche « Cette page arrive au lot N ».
- À traiter au lot 3 : si le compte retenu sur l'appareil n'existe plus (erreur 401), revenir à l'écran Profils.

## Où regarder

- Vitrine : http://127.0.0.1:6010/vitrine (après `npm run dev`)
- Page technique : http://127.0.0.1:6010/controle
