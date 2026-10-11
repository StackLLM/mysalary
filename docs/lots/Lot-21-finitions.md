# Lot 21 — Finitions (partiel)

> Statut : **livré en partie** (12/10/2026), en attente de validation.

## Fait

- **Paquet JS** : chaque page est chargée à la demande ; bibliothèques lourdes à part (`graphiques`, `animations`, `radix`, `react`). Avant : un seul fichier de 1 436 ko. Maintenant : ≈ 690 ko pour le premier écran, graphiques (407 ko) chargés avec les pages qui en ont besoin.
- **Raccourcis** `←` `→` : mois précédent / suivant (Mois, Calendrier) et année (Année). Sans effet dans un champ, une liste d'onglets, un menu, ou sous une fenêtre ouverte.
- **Textes de chantier** : la page « Cette page arrive au lot N » est supprimée ; une adresse inconnue affiche « Cette page n'existe pas. » avec un retour à Aujourd'hui.
- **Vitrine** du design system : réservée au développement (absente de la version construite).
- **Toast** « … · ajoutée à novembre » quand la dépense saisie tombe dans un autre mois budgétaire que le mois courant.
- **Accessibilité** : lien « Aller au contenu » (premier élément au clavier), contenu principal ciblable.

## Pas fait (à décider)

- **Playwright** (parcours de bout en bout) : demande de télécharger un navigateur de test.
- Glisser-déposer des objectifs ; Réglages › Catégories ; modifier une charge « à partir de maintenant » ; suspendre un élément du plan ; aperçu avant de changer de mode de période (tous « proposés, à confirmer »).
