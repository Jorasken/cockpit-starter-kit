# Cockpit Délégation IA — ta maquette de tableau de bord business

Tu as entre les mains une **maquette de cockpit** : un tableau de bord qui réunit, au même endroit, tout ce qui fait tourner ton activité — tes ventes, tes clients, tes contacts, ce que tu dois livrer, tes objectifs, tes projets.

---

## Ce que fait ce code, concrètement

C'est une **petite application web autonome**. Rien à installer, rien à configurer, pas besoin d'internet. Quand tu l'ouvres :

- une **barre de menu à gauche** avec 10 onglets (Cockpit, Acquisition, Ventes, Clients, À délivrer, Pilotage, Ressources, Projets, Agent IA, Paramètres) ;
- chaque onglet affiche un **vrai écran de pilotage** : indicateurs, listes, badges de statut, cartes, barre de progression, aperçu d'un assistant ;
- tout fonctionne dans ton navigateur, **hors ligne**, sans compte ni installation.

Pour l'instant, toutes les données sont des **exemples** (« Client Démo 1 », « 0 € — exemple »…). Rien n'est connecté à ta vraie activité : c'est **volontaire**. Tu pars d'une base propre et tu la rends **tienne** en quelques minutes avec ton assistant IA.

> En clair : ce code te montre **à quoi ressemblerait ton poste de pilotage**, et te donne une base prête à personnaliser. Ce n'est pas encore l'automatisation (les chiffres ne bougent pas tout seuls) — ça, c'est l'étape d'après (voir tout en bas).

---

## Installation — teste-le en 60 secondes

1. **Récupère le dossier.** Sur la page du code, bouton vert **« Code »** puis **« Download ZIP »**. (Ou clone-le si tu sais faire.)
2. **Décompresse** le ZIP où tu veux sur ton ordinateur.
3. **Double-clique sur le fichier `index.html`.**
4. Ça s'ouvre dans ton navigateur. **Clique entre les onglets à gauche** : tout marche.

C'est tout. Pas de compte, pas de logiciel, pas besoin d'internet. Si tu vois le menu à gauche et que les onglets changent l'écran, **c'est que ça marche**.

---

## Rends-la tienne avec ton assistant IA (sans coder)

Le plus simple : tu confies ce dossier à ton assistant (Claude ou Codex) et tu lui demandes de l'adapter à **ton** business.

1. Ouvre ton assistant IA et donne-lui accès à ce dossier.
2. Copie-colle le prompt prêt à l'emploi : **`prompts/personnaliser-mon-cockpit.md`**.
3. Réponds à ses questions sur ton activité (aide-mémoire : **`prompts/questions-a-se-poser.md`**).
4. Il remplace les exemples par tes vraies infos, onglet par onglet. Tu rouvres `index.html` : c'est **ton** cockpit.

> Tu n'as pas besoin de savoir coder. Tu décris ton activité, l'assistant fait le reste.

Tu préfères le faire à la main ? Le dossier contient un bloc clairement marqué **« REMPLACE PAR TES VRAIES DONNÉES »** : tu changes les textes, tu sauvegardes, tu rouvres la page.

---

## Mets-la en ligne gratuitement (optionnel)

Tu veux ta propre adresse web au lieu d'un fichier local ? Demande à ton assistant IA de **l'héberger gratuitement** (GitHub Pages ou Netlify) : il te guide en quelques étapes. Tu obtiens un lien à toi, partageable.

---

## Ce qu'il y a dans le dossier

- **`index.html`** — le seul fichier que tu ouvres : double-clique dessus, c'est ton cockpit.
- Le reste, ce sont les fichiers qui font tourner la page (le contenu des onglets, le design) et un dossier de **messages prêts à coller dans ton IA**. Tu n'as pas besoin d'y toucher : ton assistant s'en occupe.

---

## Et après ? De la maquette au vrai système qui tourne pour toi

Une maquette, c'est la photo de ce que tu veux. Le **vrai** cockpit, c'est quand :

- tes chiffres se mettent à jour **tout seuls**,
- tes nouveaux contacts et tes ventes apparaissent **sans que tu les saisisses**,
- ton assistant IA répond pour de vrai et **fait des actions à ta place**.

Cette partie demande de brancher tes outils ensemble, taillé sur ton activité. C'est exactement ce qu'on construit ensemble (pistes dans `prompts/aller-plus-loin.md`).

**Réserve un appel découverte :** https://calendly.com/jorasken/appel-decouverte-ia
Plus d'infos : https://delegation-ia.fr

**Bloqué quelque part, ou une question ?** Écris-moi directement sur WhatsApp : https://wa.me/33767980666

---

*Cette maquette t'est offerte pour que tu visualises ton futur cockpit. Personnalise-la autant que tu veux. Voir `LICENSE` pour les conditions d'usage.*
