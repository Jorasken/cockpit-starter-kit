# Prompt à copier-coller : personnalise mon cockpit

Donne ce dossier à ton assistant IA (Claude, Codex, ou un autre), puis colle le message ci-dessous. L'assistant va transformer la maquette d'exemple en **ton** cockpit, onglet par onglet.

---

## Le prompt (copie tout ce qui est entre les lignes)

---

Tu as accès à un dossier appelé `cockpit-starter-kit`. C'est une maquette statique de tableau de bord business (un « cockpit »), faite en HTML / CSS / JavaScript simple, sans aucune dépendance. Toutes les données affichées sont des EXEMPLES fictifs.

**Ta mission : remplacer ces exemples par mes vraies informations, sans rien casser.**

Voici comment t'y prendre :

1. **Ouvre le fichier `app.js`.** Tout en haut, il y a un objet JavaScript appelé `MOCK`, encadré par un commentaire « REMPLACE PAR TES VRAIES DONNÉES ». C'est le seul endroit à modifier pour le contenu. Ne touche pas à la logique en dessous, ni au design dans `styles.css`, sauf si je te le demande.

2. **Avant de remplir, interroge-moi.** Pose-moi des questions simples, une zone à la fois, pour comprendre mon activité. Si une réponse manque, garde un libellé neutre plutôt que d'inventer. N'invente jamais de chiffres, de noms de clients ou de montants.

3. **Adapte chaque onglet à mon métier :**
   - **Cockpit** : mes 4 indicateurs les plus importants + mes 3-5 tâches du moment + mes raccourcis.
   - **Acquisition** : mes vrais canaux (d'où viennent mes contacts).
   - **Ventes** : mes opportunités en cours et leurs étapes (avec MES noms d'étapes).
   - **Clients** : mes vrais clients (ou « prospect » si pas encore clients).
   - **À délivrer** : ce que je dois produire/livrer.
   - **Pilotage** : mon objectif du mois + les connexions que j'aimerais avoir un jour.
   - **Ressources** : mes guides, modèles, liens utiles.
   - **Projets** : ce qui avance chez moi, avec la prochaine étape concrète.
   - **Agent IA** : laisse l'aperçu de conversation, mais reformule-le à ma sauce.
   - **Paramètres** : mon nom de marque, mes réglages.

4. **Renomme la marque** : dans `MOCK.brand`, mets le nom de mon activité à la place de « Délégation ».

5. **Vérifie ton travail** : une fois fini, liste-moi ce que tu as changé, onglet par onglet, et rappelle-moi d'ouvrir `index.html` pour voir le résultat.

**Règles importantes :**
- Tu n'inventes aucune donnée. Si tu ne sais pas, tu me demandes ou tu mets un libellé générique.
- Tu ne mets aucun mot de passe, clé, ou information sensible dans les fichiers.
- Tu gardes le ton simple et clair, écrit de mon point de vue à moi (« tes ventes », « tes clients »).
- Le résultat doit s'ouvrir d'un simple double-clic sur `index.html`, sans rien installer.

Commence par me poser tes premières questions sur mon activité.

---

(fin du prompt)
