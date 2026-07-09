# Installer ton espace de pilotage

> Ce guide est fait pour être suivi AVEC ton assistant IA (Claude, Codex…).
> Donne-lui le prompt d'installation de l'onglet Guide de ton espace, il te
> guidera écran par écran. Règle d'or : tu ne colles JAMAIS un mot de passe
> ni une clé secrète dans une discussion.

## Ce que contient ton espace

- `index.html`, `app.js`, `styles.css`, `logo-delegation.png` — ton espace (aucun outil à installer, aucun serveur applicatif : des fichiers statiques).
- `cockpit/` — la configuration livrée (`client-config.json` à créer, voir plus bas).
- `connecteur/server.mjs` — le connecteur qui permet à ton assistant IA de lire et mettre à jour ton espace (facultatif mais recommandé).
- `setup/001_espace.sql` — le script qui prépare ta base de données privée.

## Étape 1 — Ta base privée (5 min)

1. Crée un compte gratuit sur supabase.com puis un nouveau projet (choisis une région en Europe, par exemple Paris).
2. Ouvre le **SQL Editor** du projet, colle le contenu de `setup/001_espace.sql`, clique **Run**.
3. Dans **Authentication → Users → Add user**, crée ton compte d'accès : ton email + un mot de passe fort (coche « auto-confirm »). Ce sont TES identifiants de connexion à l'espace.

## Étape 2 — La configuration (2 min)

1. Dans **Settings → API** du projet, copie l'**URL du projet** et la clé **anon (public)**. La clé anon est faite pour être publique : sans connexion, elle ne donne accès à rien (sécurité ligne à ligne activée par le script).
2. Copie `setup/client-config.json.example` vers `cockpit/client-config.json` et remplis les deux valeurs.
3. Ne mets JAMAIS une autre clé que la clé anon dans ce fichier (jamais la « service role »).

## Étape 3 — Mettre en ligne (5 min)

Ton espace est un site statique : n'importe quel hébergement de fichiers fait l'affaire (Cloudflare Pages, Netlify, ton propre serveur…). Mets en ligne le dossier complet (avec `cockpit/` et `connecteur/`). Ouvre l'adresse : l'écran de connexion apparaît, connecte-toi avec l'email et le mot de passe créés à l'étape 1.

## Étape 4 — Vérifier (2 min)

1. Connecte-toi, ajoute une tâche dans « À délivrer ».
2. Recharge la page : la tâche est toujours là → tes données vivent bien dans TA base.
3. Ouvre l'onglet **Guide** et laisse-toi porter : questionnaire de démarrage, prompts prêts pour ton assistant, branchement du connecteur (onglet **Agent IA**).
