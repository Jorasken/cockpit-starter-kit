# Ton cockpit — ton tableau de bord business

Ton cockpit réunit au même endroit tout ce qui fait tourner ton activité : tes ventes, tes clients,
tes contacts, ce que tu dois livrer, tes objectifs, tes projets. Il vit **chez toi**, sur **ta** base
de données : tes données t'appartiennent, personne d'autre n'y a accès.

## Ce que tu as ici

- `index.html`, `app.js`, `styles.css`, `logo-delegation.png` — ton espace. Des fichiers statiques :
  rien à installer, aucun serveur à gérer.
- `setup/001_espace.sql` — le script qui prépare ta base privée (une commande à coller).
- `setup/client-config.json.example` — le modèle de configuration (tu crées le tien à partir de lui).
- `setup/INSTALLATION.md` — **le guide pas à pas** : suis-le avec ton assistant IA, 15 minutes.
- `connecteur/server.mjs` — le connecteur qui permet à ton IA (Claude, Codex…) de lire et de tenir
  ton cockpit à jour à ta place. Optionnel, mais c'est là que la magie opère.

## Par où commencer

Ouvre **`setup/INSTALLATION.md`** et laisse-toi guider. En résumé :

1. Tu crées ta base privée (gratuite) et tu colles le script `setup/001_espace.sql`.
2. Tu copies `setup/client-config.json.example` en `cockpit/client-config.json` et tu remplis tes deux valeurs.
3. Tu mets le dossier en ligne (n'importe quel hébergement de fichiers) — à ton nom de domaine si tu veux.
4. Tu te connectes, et ton cockpit est à toi.

> Règle d'or : tu ne colles **jamais** un mot de passe ni une clé secrète dans une discussion.
> La clé « anon » de ta configuration est faite pour être publique — sans connexion, elle ne donne
> accès à rien (chaque ligne de ta base est protégée).

## L'aperçu en ligne

Tu veux voir à quoi ça ressemble une fois en ligne ? La démo : https://cockpit.delegation-ia.fr
