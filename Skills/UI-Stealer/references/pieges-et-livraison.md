# Pièges & livraison

## Vérifier SANS captures d'écran
L'outil de capture du navigateur intégré **timeout / fige** dès qu'il y a des
animations CSS infinies ou un canvas WebGL. **Ne pas s'acharner dessus.** Vérifier
autrement, puis **dire au user de regarder en direct** :

- `npx tsc --noEmit` · `npx vitest run` · `npm run build` — tout doit passer.
- Écrire **1–2 tests légers** (vitest + testing-library) : un rendu de carte, et un
  **test d'intégration du flux** (taper une question via `fireEvent.change` + clic
  Envoyer → vérifier bulle question + réponse mockée + sources). Mocker `lib/api`.
- Contrôler le rendu via le **DOM et les styles calculés** (`getComputedStyle`,
  `getBoundingClientRect`) plutôt qu'une image : ex. vérifier `backgroundColor
  rgba(255,255,255,0.25)` + `backdropFilter blur(...)` du rail, le chevauchement de la
  carte, la présence de l'`<img>` mascotte, la largeur de la fenêtre.
- Si vraiment besoin d'un clic dans le navigateur intégré : les clics par `ref` sont
  capricieux et les champs contrôlés n'enregistrent pas la frappe simulée ; un
  `element.click()` en JS déclenche bien le handler React (mais l'état React est async :
  relire dans un appel suivant).

## Fichiers .bat Windows (cmd)
- **Interdit** : `(` ou `)` dans un `echo` **à l'intérieur d'un bloc** `if (...)` /
  `for (...)` → `... était inattendu`. (Melko News ne plantait pas car son bloc `if
  exist docker-compose.yml` était faux.)
- **Règle** : mettre les actions en **`if` sur une seule ligne**, échos **sans
  parenthèses**. Docker en optionnel : `where docker >nul 2>&1 && if exist "...compose" docker compose up -d >nul 2>&1`.
- Tester le parsing sans rien lancer : préfixer chaque ligne d'action par `if 1==2 …`
  et exécuter — si ça affiche tout sans erreur, la syntaxe est bonne.
- `start "titre" cmd /k "cd /d "%~dp0ui" && npm run dev"` (guillemets imbriqués) marche
  **au niveau racine**, pas dans un bloc.

## Environnement
- **Windows / PowerShell** : pas de bash-ismes (`&&` PS 5.1 absent → `;`/`if ($?)` ;
  `2>&1` sur exe natif pollue `$?`). Pour lire/écrire des fichiers : outils dédiés,
  pas `Get-Content`/`Set-Content`.
- **Ports Melko** : créneau libre suivant. CEE_bot 6007/6107 · Melko News 6008/3008/6108
  · AskMe 6009/3009/6109. UI `600x`, back `300x`, prod `610x`.

## GitHub (init + deux dépôts)
- `git init -b main`. **Vérifier le staging** avant de committer : pas de
  `node_modules`, pas de `.env`, pas de gros assets sources (`.eps`, `.jpg` d'origine —
  seul le `.webp` optimisé est versionné). Config git déjà en place
  (`oussama` / `Oamek@melko-energie.com`).
- Commit **Conventional Commits, description française**, finir par le trailer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Deux remotes (le repo peut déjà exister, vide) :
  ```
  gh repo create oa-melko/<Repo> --private --source=. --remote=origin --push
  gh repo create Melko-energie/<Repo> --private
  git remote add melko https://github.com/Melko-energie/<Repo>.git && git push melko main
  ```
  `gh` est authentifié en **oa-melko** (scopes `repo`, `read:org`, `workflow`). Défaut
  **privé** (outil interne) ; proposer public au user, ne pas décider seul. Si le repo
  « already exists », vérifier `gh repo view --json isEmpty` puis pousser (pas recréer).

## Partage sur le réseau local
- `vite.config.ts` : `server.host = true` → écoute `0.0.0.0`. URL = `http://<IP-LAN>:<port>`.
- Trouver l'IP : `Get-NetIPConfiguration | ? { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' }`.
  (Machine Melko : `192.168.100.134`.)
- **Pare-feu** (le blocage courant, **droits admin**, à donner au user — l'agent ne peut
  pas élever) : `New-NetFirewallRule -DisplayName "<Projet> <port>" -Direction Inbound -Protocol TCP -LocalPort <port> -Action Allow`.
- Hors LAN (Internet) : `cloudflared tunnel --url http://localhost:<port>` ou `ngrok http <port>`.

## Ton & posture
- **Français**, direct, **sans blabla** ni longues explications non demandées.
- Sur « go » : livrer, montrer les preuves (build/tests verts), puis **une** question de
  réglage max si utile (« plus grand / plus bas ? »). Ne pas faire re-répéter ses
  critères — ils sont dans ce dossier.
