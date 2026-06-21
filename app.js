/* =============================================================
   Cockpit Délégation IA — Starter Kit (maquette statique)
   Aucune dépendance. Tout le rendu se fait ici, en JS vanilla.

   ███  IMPORTANT  ███
   Tout l'objet MOCK ci-dessous = des DONNÉES D'EXEMPLE, fausses.
   👉 REMPLACE PAR TES VRAIES DONNÉES (ou demande à ton assistant
      IA de le faire, voir prompts/personnaliser-mon-cockpit.md).
   Rien ici n'est connecté à internet. C'est une vitrine, pas un outil
   branché : la vraie automatisation se construit ensuite.
   ============================================================= */

const MOCK = {
  // -- Identité affichée dans la barre latérale (mets ton nom de marque) --
  brand: {
    name: 'Délégation',
    sub: 'Ton cockpit',
    mini: 'Maquette de démonstration',
  },

  // -- Onglet COCKPIT : 4 indicateurs + à faire + modules --
  cockpit: {
    kpis: [
      { label: 'Revenu du mois', value: '0 € — exemple', sub: '0 transaction (à brancher)' },
      { label: 'Ventes en cours', value: '2 — exemple', sub: 'Deals ouverts de démonstration' },
      { label: 'Actions à faire', value: '5 — exemple', sub: 'Tâches d’exemple' },
      { label: 'Clients actifs', value: '3 — exemple', sub: 'Tous fictifs' },
    ],
    todo: [
      { title: 'Tâche exemple : préparer un appel découverte', detail: 'Client Démo 1 · à remplacer' },
      { title: 'Tâche exemple : envoyer un devis', detail: 'Client Démo 2 · à remplacer' },
      { title: 'Tâche exemple : publier un contenu', detail: 'Acquisition · à remplacer' },
    ],
    modules: [
      { label: 'Réseaux sociaux', desc: ' Tes canaux, liens, contenu (exemple)', group: 'Mes réseaux' },
      { label: 'Argent', desc: 'Revenus et transactions (exemple)', group: 'Suivi' },
      { label: 'Calendrier', desc: 'Rendez-vous et appels (exemple)', group: 'Suivi' },
      { label: 'Objectifs', desc: 'Tes priorités du mois (exemple)', group: 'Suivi' },
    ],
  },

  // -- Onglet ACQUISITION : d'où viennent tes contacts --
  acquisition: {
    kpis: [
      { label: 'Nouveaux contacts', value: '12 — exemple', sub: 'Sur les 30 derniers jours (fictif)' },
      { label: 'Vues de contenu', value: '1 234 — exemple', sub: 'Toutes plateformes (fictif)' },
      { label: 'Demandes reçues', value: '4 — exemple', sub: 'Messages entrants (fictif)' },
    ],
    sources: [
      { title: 'Canal exemple : vidéos', detail: '6 contacts ce mois-ci · à remplacer', badge: 'progress', badgeText: 'Actif' },
      { title: 'Canal exemple : publications', detail: '4 contacts ce mois-ci · à remplacer', badge: 'progress', badgeText: 'Actif' },
      { title: 'Canal exemple : bouche-à-oreille', detail: '2 contacts ce mois-ci · à remplacer', badge: 'neutral', badgeText: 'À suivre' },
    ],
  },

  // -- Onglet VENTES : tes opportunités, par étape --
  ventes: {
    kpis: [
      { label: 'Pipeline (exemple)', value: '0 € — exemple', sub: 'Valeur fictive, à brancher' },
      { label: 'Deals ouverts', value: '2 — exemple', sub: 'De démonstration' },
      { label: 'Taux de signature', value: '— %', sub: 'À calculer avec tes vraies données' },
    ],
    deals: [
      { title: 'Opportunité exemple A', detail: 'Client Démo 1 · montant exemple', badge: 'progress', badgeText: 'Échange en cours' },
      { title: 'Opportunité exemple B', detail: 'Client Démo 2 · montant exemple', badge: 'warn', badgeText: 'Proposition envoyée' },
      { title: 'Opportunité exemple C', detail: 'Client Démo 3 · montant exemple', badge: 'done', badgeText: 'Signé (exemple)' },
    ],
  },

  // -- Onglet CLIENTS : qui tu accompagnes --
  clients: [
    { title: 'Client Démo 1', detail: 'Secteur exemple · démarré il y a peu (fictif)', badge: 'done', badgeText: 'Actif' },
    { title: 'Client Démo 2', detail: 'Secteur exemple · en cours (fictif)', badge: 'progress', badgeText: 'En cours' },
    { title: 'Client Démo 3', detail: 'Secteur exemple · à recontacter (fictif)', badge: 'neutral', badgeText: 'En pause' },
  ],

  // -- Onglet À DÉLIVRER : ce que tu dois livrer --
  aDelivrer: [
    { title: 'Livrable exemple : page de présentation', detail: 'Client Démo 1 · à remplacer', badge: 'progress', badgeText: 'En cours' },
    { title: 'Livrable exemple : automatisation simple', detail: 'Client Démo 2 · à remplacer', badge: 'neutral', badgeText: 'À démarrer' },
    { title: 'Livrable exemple : guide de prise en main', detail: 'Client Démo 1 · à remplacer', badge: 'done', badgeText: 'Livré (exemple)' },
  ],

  // -- Onglet PILOTAGE : la santé globale --
  pilotage: {
    goalLabel: 'Objectif du mois (exemple)',
    goalValue: 'Cible 0 € — exemple',
    goalProgress: 42, // pourcentage d'exemple
    connectors: [
      { name: 'Base de données', ok: false },
      { name: 'Paiements', ok: false },
      { name: 'Calendrier', ok: false },
      { name: 'Réseaux sociaux', ok: false },
      { name: 'Assistant IA', ok: false },
      { name: 'Automatisations', ok: false },
    ],
  },

  // -- Onglet RESSOURCES : tes liens et documents utiles --
  ressources: [
    { title: 'Ressource exemple : ton guide de prise en main', detail: 'Document d’exemple · à remplacer' },
    { title: 'Ressource exemple : tes modèles de message', detail: 'Document d’exemple · à remplacer' },
    { title: 'Ressource exemple : ta liste de liens utiles', detail: 'Document d’exemple · à remplacer' },
  ],

  // -- Onglet PROJETS : tout ce qui avance --
  projets: [
    { nom: 'Projet exemple : refonte de l’accueil', etape: 'Prochaine étape — relire et valider (exemple)', statut: 'En cours', type: 'Interne' },
    { nom: 'Projet exemple : automatiser les réponses', etape: 'Prochaine étape — lister les cas (exemple)', statut: 'En cours', type: 'Interne' },
    { nom: 'Projet exemple : suivi clients', etape: 'Prochaine étape — mettre à jour la liste (exemple)', statut: 'En pause', type: 'Interne' },
  ],

  // -- Onglet AGENT IA : aperçu d'une conversation (factice) --
  agent: [
    { who: 'ai', text: 'Bonjour. Je suis l’aperçu de ton futur assistant. Pour l’instant je suis une démonstration : je ne suis branché à rien.' },
    { who: 'me', text: 'Montre-moi mes ventes du mois.' },
    { who: 'ai', text: 'Exemple de réponse : une fois branché à tes vraies données, je pourrai te résumer ton pipeline, tes tâches et tes clients ici. On construit ça ensemble.' },
  ],

  // -- Onglet PARAMÈTRES --
  parametres: {
    items: [
      { label: 'Nom de la marque', value: 'Délégation (exemple — à changer)' },
      { label: 'Thème', value: 'Sombre + or' },
      { label: 'Données', value: 'Maquette : aucune donnée réelle, aucune connexion' },
    ],
  },
};

/* =============================================================
   ICÔNES (SVG inline, façon Lucide — aucune dépendance externe)
   ============================================================= */
const ICONS = {
  cockpit: '<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z"/>',
  acquisition: '<path d="M4 12v8h16v-8M12 4v12M8 8l4-4 4 4"/>',
  ventes: '<path d="M3 17l6-6 4 4 7-7M14 8h5v5"/>',
  clients: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  delivrer: '<path d="M3 7h13v10H3zM16 10h3l2 3v4h-5M5.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M18.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>',
  pilotage: '<path d="M12 20v-6M6 20v-3M18 20v-9M4 4h16v16H4z"/>',
  ressources: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12l8.73-5.04M12 22V12"/>',
  projets: '<path d="M4 4h7l2 2h7v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z"/>',
  agent: '<path d="M12 3l1.9 4.5L18 9l-4.1 1.5L12 15l-1.9-4.5L6 9l4.1-1.5zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
  parametres: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.92 1V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.92-1l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.22.66.22 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  warn: '<path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
};

const TABS = [
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'acquisition', label: 'Acquisition' },
  { id: 'ventes', label: 'Ventes' },
  { id: 'clients', label: 'Clients' },
  { id: 'delivrer', label: 'À délivrer' },
  { id: 'pilotage', label: 'Pilotage' },
  { id: 'ressources', label: 'Ressources' },
  { id: 'projets', label: 'Projets' },
  { id: 'agent', label: 'Agent IA' },
  { id: 'parametres', label: 'Paramètres' },
];

/* helpers --------------------------------------------------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
const badge = (kind, text) => `<span class="badge badge-${kind}"><span class="badge-dot" style="background:currentColor"></span>${esc(text)}</span>`;

function kpiGrid(kpis) {
  return `<div class="grid grid-${kpis.length >= 4 ? 4 : kpis.length}">${kpis.map((k) => `
    <div class="card">
      <div class="kpi-top">
        <span class="kpi-label">${esc(k.label)}</span>
        ${icon('pilotage', 'kpi-icon')}
      </div>
      <div class="kpi-value">${esc(k.value)}</div>
      <div class="kpi-sub">${esc(k.sub)}</div>
    </div>`).join('')}</div>`;
}

function listCard(title, rows) {
  return `<div class="card mt-2">
    <div class="card-title">${esc(title)}</div>
    <ul class="list mt-1">${rows.map((r) => `
      <li class="list-row">
        <div style="min-width:0">
          <div class="title">${esc(r.title)}</div>
          <div class="detail">${esc(r.detail)}</div>
        </div>
        ${r.badge ? badge(r.badge, r.badgeText) : ''}
      </li>`).join('')}</ul>
  </div>`;
}

function pageHead(iconName, eyebrow, title, desc) {
  return `<div class="page-eyebrow">${esc(eyebrow)}</div>
    <h1 class="page-title">${icon(iconName, 'ic')}${esc(title)}</h1>
    <p class="page-desc">${esc(desc)}</p>`;
}

/* =============================================================
   RENDU PAR ONGLET
   ============================================================= */
const RENDER = {
  cockpit() {
    const c = MOCK.cockpit;
    return `${pageHead('cockpit', 'Vue d’ensemble', 'Cockpit', 'Un coup d’œil sur ton activité. Ici, tout est en exemple : remplace par tes vraies données.')}
      <div class="mt-3">${kpiGrid(c.kpis)}</div>
      ${listCard('À traiter aujourd’hui', c.todo)}
      <div class="section-head"><div class="section-eyebrow">Tes modules</div><div class="section-sub">Les raccourcis vers tes zones de travail (exemples).</div></div>
      <div class="grid grid-4">${c.modules.map((m) => `
        <div class="tile">
          ${icon('cockpit', 'tile-icon')}
          <div class="tile-label">${esc(m.label)}</div>
          <div class="tile-desc">${esc(m.desc)}</div>
          <div class="tile-group">${esc(m.group)}</div>
        </div>`).join('')}</div>`;
  },

  acquisition() {
    const a = MOCK.acquisition;
    return `${pageHead('acquisition', 'D’où viennent tes contacts', 'Acquisition', 'Tes canaux et combien de personnes ils t’amènent. Données d’exemple.')}
      <div class="mt-3">${kpiGrid(a.kpis)}</div>
      ${listCard('Tes canaux', a.sources)}`;
  },

  ventes() {
    const v = MOCK.ventes;
    return `${pageHead('ventes', 'Tes opportunités', 'Ventes', 'Tes deals en cours et leur étape. Tous les montants ici sont des exemples.')}
      <div class="mt-3">${kpiGrid(v.kpis)}</div>
      ${listCard('Tes opportunités', v.deals)}`;
  },

  clients() {
    return `${pageHead('clients', 'Qui tu accompagnes', 'Clients', 'La liste de tes clients. Ici, tout le monde est fictif.')}
      ${listCard('Tes clients', MOCK.clients)}`;
  },

  delivrer() {
    return `${pageHead('delivrer', 'Ce que tu dois livrer', 'À délivrer', 'Tes livrables en cours et terminés. Données d’exemple.')}
      ${listCard('Tes livrables', MOCK.aDelivrer)}`;
  },

  pilotage() {
    const p = MOCK.pilotage;
    return `${pageHead('pilotage', 'La santé globale', 'Pilotage', 'Ton objectif du mois et l’état de tes connexions. Tout est en exemple.')}
      <div class="grid grid-2 mt-3">
        <div class="card">
          <div class="kpi-label">${esc(p.goalLabel)}</div>
          <div class="kpi-value">${esc(p.goalProgress)}%</div>
          <div class="kpi-sub">${esc(p.goalValue)}</div>
          <div class="progress"><div class="progress-bar" style="width:${esc(p.goalProgress)}%"></div></div>
        </div>
        <div class="card">
          <div class="kpi-label">Connexions</div>
          <ul class="list mt-2" style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
            ${p.connectors.map((c) => `<li style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;border:none;padding:0">
              ${c.ok ? icon('check', 'ic') : `<svg class="ic" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--warning)">${ICONS.warn}</svg>`}
              <span style="color:${c.ok ? 'var(--fg-primary)' : 'var(--fg-muted)'}">${esc(c.name)}</span>
            </li>`).join('')}
          </ul>
          <div class="kpi-sub mt-2">Rien n’est branché : c’est une maquette. Le vrai branchement se construit ensuite.</div>
        </div>
      </div>`;
  },

  ressources() {
    return `${pageHead('ressources', 'Tes liens et documents', 'Ressources', 'Tes guides, modèles et liens utiles, au même endroit. Données d’exemple.')}
      ${listCard('Tes ressources', MOCK.ressources)}`;
  },

  projets() {
    return `${pageHead('projets', 'Tout ce qui avance', 'Projets', 'Tes projets en cours et leur prochaine étape. Données d’exemple.')}
      <div class="grid grid-2 mt-3">${MOCK.projets.map((p) => `
        <div class="project-card">
          <div class="row-between">
            <div class="card-title">${esc(p.nom)}</div>
            <span class="tag">${esc(p.type)}</span>
          </div>
          <div class="meta-row">
            ${badge(p.statut === 'En cours' ? 'done' : 'warn', p.statut)}
          </div>
          <div class="project-next"><span class="lbl">${esc(p.etape)}</span></div>
        </div>`).join('')}</div>`;
  },

  agent() {
    return `${pageHead('agent', 'Ton futur assistant', 'Agent IA', 'Un aperçu de l’assistant qui pilotera ton cockpit. Cette démonstration n’est branchée à rien.')}
      <div class="chat mt-3">
        ${MOCK.agent.map((m) => `<div class="bubble bubble-${m.who === 'me' ? 'me' : 'ai'}">${esc(m.text)}</div>`).join('')}
        <div class="mt-2" style="display:flex;gap:0.5rem">
          <input class="search" style="flex:1;color:var(--fg-secondary)" placeholder="Écris à ton assistant (désactivé dans la démo)" disabled />
          <button class="btn btn-ghost" disabled>Envoyer</button>
        </div>
      </div>
      <div class="empty mt-2">Cet assistant prend vie quand on branche ton vrai système. C’est l’étape qu’on construit ensemble.</div>`;
  },

  parametres() {
    const s = MOCK.parametres;
    return `${pageHead('parametres', 'Réglages', 'Paramètres', 'Quelques réglages d’exemple. Adapte-les à ton business.')}
      ${listCard('Réglages', s.items.map((i) => ({ title: i.label, detail: i.value })))}`;
  },
};

/* =============================================================
   APPLICATION (navigation + montage)
   ============================================================= */
function buildSidebar(active) {
  const m = MOCK.brand;
  return `
    <div class="sidebar-head">
      <div class="brand">
        <div class="brand-logo">D</div>
        <span class="brand-name">${esc(m.name)} <span style="color:var(--accent)">IA</span></span>
      </div>
      <div class="brand-sub">${esc(m.sub)}</div>
      <div class="brand-mini">${esc(m.mini)}</div>
    </div>
    <nav class="nav">
      ${TABS.map((t) => `<button class="nav-item ${t.id === active ? 'active' : ''}" data-tab="${t.id}">
        ${icon(t.id, 'ic')}<span>${esc(t.label)}</span>
      </button>`).join('')}
    </nav>
    <div class="sidebar-foot">
      <div class="note">Maquette de démonstration. Aucune donnée réelle, aucune connexion. Personnalise-la avec ton assistant IA.</div>
    </div>`;
}

function render(tab) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="layout" id="layout">
      <div class="backdrop" data-close-nav></div>
      <aside class="sidebar">${buildSidebar(tab)}</aside>
      <div class="main">
        <header class="topbar">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <button class="menu-toggle" data-toggle-nav>${icon('menu', 'ic')}</button>
            <div class="search">${icon('search', 'ic')}<span class="label">Rechercher (exemple)</span></div>
          </div>
          <span class="badge-env">Démonstration</span>
        </header>
        <main class="content">
          <div class="demo-banner">
            ${icon('warn', 'ic')}
            <span>Maquette d’exemple — toutes les données ci-dessous sont fictives. Remplace-les par les tiennes.</span>
          </div>
          <div class="page">${RENDER[tab] ? RENDER[tab]() : '<p>Onglet inconnu.</p>'}</div>
        </main>
      </div>
    </div>`;

  // Navigation entre onglets
  app.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-tab');
      location.hash = id;
    });
  });

  // Menu mobile
  const layout = document.getElementById('layout');
  const toggle = app.querySelector('[data-toggle-nav]');
  if (toggle) toggle.addEventListener('click', () => layout.classList.toggle('nav-open'));
  const backdrop = app.querySelector('[data-close-nav]');
  if (backdrop) backdrop.addEventListener('click', () => layout.classList.remove('nav-open'));
}

function current() {
  const h = (location.hash || '').replace('#', '');
  return TABS.some((t) => t.id === h) ? h : 'cockpit';
}

window.addEventListener('hashchange', () => render(current()));
render(current());
