/* ============================================================
   Cockpit client — application front (vanilla, sans dependance)
   Tout est ecrit du point de vue du client qui pilote SON espace.
   Donnees reelles (clients, affaires, taches, ressources, automatisations,
   approbations, activite) editables et persistees en local.
   Aucune donnee sensible, aucun jargon interne, aucun palier d'offre.
   ============================================================ */

const clientProfileUrl = "cockpit/client-profile.json";
const manifestUrl = "cockpit/manifest.json";
const STORE_KEY = "cockpit-client-config";
const DATA_KEY = "cockpit-client-data";

const THEMES = [
  { id: "dark-editorial", name: "Sombre", dots: ["#0a0a0a", "#161616", "#d4a574"] },
  { id: "linear-dark", name: "Nuit", dots: ["#08090a", "#111216", "#8b6df1"] },
  { id: "vercel-sober", name: "Contraste", dots: ["#000000", "#0a0a0a", "#ffffff"] },
  { id: "cream", name: "Ivoire", dots: ["#f5f1e8", "#fdf9ee", "#8a6338"] },
  { id: "light", name: "Clair", dots: ["#ffffff", "#fafafa", "#0a0a0a"] },
  { id: "stripe-clean", name: "Indigo", dots: ["#ffffff", "#f5f5f5", "#635bff"] },
  { id: "custom-jorasken", name: "Papier", dots: ["#f5f1e8", "#fdf9ee", "#8a6338"] },
  { id: "editorial-cream", name: "Editorial", dots: ["#0a0a0a", "#161616", "#d4a574"] },
];

const ZONES = [
  { id: "cockpit", label: "Cockpit", subtitle: "Vue d’ensemble", icon: "grid", fixed: true },
  { id: "acquisition", label: "Acquisition", subtitle: "Contenu et visibilité", icon: "share" },
  { id: "sales", label: "Ventes", subtitle: "Offres et paiements", icon: "trend" },
  { id: "clients", label: "Clients", subtitle: "Suivi et relation", icon: "users" },
  { id: "delivery", label: "À délivrer", subtitle: "Tâches et livrables", icon: "truck" },
  { id: "pilotage", label: "Pilotage", subtitle: "Automatisations et activité", icon: "gauge" },
  { id: "resources", label: "Ressources", subtitle: "Documents et raccourcis", icon: "cube" },
  { id: "agent", label: "Agent IA", subtitle: "Ton assistant", icon: "bot" },
  { id: "guide", label: "Guide", subtitle: "Mode d’emploi", icon: "book", fixed: true },
  { id: "settings", label: "Paramètres", subtitle: "Personnalisation", icon: "settings", fixed: true },
];

const DEAL_STAGES = ["Découverte", "Proposition", "Négociation", "Gagné", "Perdu"];
const CLIENT_STATUS = ["Prospect", "Actif", "En pause", "Terminé"];
const TASK_STATUS = ["À faire", "En cours", "Fait"];

const DEFAULTS = {
  profile: { businessName: "Ton entreprise", ownerName: "Ton prénom", objective: "" },
  theme: "dark-editorial",
  priorityProgress: 0,
  navOrder: ZONES.map((z) => z.id),
  navHidden: [],
};

const DEFAULT_AUTOMATIONS = [
  { id: "morning-brief", name: "Récap du matin", desc: "Chaque matin, ton assistant te prépare un récap clair de ta journée.", on: false },
  { id: "follow-up", name: "Rappel de relance", desc: "Quand un prospect ne répond pas, ton assistant te propose une relance à valider.", on: false },
  { id: "welcome", name: "Message de bienvenue", desc: "Quand tu ajoutes un client, ton assistant prépare un message d’accueil pour toi.", on: false },
  { id: "payment-alert", name: "Alerte encaissement", desc: "Quand un paiement arrive, tu reçois une notification, sans rien suivre à la main.", on: false },
];

const CONTENT_STATUS = ["Idée", "En cours", "Publié"];
const LINK_CATEGORIES = ["Paiement", "Agenda", "Formulaire", "Communauté", "Outil", "Document", "Autre"];

const DATA_DEFAULTS = {
  clients: [],
  deals: [],
  tasks: [],
  contents: [],
  resources: [],
  goals: [],
  revenue: [],
  automations: DEFAULT_AUTOMATIONS.map((a) => ({ ...a })),
  approvals: [],
  activity: [],
};

/* ------------------------------------------------------------
   Etat
   ------------------------------------------------------------ */
const state = {
  route: "cockpit",
  config: clone(DEFAULTS),
  data: clone(DATA_DEFAULTS),
  ui: { form: null }, // form: collection dont le formulaire d'ajout est ouvert
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ------------------------------------------------------------
   Synchronisation Supabase (optionnelle)
   Si cockpit/client-config.json contient l'adresse de TA base,
   le cockpit exige une connexion (email + mot de passe) et tes
   données vivent dans TA base — la clé publique est protégée
   par la sécurité ligne à ligne, jamais de clé secrète ici.
   Sans configuration : tout reste en local, comme avant.
   ------------------------------------------------------------ */
const SYNC = { client: null, user: null, snapshots: {}, timer: null, slug: "moi" };

async function initSupabaseSync() {
  let cfg = null;
  try {
    const res = await fetch("cockpit/client-config.json", { cache: "no-store" });
    if (res.ok) cfg = await res.json();
  } catch {
    /* pas de configuration -> mode local */
  }
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return "local";
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    SYNC.client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch {
    return "local";
  }
  const { data } = await SYNC.client.auth.getUser();
  if (!data || !data.user) return "login";
  SYNC.user = data.user;
  await pullRemote();
  return "connected";
}

function remoteCollections() {
  return { _config: state.config, ...state.data };
}

async function pullRemote() {
  try {
    const { data, error } = await SYNC.client.from("client_os_collections").select("collection,data");
    if (error || !data) return;
    const map = new Map(data.map((r) => [r.collection, r.data]));
    if (map.has("_config") && map.get("_config") && typeof map.get("_config") === "object") {
      const parsed = map.get("_config");
      state.config = {
        ...clone(DEFAULTS),
        ...parsed,
        profile: { ...DEFAULTS.profile, ...(parsed.profile || {}) },
        navOrder: sanitizeOrder(parsed.navOrder),
        navHidden: Array.isArray(parsed.navHidden)
          ? parsed.navHidden.filter((id) => id !== "cockpit" && id !== "settings" && id !== "guide")
          : [],
      };
    }
    for (const k of Object.keys(DATA_DEFAULTS)) {
      if (map.has(k) && Array.isArray(map.get(k))) state.data[k] = map.get(k);
    }
    // mêmes garanties que loadData()
    const known = new Map((state.data.automations || []).map((a) => [a.id, a]));
    state.data.automations = DEFAULT_AUTOMATIONS.map((d) => ({ ...d, ...(known.get(d.id) || {}) }));
    // point de départ des instantanés : l'état serveur fraîchement chargé
    for (const [k, v] of Object.entries(remoteCollections())) {
      SYNC.snapshots[k] = JSON.stringify(v);
    }
    saveConfig();
    saveData();
  } catch {
    /* lecture distante impossible : on garde le cache local */
  }
}

function scheduleSync() {
  if (!SYNC.user || !SYNC.client) return;
  clearTimeout(SYNC.timer);
  SYNC.timer = setTimeout(pushChanged, 700);
}

async function pushChanged() {
  if (!SYNC.user || !SYNC.client) return;
  const payloads = [];
  const now = new Date().toISOString();
  for (const [k, v] of Object.entries(remoteCollections())) {
    const json = JSON.stringify(v);
    if (SYNC.snapshots[k] !== json) {
      payloads.push({ client_slug: SYNC.slug, collection: k, data: v, updated_at: now });
      SYNC.snapshots[k] = json;
    }
  }
  if (!payloads.length) return;
  try {
    await SYNC.client.from("client_os_collections").upsert(payloads, { onConflict: "client_slug,collection" });
  } catch {
    /* la prochaine modification retentera */
  }
}

function showLoginGate() {
  const shell = byId("app-shell");
  shell.insertAdjacentHTML(
    "beforeend",
    `<div id="login-gate" style="position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:var(--bg,#0a0a0a);">
      <form id="login-form" style="width:min(360px,90vw);display:flex;flex-direction:column;gap:.65rem;">
        <img src="logo-delegation.png" alt="" style="width:44px;height:44px;border-radius:10px;margin-bottom:.4rem;" />
        <h1 style="font-size:1.3rem;margin:0;">Ton espace de pilotage</h1>
        <p style="opacity:.65;margin:0 0 .8rem;font-size:.9rem;">Connecte-toi pour retrouver tes données.</p>
        <input id="login-email" type="email" required placeholder="Ton email"
          style="padding:.7rem .9rem;border-radius:.55rem;border:1px solid var(--border,#333);background:var(--bg-card,#141414);color:inherit;" />
        <input id="login-password" type="password" required placeholder="Ton mot de passe"
          style="padding:.7rem .9rem;border-radius:.55rem;border:1px solid var(--border,#333);background:var(--bg-card,#141414);color:inherit;" />
        <button type="submit" class="btn accent" style="padding:.7rem;">Se connecter</button>
        <div id="login-error" style="color:#e5484d;font-size:.85rem;min-height:1.1rem;"></div>
      </form>
    </div>`,
  );
  byId("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    byId("login-error").textContent = "";
    const { error } = await SYNC.client.auth.signInWithPassword({
      email: byId("login-email").value.trim(),
      password: byId("login-password").value,
    });
    if (error) {
      byId("login-error").textContent = "Email ou mot de passe incorrect.";
    } else {
      window.location.reload();
    }
  });
}

/* ------------------------------------------------------------
   Persistance locale
   ------------------------------------------------------------ */
function loadConfig() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return clone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      ...clone(DEFAULTS),
      ...parsed,
      profile: { ...DEFAULTS.profile, ...(parsed.profile || {}) },
      navOrder: sanitizeOrder(parsed.navOrder),
      navHidden: Array.isArray(parsed.navHidden) ? parsed.navHidden.filter((id) => id !== "cockpit" && id !== "settings" && id !== "guide") : [],
    };
  } catch {
    return clone(DEFAULTS);
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return clone(DATA_DEFAULTS);
    const parsed = JSON.parse(raw);
    const out = { ...clone(DATA_DEFAULTS), ...parsed };
    // garantir le registre d'automatisations meme si ajout futur
    const known = new Map((out.automations || []).map((a) => [a.id, a]));
    out.automations = DEFAULT_AUTOMATIONS.map((d) => ({ ...d, ...(known.get(d.id) || {}) }));
    for (const k of ["clients", "deals", "tasks", "contents", "resources", "goals", "revenue", "approvals", "activity"]) {
      if (!Array.isArray(out[k])) out[k] = [];
    }
    return out;
  } catch {
    return clone(DATA_DEFAULTS);
  }
}

function sanitizeOrder(order) {
  const known = ZONES.map((z) => z.id);
  if (!Array.isArray(order)) return [...known];
  const kept = order.filter((id) => known.includes(id));
  for (const id of known) if (!kept.includes(id)) kept.push(id);
  const middle = kept.filter((id) => id !== "cockpit" && id !== "settings" && id !== "guide");
  return ["cockpit", ...middle, "guide", "settings"];
}

function saveConfig() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.config));
  } catch {
    /* stockage indisponible */
  }
  scheduleSync();
}

function saveData() {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(state.data));
  } catch {
    /* stockage indisponible */
  }
  scheduleSync();
}

/* ------------------------------------------------------------
   CRUD + journal d'activite
   ------------------------------------------------------------ */
function logActivity(textValue) {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  state.data.activity.unshift({ id: uid(), ts, text: textValue });
  state.data.activity = state.data.activity.slice(0, 50);
}

function addItem(collection, item) {
  state.data[collection].unshift({ id: uid(), ...item });
  saveData();
}

function removeItem(collection, id) {
  state.data[collection] = state.data[collection].filter((x) => x.id !== id);
  saveData();
}

function addApproval(approval) {
  state.data.approvals.unshift({ id: uid(), status: "pending", ...approval });
  saveData();
}

/* ------------------------------------------------------------
   Helpers texte
   ------------------------------------------------------------ */
function text(value) {
  return String(value ?? "");
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function byId(id) {
  return document.getElementById(id);
}

function truncate(value, max) {
  const v = text(value);
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

function formatEur(n) {
  const v = Number(n) || 0;
  return `${v.toLocaleString("fr-FR")} €`;
}

/* ------------------------------------------------------------
   Icones (lucide-style)
   ------------------------------------------------------------ */
const ICONS = {
  // Icônes identiques à la console de pilotage (lucide) : LayoutDashboard,
  // Megaphone, TrendingUp, Users, Truck, Gauge, Package, Settings, BookOpen.
  grid: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  share: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  cube: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4z"/><path d="M4 7V6a2 2 0 0 1 2-2h10"/><circle cx="16.5" cy="13" r="1.2"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6"/>',
  activity: '<path d="M4 13h4l2-5 4 10 2-5h4"/>',
  external: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/>',
  alert: '<path d="M12 4 3.5 19h17z"/><path d="M12 10v4"/><path d="M12 16.5v.2"/>',
  sparkles: '<path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/><path d="M18 15l.7 1.8L20.5 17l-1.8.7L18 19.5l-.7-1.8L15.5 17l1.8-.7z"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9h16"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6"/><path d="M9 16h6"/>',
  link: '<path d="M9 14a4 4 0 0 1 0-5.6l2-2a4 4 0 0 1 5.6 5.6l-1 1"/><path d="M15 10a4 4 0 0 1 0 5.6l-2 2a4 4 0 0 1-5.6-5.6l1-1"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10.5 19a1.6 1.6 0 0 0 3 0"/>',
  bot: '<rect x="5" y="8" width="14" height="10" rx="2.5"/><path d="M12 4v4"/><circle cx="9.5" cy="13" r="1"/><circle cx="14.5" cy="13" r="1"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  x: '<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
};

function icon(name, cls = "nav-icon") {
  return `<svg class="${cls}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.grid}</svg>`;
}

/* ------------------------------------------------------------
   Routing
   ------------------------------------------------------------ */
const routeIds = new Set(ZONES.map((z) => z.id));

function routeFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "").trim().split("?")[0];
  return routeIds.has(raw) ? raw : "cockpit";
}

function navigate(route) {
  if (route !== state.route) state.ui.form = null;
  window.location.hash = `#/${route}`;
}

function visibleZones() {
  const hidden = new Set(state.config.navHidden);
  return state.config.navOrder
    .map((id) => ZONES.find((z) => z.id === id))
    .filter(Boolean)
    .filter((z) => z.fixed || !hidden.has(z.id));
}

function currentZone() {
  return ZONES.find((z) => z.id === state.route) || ZONES[0];
}

/* ------------------------------------------------------------
   Shell
   ------------------------------------------------------------ */
function renderSidebar() {
  const zoneLink = (z) => `
        <a class="nav-link ${z.id === state.route ? "active" : ""}" href="#/${z.id}" data-route="${z.id}">
          ${icon(z.icon)}
          <span>${escapeHtml(z.label)}</span>
        </a>`;
  const zones = visibleZones();
  byId("sidebar-nav").innerHTML = zones
    .filter((z) => z.id !== "guide" && z.id !== "settings")
    .map(zoneLink)
    .join("");
  // Guide + Paramètres tout en bas, comme la console de pilotage.
  const foot = byId("sidebar-foot");
  if (foot) {
    foot.innerHTML = zones
      .filter((z) => z.id === "guide" || z.id === "settings")
      .map(zoneLink)
      .join("");
  }
}

function applyProfile() {
  const { businessName, ownerName } = state.config.profile;
  byId("business-name").textContent = businessName || DEFAULTS.profile.businessName;
  byId("owner-name").textContent = ownerName || DEFAULTS.profile.ownerName;
  const configured = businessName && businessName !== DEFAULTS.profile.businessName;
  const statusSub = byId("status-sub");
  if (statusSub) statusSub.textContent = configured ? "Tout est à jour" : "Prêt à personnaliser";
  document.title = configured ? `${businessName} — Mon espace` : "Mon espace";
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.config.theme || DEFAULTS.theme);
}

/* ------------------------------------------------------------
   Composants
   ------------------------------------------------------------ */
function pageHeading({ eyebrow, title, iconName, subtitle, aside = "" }) {
  return `
    <div class="page-heading">
      <div>
        <span class="eyebrow">${escapeHtml(eyebrow)}</span>
        <h1>${iconName ? icon(iconName) : ""}${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      ${aside}
    </div>`;
}

function kpiCard(label, value, sub, iconName, tone = "") {
  return `
    <article class="metric-card ${tone}">
      <div class="metric-top">
        <span class="eyebrow">${escapeHtml(label)}</span>
        ${icon(iconName)}
      </div>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(sub)}</small>
    </article>`;
}

function moduleCard(zone, desc) {
  return `
    <a class="module-card" href="#/${zone.id}" data-route="${zone.id}">
      <div class="card-top">
        ${icon(zone.icon)}
        ${icon("external", "ext-icon")}
      </div>
      <strong>${escapeHtml(zone.label)}</strong>
      <small>${escapeHtml(desc)}</small>
    </a>`;
}

function panelHead(eyebrow, title, action) {
  return `
    <div class="panel-title">
      <div class="heads">
        <span class="eyebrow">${escapeHtml(eyebrow)}</span>
        ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
      </div>
      ${action ? action : ""}
    </div>`;
}

function linkButton(label, route) {
  return `<button type="button" class="link-button" data-route="${escapeHtml(route)}">${escapeHtml(label)}</button>`;
}

function addButton(collection, label = "Ajouter") {
  return `<button type="button" class="link-button" data-addopen="${collection}">+ ${escapeHtml(label)}</button>`;
}

function emptyHint(message) {
  return `<div class="empty-hint">${escapeHtml(message)}</div>`;
}

function pill(label, tone = "neutral") {
  return `<span class="pill ${tone}">${escapeHtml(label)}</span>`;
}

function selectField(name, options, current) {
  return `<select name="${name}">${options
    .map((o) => `<option value="${escapeHtml(o)}" ${o === current ? "selected" : ""}>${escapeHtml(o)}</option>`)
    .join("")}</select>`;
}

/* Formulaire d'ajout inline (par collection) */
function addForm(collection) {
  if (state.ui.form !== collection) return "";
  const fields = {
    clients: `
      <input type="text" name="name" placeholder="Nom du client" required />
      ${selectField("status", CLIENT_STATUS, "Prospect")}
      <input type="text" name="next" placeholder="Prochaine action (optionnel)" />`,
    deals: `
      <input type="text" name="name" placeholder="Nom de l’affaire" required />
      ${selectField("stage", DEAL_STAGES, "Découverte")}
      <input type="number" name="value" placeholder="Montant (€)" min="0" step="100" />
      <input type="text" name="next" placeholder="Prochaine action (optionnel)" />`,
    tasks: `
      <input type="text" name="title" placeholder="Quoi livrer / faire" required />
      ${selectField("status", TASK_STATUS, "À faire")}
      <input type="text" name="due" placeholder="Échéance (optionnel)" />`,
    contents: `
      <input type="text" name="title" placeholder="Idée ou contenu (ex. « 3 erreurs que font mes clients »)" required />
      ${selectField("status", CONTENT_STATUS, "Idée")}
      <input type="text" name="channel" placeholder="Canal (optionnel : LinkedIn, YouTube, newsletter…)" />`,
    resources: `
      <input type="text" name="title" placeholder="Nom du raccourci / document" required />
      <input type="text" name="url" placeholder="Lien (https://…) — optionnel" />
      ${selectField("category", LINK_CATEGORIES, "Autre")}`,
    goals: `
      <input type="text" name="title" placeholder="Objectif (ex. « 10 000 € de CA ce trimestre »)" required />
      <input type="number" name="target" placeholder="Cible (nombre)" min="1" step="1" required />
      <input type="number" name="current" placeholder="Où tu en es (optionnel)" min="0" step="1" />
      <input type="text" name="deadline" placeholder="Échéance (optionnel : « fin septembre »)" />`,
    revenue: `
      <input type="text" name="source" placeholder="D’où vient l’argent (ex. « Accompagnement Sophie »)" required />
      <input type="number" name="amount" placeholder="Montant (€)" min="0" step="10" required />
      <input type="text" name="date" placeholder="Quand (optionnel : « 4 juillet »)" />`,
  };
  return `
    <form class="add-form" data-addsubmit="${collection}">
      ${fields[collection] || ""}
      <div class="add-form-actions">
        <button type="submit" class="btn accent sm">Ajouter</button>
        <button type="button" class="btn ghost sm" data-addcancel="1">Annuler</button>
      </div>
    </form>`;
}

function rowActionsCell(buttons) {
  return `<div class="row-actions">${buttons.join("")}</div>`;
}

function delBtn(collection, id) {
  return `<button type="button" class="icon-btn" data-del="${collection}:${id}" aria-label="Supprimer">${icon("x", "nav-icon")}</button>`;
}

function prepareBtn(kind, id, label) {
  return `<button type="button" class="btn ghost sm" data-prepare="${kind}:${id}">${escapeHtml(label)}</button>`;
}

/* ------------------------------------------------------------
   Metriques calculees
   ------------------------------------------------------------ */
function metrics() {
  const d = state.data;
  const won = d.deals.filter((x) => x.stage === "Gagné");
  const open = d.deals.filter((x) => x.stage !== "Gagné" && x.stage !== "Perdu");
  const revenue = won.reduce((s, x) => s + (Number(x.value) || 0), 0);
  const pipelineValue = open.reduce((s, x) => s + (Number(x.value) || 0), 0);
  const activeClients = d.clients.filter((x) => x.status === "Actif").length;
  const openTasks = d.tasks.filter((x) => x.status !== "Fait").length;
  const pending = d.approvals.filter((x) => x.status === "pending").length;
  return { won, open, revenue, pipelineValue, activeClients, openTasks, pending, clients: d.clients.length };
}

/* ------------------------------------------------------------
   Pages
   ------------------------------------------------------------ */
function renderCockpit() {
  const { objective } = state.config.profile;
  const progress = Math.max(0, Math.min(100, Number(state.config.priorityProgress) || 0));
  const m = metrics();
  const moduleZones = ["acquisition", "sales", "clients", "delivery", "pilotage", "resources"]
    .map((id) => ZONES.find((z) => z.id === id))
    .filter((z) => z && !state.config.navHidden.includes(z.id));
  const moduleDesc = {
    acquisition: "Tes contenus, tes sources de visibilité et tes idées.",
    sales: "Tes offres, ton pipeline, tes paiements et tes relances.",
    clients: "Tes clients, leur suivi et tes prochaines actions.",
    delivery: "Ce que tu dois livrer, avec statut et preuve.",
    pilotage: "Tes objectifs chiffrés, tes revenus et tes automatisations.",
    resources: "Tes documents, tes raccourcis et tes guides.",
  };

  const recent = state.data.activity.slice(0, 5);
  const todo = [
    ...state.data.approvals.filter((a) => a.status === "pending").map((a) => ({ label: a.title, sub: "À valider", route: "pilotage" })),
    ...state.data.tasks.filter((t) => t.status !== "Fait").slice(0, 4).map((t) => ({ label: t.title, sub: t.status, route: "delivery" })),
  ].slice(0, 5);

  return `
    ${pageHeading({
      eyebrow: "Mon cockpit",
      title: "Vue d’ensemble",
      iconName: "grid",
      subtitle: "Tes priorités, ton activité, tes clients et tes automatisations — au même endroit.",
    })}

    <section class="metrics-grid">
      ${kpiCard("Revenus (gagnés)", m.revenue ? formatEur(m.revenue) : "—", m.revenue ? "Affaires gagnées" : "À connecter", "wallet")}
      ${kpiCard("Affaires en cours", m.open.length ? String(m.open.length) : "—", m.pipelineValue ? `Pipeline ${formatEur(m.pipelineValue)}` : "Ton pipeline", "activity")}
      ${kpiCard("Clients actifs", m.clients ? String(m.activeClients) : "—", m.clients ? `${m.clients} au total` : "En cours", "users")}
      ${kpiCard("Progression objectif", progress ? `${progress}%` : "—", objective ? "Priorité du mois" : "Objectif à définir", "target")}
    </section>

    <section class="module-grid">
      ${moduleZones.map((z) => moduleCard(z, moduleDesc[z.id])).join("")}
    </section>

    <section class="split-grid weighted">
      <article class="panel objective-panel">
        ${panelHead("Priorité du mois", "", linkButton(objective ? "Modifier" : "Définir", "settings"))}
        <span class="obj-value ${objective ? "" : "muted"}">${objective ? escapeHtml(truncate(objective, 64)) : "À définir"}</span>
        <p>${objective ? "Ta priorité est fixée. Garde le cap, le reste s’aligne derrière." : "Choisis la seule chose qui compte vraiment ce mois-ci. Tu pourras la suivre ici."}</p>
        <div class="progress"><span style="width: ${progress}%"></span></div>
      </article>

      <article class="panel">
        ${panelHead("Ton assistant", "", linkButton("Ouvrir Agent IA", "agent"))}
        <p class="panel-note">Branche ton assistant (Claude, Codex, ou celui que tu utilises déjà) sur ton espace : il fait le point, met tes pages à jour quand tu lui parles, et tout envoi vers l’extérieur attend ton feu vert. Le prompt de branchement t’attend dans Agent IA.</p>
      </article>
    </section>

    <section class="split-grid">
      <article class="panel">
        ${panelHead("À traiter aujourd’hui", "", linkButton("Voir tout", "pilotage"))}
        ${
          todo.length
            ? `<div class="row-list">${todo
                .map(
                  (t) => `
                  <div class="row" data-route="${t.route}" style="cursor:pointer">
                    <div class="row-main"><strong>${escapeHtml(t.label)}</strong><span class="sub">${escapeHtml(t.sub)}</span></div>
                    ${pill("Ouvrir", "todo")}
                  </div>`,
                )
                .join("")}</div>`
            : emptyHint("Rien d’urgent. Quand une tâche, une relance ou une validation arrive, tu la retrouves ici en premier.")
        }
      </article>

      <article class="panel">
        ${panelHead("Activité récente", "", linkButton("Pilotage", "pilotage"))}
        ${
          recent.length
            ? `<div class="timeline">${recent
                .map(
                  (a) => `<div class="t-item"><time>${escapeHtml(a.ts)}</time><div class="t-body"><strong>${escapeHtml(a.text)}</strong></div></div>`,
                )
                .join("")}</div>`
            : emptyHint("Tes dernières actions et celles de ton assistant apparaîtront ici.")
        }
      </article>
    </section>`;
}

function renderAcquisition() {
  const contents = state.data.contents;
  const count = (s) => contents.filter((c) => c.status === s).length;
  return `
    ${pageHeading({
      eyebrow: "Acquisition",
      title: "Contenu et visibilité",
      iconName: "share",
      subtitle: "Tout ce qui te fait connaître et qui amène des prospects, réuni ici.",
    })}

    <section class="metrics-grid">
      ${kpiCard("Idées en stock", contents.length ? String(count("Idée")) : "—", "Prêtes à produire", "sparkles")}
      ${kpiCard("En cours", contents.length ? String(count("En cours")) : "—", "En production", "activity")}
      ${kpiCard("Publiés", contents.length ? String(count("Publié")) : "—", "En ligne", "check")}
    </section>

    <section class="panel">
      ${panelHead("Tes idées et contenus", "De l’idée à la publication", addButton("contents", "Ajouter une idée"))}
      ${addForm("contents")}
      ${
        contents.length
          ? `<div class="table-wrap"><table class="data-table">
              <thead><tr><th>Contenu</th><th>Statut</th><th>Canal</th><th></th></tr></thead>
              <tbody>${contents
                .map(
                  (x) => `<tr>
                    <td>${escapeHtml(x.title)}</td>
                    <td>${pill(x.status, x.status === "Publié" ? "ok" : x.status === "En cours" ? "info" : "neutral")}</td>
                    <td>${escapeHtml(x.channel || "—")}</td>
                    <td>${rowActionsCell([
                      `<button type="button" class="btn ghost sm" data-contentnext="${x.id}">${x.status === "Idée" ? "Lancer" : x.status === "En cours" ? "Marquer publié" : "Repartir en idée"}</button>`,
                      delBtn("contents", x.id),
                    ])}</td>
                  </tr>`,
                )
                .join("")}</tbody></table></div>`
          : emptyHint("Aucune idée pour l’instant. Ajoute ta première idée de contenu — ou demande à ton assistant : « prépare mon plan de contenu de la semaine ».")
      }
    </section>

    <section class="panel">
      ${panelHead("Ton plan de la semaine, préparé pour toi", "", linkButton("Ouvrir le guide", "guide"))}
      <p class="panel-note">Dans le Guide, la fiche Acquisition contient un prompt prêt à donner à ton assistant IA : il te prépare 3 idées par canal, avec les accroches, et les range ici.</p>
    </section>`;
}

function renderSales() {
  const m = metrics();
  const deals = state.data.deals;
  return `
    ${pageHeading({
      eyebrow: "Ventes",
      title: "Offres et paiements",
      iconName: "trend",
      subtitle: "Tes offres, ton pipeline, tes paiements et tes relances, lisibles d’un coup d’œil.",
    })}

    <section class="metrics-grid">
      ${kpiCard("Encaissé (gagné)", m.revenue ? formatEur(m.revenue) : "—", m.won.length ? `${m.won.length} affaire(s)` : "À connecter", "wallet")}
      ${kpiCard("Pipeline ouvert", m.open.length ? String(m.open.length) : "—", m.pipelineValue ? formatEur(m.pipelineValue) : "Dans ton pipeline", "activity")}
      ${kpiCard("Affaires gagnées", m.won.length ? String(m.won.length) : "—", "Ce mois", "check")}
      ${kpiCard("Total suivi", deals.length ? String(deals.length) : "—", "Toutes affaires", "trend")}
    </section>

    <section class="panel">
      ${panelHead("Pipeline", "Tes affaires", addButton("deals", "Ajouter une affaire"))}
      ${addForm("deals")}
      ${
        deals.length
          ? `<div class="table-wrap"><table class="data-table">
              <thead><tr><th>Affaire</th><th>Étape</th><th>Montant</th><th>Prochaine action</th><th></th></tr></thead>
              <tbody>${deals
                .map(
                  (x) => `<tr>
                    <td>${escapeHtml(x.name)}</td>
                    <td>${pill(x.stage, x.stage === "Gagné" ? "ok" : x.stage === "Perdu" ? "neutral" : "info")}</td>
                    <td class="num">${x.value ? formatEur(x.value) : "—"}</td>
                    <td>${escapeHtml(x.next || "—")}</td>
                    <td>${rowActionsCell([prepareBtn("deal", x.id, "Préparer la relance"), delBtn("deals", x.id)])}</td>
                  </tr>`,
                )
                .join("")}</tbody></table></div>`
          : emptyHint("Ton pipeline est vide. Ajoute ta première affaire pour la suivre, ou connecte tes paiements pour le remplir tout seul.")
      }
    </section>`;
}

function renderClients() {
  const m = metrics();
  const clients = state.data.clients;
  return `
    ${pageHeading({
      eyebrow: "Clients",
      title: "Suivi et relation",
      iconName: "users",
      subtitle: "Tes clients, leur suivi et tes prochaines actions, sans rien oublier.",
    })}

    <section class="metrics-grid">
      ${kpiCard("Clients actifs", clients.length ? String(m.activeClients) : "—", "En cours", "users")}
      ${kpiCard("Au total", clients.length ? String(clients.length) : "—", "Suivis", "check")}
      ${kpiCard("Prospects", clients.length ? String(clients.filter((c) => c.status === "Prospect").length) : "—", "À convertir", "bell")}
    </section>

    <section class="panel">
      ${panelHead("Tes clients", "", addButton("clients", "Ajouter un client"))}
      ${addForm("clients")}
      ${
        clients.length
          ? `<div class="table-wrap"><table class="data-table">
              <thead><tr><th>Client</th><th>Statut</th><th>Prochaine action</th><th></th></tr></thead>
              <tbody>${clients
                .map(
                  (x) => `<tr>
                    <td>${escapeHtml(x.name)}</td>
                    <td>${pill(x.status, x.status === "Actif" ? "ok" : x.status === "Prospect" ? "info" : "neutral")}</td>
                    <td>${escapeHtml(x.next || "—")}</td>
                    <td>${rowActionsCell([prepareBtn("client", x.id, "Préparer un message"), delBtn("clients", x.id)])}</td>
                  </tr>`,
                )
                .join("")}</tbody></table></div>`
          : emptyHint("Aucun client pour l’instant. Ajoute ton premier client pour suivre sa relation, ses échéances et tes prochaines actions.")
      }
    </section>`;
}

function renderDelivery() {
  const tasks = state.data.tasks;
  return `
    ${pageHeading({
      eyebrow: "À délivrer",
      title: "Tâches et livrables",
      iconName: "truck",
      subtitle: "Ce que tu dois livrer, avec un statut clair. Plus rien ne passe à la trappe.",
    })}

    <section class="panel">
      ${panelHead("File de livraison", "Ce qui reste à faire", addButton("tasks", "Ajouter une tâche"))}
      ${addForm("tasks")}
      ${
        tasks.length
          ? `<div class="row-list">${tasks
              .map(
                (x) => `
                <div class="row">
                  <div class="row-main">
                    <strong>${escapeHtml(x.title)}</strong>
                    <span class="sub">${escapeHtml(x.status)}${x.due ? ` · ${escapeHtml(x.due)}` : ""}</span>
                  </div>
                  ${rowActionsCell([
                    `<button type="button" class="btn ghost sm" data-tasktoggle="${x.id}">${x.status === "Fait" ? "Rouvrir" : "Marquer fait"}</button>`,
                    delBtn("tasks", x.id),
                  ])}
                </div>`,
              )
              .join("")}</div>`
          : emptyHint("Rien à livrer pour le moment. Ajoute une tâche : tu gardes un statut clair et tu avances sans trou.")
      }
    </section>`;
}

/* ------------------------------------------------------------
   Vue d'ensemble — le graphe de ton espace. Chaque domaine est un
   nœud doré ; chaque client, vente, tâche, contenu, ressource et
   objectif est une boule colorée reliée à son domaine.
   Molette = zoom, glisser = déplacer, clic = ouvrir la page.
   ------------------------------------------------------------ */
const GRAPH_TYPES = {
  page: { color: "#d4a574", label: "Page" },
  client: { color: "#e8e6e3", label: "Client" },
  deal: { color: "#4ade80", label: "Vente" },
  task: { color: "#9ca3af", label: "Tâche" },
  content: { color: "#fb923c", label: "Contenu" },
  resource: { color: "#60a5fa", label: "Ressource" },
  goal: { color: "#a78bfa", label: "Objectif" },
};

const GRAPH = { nodes: [], edges: [], zoom: 1, panX: 0, panY: 0, canvas: null, hover: null };

/* Petit hasard stable par id : le graphe garde la même forme d'un rendu à l'autre. */
function seeded(id, salt) {
  let h = 2166136261;
  const str = `${id}:${salt}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function buildGraph() {
  const d = state.data;
  const configured = state.config.profile.businessName && state.config.profile.businessName !== DEFAULTS.profile.businessName;
  const hubs = [
    { id: "hub-cockpit", route: "cockpit", label: "Cockpit", items: [] },
    { id: "hub-sales", route: "sales", label: "Ventes", items: d.deals.map((x) => ({ id: x.id, label: x.name, type: "deal" })) },
    { id: "hub-clients", route: "clients", label: "Clients", items: d.clients.map((x) => ({ id: x.id, label: x.name, type: "client" })) },
    { id: "hub-delivery", route: "delivery", label: "À délivrer", items: d.tasks.map((x) => ({ id: x.id, label: x.title, type: "task" })) },
    { id: "hub-acquisition", route: "acquisition", label: "Acquisition", items: d.contents.map((x) => ({ id: x.id, label: x.title, type: "content" })) },
    { id: "hub-pilotage", route: "pilotage", label: "Pilotage", items: d.goals.map((x) => ({ id: x.id, label: x.title, type: "goal" })) },
    { id: "hub-resources", route: "resources", label: "Ressources", items: d.resources.map((x) => ({ id: x.id, label: x.title, type: "resource" })) },
  ];
  const nodes = [{ id: "center", label: configured ? state.config.profile.businessName : "Cockpit", type: "page", route: "cockpit", x: 0, y: 0, r: 11 }];
  const edges = [];
  const hubCount = hubs.length;
  hubs.forEach((hub, i) => {
    const angle = (i / hubCount) * Math.PI * 2 - Math.PI / 2;
    const hx = Math.cos(angle) * 150;
    const hy = Math.sin(angle) * 150;
    nodes.push({ id: hub.id, label: hub.label, type: "page", route: hub.route, x: hx, y: hy, r: 8, hub: true });
    edges.push(["center", hub.id]);
    hub.items.slice(0, 40).forEach((item, j) => {
      const spread = Math.PI / 2.1;
      const a = angle - spread / 2 + spread * seeded(item.id, "a") + (j % 3) * 0.06;
      const dist = 46 + seeded(item.id, "d") * 74 + (j % 5) * 7;
      nodes.push({
        id: `${hub.id}:${item.id}`,
        label: item.label,
        type: item.type,
        route: hub.route,
        x: hx + Math.cos(a) * dist,
        y: hy + Math.sin(a) * dist,
        r: 3.4,
      });
      edges.push([hub.id, `${hub.id}:${item.id}`]);
    });
  });
  GRAPH.nodes = nodes;
  GRAPH.edges = edges;
}

function graphToScreen(n) {
  const c = GRAPH.canvas;
  return {
    x: c.clientWidth / 2 + (n.x + GRAPH.panX) * GRAPH.zoom,
    y: c.clientHeight / 2 + (n.y + GRAPH.panY) * GRAPH.zoom,
  };
}

function drawGraph() {
  const c = GRAPH.canvas;
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (c.width !== w * dpr || c.height !== h * dpr) {
    c.width = w * dpr;
    c.height = h * dpr;
  }
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const byNodeId = new Map(GRAPH.nodes.map((n) => [n.id, n]));

  ctx.lineWidth = 1;
  for (const [a, b] of GRAPH.edges) {
    const na = byNodeId.get(a);
    const nb = byNodeId.get(b);
    if (!na || !nb) continue;
    const pa = graphToScreen(na);
    const pb = graphToScreen(nb);
    ctx.strokeStyle = "rgba(140,140,140,0.14)";
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  for (const n of GRAPH.nodes) {
    const p = graphToScreen(n);
    const color = (GRAPH_TYPES[n.type] || GRAPH_TYPES.page).color;
    const r = n.r * GRAPH.zoom;
    const isHover = GRAPH.hover === n.id;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isHover ? r * 1.35 : r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = n.hub || n.id === "center" ? 14 : isHover ? 12 : 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    if (n.hub || n.id === "center" || isHover) {
      ctx.font = `${n.hub || n.id === "center" ? 600 : 400} ${Math.max(10, 11 * Math.min(GRAPH.zoom, 1.4))}px Inter, sans-serif`;
      ctx.fillStyle = isHover && !n.hub && n.id !== "center" ? color : "rgba(235,232,228,0.92)";
      ctx.fillText(truncate(n.label, 28), p.x + r + 5, p.y + 3.5);
    }
  }
}

function graphHit(mx, my) {
  let best = null;
  for (const n of GRAPH.nodes) {
    const p = graphToScreen(n);
    const r = Math.max(n.r * GRAPH.zoom, 6) + 3;
    const dx = mx - p.x;
    const dy = my - p.y;
    if (dx * dx + dy * dy <= r * r) best = n;
  }
  return best;
}

function wireGraph() {
  const c = byId("space-graph");
  if (!c) return;
  GRAPH.canvas = c;
  buildGraph();
  drawGraph();

  let dragging = false;
  let moved = false;
  let last = null;

  c.addEventListener("mousedown", (e) => {
    dragging = true;
    moved = false;
    last = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
  });
  c.addEventListener("mousemove", (e) => {
    const rect = c.getBoundingClientRect();
    if (dragging && last) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      GRAPH.panX += dx / GRAPH.zoom;
      GRAPH.panY += dy / GRAPH.zoom;
      last = { x: e.clientX, y: e.clientY };
      drawGraph();
      return;
    }
    const hit = graphHit(e.clientX - rect.left, e.clientY - rect.top);
    const id = hit ? hit.id : null;
    if (id !== GRAPH.hover) {
      GRAPH.hover = id;
      c.style.cursor = hit ? "pointer" : "grab";
      drawGraph();
    }
  });
  c.addEventListener("mouseleave", () => {
    if (GRAPH.hover) {
      GRAPH.hover = null;
      drawGraph();
    }
  });
  c.addEventListener("click", (e) => {
    if (moved) return;
    const rect = c.getBoundingClientRect();
    const hit = graphHit(e.clientX - rect.left, e.clientY - rect.top);
    if (hit && hit.route && hit.route !== state.route) navigate(hit.route);
    else if (hit && hit.route) render();
  });
  c.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      GRAPH.zoom = Math.max(0.4, Math.min(3, GRAPH.zoom * factor));
      drawGraph();
    },
    { passive: false },
  );

  document.querySelectorAll("[data-graph]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const op = btn.dataset.graph;
      if (op === "in") GRAPH.zoom = Math.min(3, GRAPH.zoom * 1.25);
      else if (op === "out") GRAPH.zoom = Math.max(0.4, GRAPH.zoom / 1.25);
      else if (op === "center") {
        GRAPH.zoom = 1;
        GRAPH.panX = 0;
        GRAPH.panY = 0;
      } else if (op === "refresh") buildGraph();
      drawGraph();
    }),
  );
}

function overviewGraph() {
  const legend = Object.entries(GRAPH_TYPES)
    .map(([, t]) => `<span class="legend-item"><i style="background:${t.color}"></i>${escapeHtml(t.label)}</span>`)
    .join("");
  return `
    <section class="panel graph-panel">
      ${panelHead(
        "Vue d’ensemble",
        "Tout ton espace, connecté — clique sur une boule pour ouvrir",
        `<div class="graph-controls">
          <button type="button" class="btn ghost sm" data-graph="out">−</button>
          <button type="button" class="btn ghost sm" data-graph="in">+</button>
          <button type="button" class="btn ghost sm" data-graph="center">Recentrer</button>
          <button type="button" class="btn ghost sm" data-graph="refresh">Rafraîchir</button>
        </div>`,
      )}
      <div class="graph-wrap">
        <canvas id="space-graph"></canvas>
        <span class="graph-hint">molette = zoom · glisser = déplacer · clic = ouvrir</span>
      </div>
      <div class="graph-legend">${legend}</div>
    </section>`;
}

/* La palette d'outils de l'assistant — chaque tuile = un outil réel du
   connecteur. Clic = ouvre la page concernée, formulaire prêt si utile. */
const ASSISTANT_TOOLS = [
  { id: "point", icon: "sparkles", name: "Faire le point", desc: "« récap de la semaine » : ce qui a bougé, ce qui t’attend, quoi faire en premier.", tool: "voir_espace", to: "cockpit" },
  { id: "task", icon: "truck", name: "Ajouter une tâche", desc: "« ajoute une tâche : préparer le rendez-vous de jeudi » → dans À délivrer.", tool: "ajouter_element", to: "delivery", form: "tasks" },
  { id: "deal", icon: "trend", name: "Suivre une affaire", desc: "« ajoute l’affaire Martin 2 000 € » → direct dans ton pipeline.", tool: "ajouter_element", to: "sales", form: "deals" },
  { id: "client", icon: "users", name: "Ajouter un client", desc: "« ajoute le client Sophie » → sa fiche est créée, avec la prochaine action.", tool: "ajouter_element", to: "clients", form: "clients" },
  { id: "relance", icon: "bell", name: "Préparer tes relances", desc: "Il écrit tes relances et les dépose dans « À valider » — rien ne part sans toi.", tool: "deposer_validation", to: "sales" },
  { id: "goal", icon: "target", name: "Fixer un objectif chiffré", desc: "Cible + où tu en es, suivi dans Pilotage.", tool: "ajouter_element", to: "pilotage", form: "goals" },
  { id: "revenue", icon: "wallet", name: "Noter un encaissement", desc: "Ton vrai chiffre, pas une impression.", tool: "ajouter_element", to: "pilotage", form: "revenue" },
  { id: "resource", icon: "link", name: "Ranger un lien", desc: "Paiement, agenda, formulaire… retrouvé en 5 secondes.", tool: "ajouter_element", to: "resources", form: "resources" },
  { id: "content", icon: "share", name: "Garder une idée de contenu", desc: "De l’idée à la publication, dans Acquisition.", tool: "ajouter_element", to: "acquisition", form: "contents" },
  { id: "priorite", icon: "gauge", name: "Définir ta priorité du mois", desc: "Affichée en grand sur ton cockpit, pour garder le cap.", tool: "definir_priorite", to: "settings" },
  { id: "journal", icon: "activity", name: "Tracer tout ce qui est fait", desc: "Chaque action est notée dans ton journal d’activité.", tool: "noter_activite", to: "pilotage" },
];

function toolPalette() {
  return `
    <section class="panel">
      ${panelHead("Ce qu’il sait faire, une fois branché", "Clique sur un outil pour ouvrir la page concernée", null)}
      <div class="tool-grid">
        ${ASSISTANT_TOOLS.map(
          (t) => `
          <button type="button" class="tool-tile" data-tool="${t.id}">
            ${icon(t.icon)}
            <strong>${escapeHtml(t.name)}</strong>
            <small>${escapeHtml(t.desc)}</small>
            <span class="tool-badge">${escapeHtml(t.tool)}</span>
          </button>`,
        ).join("")}
      </div>
      <p class="panel-note" style="margin-top:0.8rem">Chaque tuile est un vrai outil de ton assistant : tu lui dis la phrase, il fait l’action dans ton espace — et tout envoi vers l’extérieur attend ton feu vert.</p>
    </section>`;
}

function approvalsPanel() {
  const pending = state.data.approvals.filter((a) => a.status === "pending");
  return `
      <article class="panel">
        ${panelHead("À valider", "Ton assistant attend ton feu vert", null)}
        ${
          pending.length
            ? `<div class="approval-list">${pending
                .map(
                  (a) => `
                  <div class="approval">
                    <div class="approval-head">
                      ${pill(a.source || "Assistant", "todo")}
                      <strong>${escapeHtml(a.title)}</strong>
                    </div>
                    ${a.detail ? `<p class="approval-detail">${escapeHtml(a.detail)}</p>` : ""}
                    <div class="approval-actions">
                      <button type="button" class="btn accent sm" data-approve="${a.id}">Valider</button>
                      <button type="button" class="btn ghost sm" data-reject="${a.id}">Rejeter</button>
                    </div>
                  </div>`,
                )
                .join("")}</div>`
            : emptyHint("Rien à valider. Quand ton assistant prépare un message, une relance ou une action, elle attend ici ton feu vert avant de partir.")
        }
      </article>`;
}

function renderAgent() {
  return `
    ${pageHeading({
      eyebrow: "Agent IA",
      title: "Ton assistant",
      iconName: "bot",
      subtitle: "Branché sur ton espace, il le lit et le met à jour pour toi. Tu valides, il exécute.",
    })}

    ${overviewGraph()}

    <section class="panel">
      ${panelHead("Brancher ton assistant", "5 minutes, guidé — c’est lui qui fait tout", null)}
      <p class="panel-note">Ton assistant (Claude, Codex, ou celui que tu utilises déjà) peut être branché directement sur ton espace : il fera le point pour toi, ajoutera tes ventes, tes clients et tes tâches quand tu lui parles, et déposera ses propositions dans « À valider ». <strong>Ce que fait le prompt ci-dessous</strong> : il installe le petit connecteur de ton espace, fait un test avec toi (une tâche « Test » qui apparaît puis se coche), puis ton assistant prend son poste — pour toutes vos prochaines sessions.</p>
      <div class="how-steps">
        <div><span class="step-num">1</span><div class="step-body"><strong>Ouvre ton assistant IA</strong><span>Sur ton ordinateur, comme d’habitude.</span></div></div>
        <div><span class="step-num">2</span><div class="step-body"><strong>Colle le prompt de branchement</strong><span>Il te guide, une étape à la fois. Il ne te demande jamais ton mot de passe dans la discussion.</span></div></div>
        <div><span class="step-num">3</span><div class="step-body"><strong>Vérifie le test ensemble</strong><span>Une tâche « Test de mon assistant » apparaît dans À délivrer : c’est branché.</span></div></div>
      </div>
      ${copyRow("section:agent", "Copier le prompt de branchement", "Rien ne part sans ton feu vert : tout envoi passe par « À valider ».")}
    </section>

    ${toolPalette()}

    <section class="split-grid weighted">
      ${approvalsPanel()}

      <article class="panel">
        ${panelHead("Comment il travaille", "", linkButton("Automatisations", "pilotage"))}
        <div class="guide-rows">
          <div>${icon("bot")}<div><strong>Tu parles, il agit</strong><span>Une phrase suffit : il choisit le bon outil, fait l’action, et te montre le résultat.</span></div></div>
          <div>${icon("grid")}<div><strong>Ton espace est sa mémoire</strong><span>Il le relit à chaque session — tes clients, tes chiffres, tes priorités. Tu ne répètes jamais.</span></div></div>
          <div>${icon("check")}<div><strong>Tu gardes la main</strong><span>Tout ce qui part vers l’extérieur (relance, email, message) attend ton feu vert dans « À valider ».</span></div></div>
          <div>${icon("activity")}<div><strong>Tout est tracé</strong><span>Chaque action est notée dans ton journal d’activité — tu vois toujours qui a fait quoi.</span></div></div>
        </div>
      </article>
    </section>`;
}

function goalRow(g) {
  const target = Math.max(1, Number(g.target) || 1);
  const current = Math.max(0, Number(g.current) || 0);
  const pct = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
  return `
    <div class="row">
      <div class="row-main">
        <strong>${escapeHtml(g.title)}</strong>
        <span class="sub">${current.toLocaleString("fr-FR")} / ${target.toLocaleString("fr-FR")}${g.deadline ? ` · ${escapeHtml(g.deadline)}` : ""}</span>
        <div class="progress"><span style="width:${pct}%"></span></div>
      </div>
      ${rowActionsCell([
        `<input type="number" class="goal-input" value="${current}" min="0" step="1" data-goalcur="${g.id}" aria-label="Avancement de ${escapeHtml(g.title)}" />`,
        delBtn("goals", g.id),
      ])}
    </div>`;
}

function renderPilotage() {
  const autos = state.data.automations;
  const recent = state.data.activity.slice(0, 8);
  const goals = state.data.goals;
  const revenue = state.data.revenue;
  const totalRevenue = revenue.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return `
    ${pageHeading({
      eyebrow: "Pilotage",
      title: "Objectifs, chiffres et automatisations",
      iconName: "gauge",
      subtitle: "Tes objectifs, ton argent encaissé, ce que ton système fait pour toi. Ton assistant vit dans l’onglet Agent IA.",
    })}

    <section class="split-grid weighted">
      <article class="panel">
        ${panelHead("Tes objectifs", "Des chiffres, pas des intentions", addButton("goals", "Ajouter un objectif"))}
        ${addForm("goals")}
        ${
          goals.length
            ? `<div class="row-list">${goals.map(goalRow).join("")}</div>`
            : emptyHint("Fixe 1 à 3 objectifs chiffrés (chiffre d’affaires, clients, contenus publiés) et mets-les à jour chaque semaine.")
        }
      </article>

      <article class="panel">
        ${panelHead("Revenus encaissés", totalRevenue ? `Total : ${formatEur(totalRevenue)}` : "Ce qui est vraiment rentré", addButton("revenue", "Noter un revenu"))}
        ${addForm("revenue")}
        ${
          revenue.length
            ? `<div class="row-list">${revenue
                .slice(0, 8)
                .map(
                  (r) => `
                  <div class="row">
                    <div class="row-main">
                      <strong>${escapeHtml(r.source)}</strong>
                      ${r.date ? `<span class="sub">${escapeHtml(r.date)}</span>` : ""}
                    </div>
                    ${rowActionsCell([`<span class="pill ok">${escapeHtml(formatEur(r.amount))}</span>`, delBtn("revenue", r.id)])}
                  </div>`,
                )
                .join("")}</div>`
            : emptyHint("Note chaque encaissement (ou laisse ton assistant le faire) : tu verras ton vrai chiffre, pas une impression.")
        }
      </article>
    </section>

    <section class="split-grid weighted">
      <article class="panel">
        ${panelHead("Tes automatisations", "Active ce que ton assistant fait pour toi", null)}
        <div>${autos
          .map(
            (a) => `
            <div class="toggle-row">
              <div class="t-label">
                <strong>${escapeHtml(a.name)}</strong>
                <small>${escapeHtml(a.desc)}</small>
              </div>
              <button type="button" class="switch ${a.on ? "on" : ""}" data-automation="${a.id}" role="switch" aria-checked="${a.on}" aria-label="Activer ${escapeHtml(a.name)}"></button>
            </div>`,
          )
          .join("")}</div>
      </article>

      <article class="panel">
        ${panelHead("Activité récente", "", null)}
        ${
          recent.length
            ? `<div class="timeline">${recent
                .map((a) => `<div class="t-item"><time>${escapeHtml(a.ts)}</time><div class="t-body"><strong>${escapeHtml(a.text)}</strong></div></div>`)
                .join("")}</div>`
            : emptyHint("L’historique de tes actions et de celles de ton assistant apparaîtra ici.")
        }
      </article>
    </section>`;
}

function renderResources() {
  const resources = state.data.resources;
  const guides = [
    { name: "Guide de prise en main", desc: "Chaque page expliquée, et les prompts à donner à ton assistant.", route: "guide", cta: "Ouvrir le guide" },
    { name: "Ton assistant", desc: "Ce qu’il sait faire, et comment le brancher sur tes vraies données.", route: "agent", cta: "Ouvrir Agent IA" },
  ];
  // Catégories affichées = celles du socle + toutes celles créées par le client ou son assistant.
  const usedCats = [
    ...LINK_CATEGORIES.filter((cat) => resources.some((x) => (x.category || "Autre") === cat)),
    ...[...new Set(resources.map((x) => x.category || "Autre"))].filter((c) => !LINK_CATEGORIES.includes(c)).sort(),
  ];
  return `
    ${pageHeading({
      eyebrow: "Ressources",
      title: "Documents et raccourcis",
      iconName: "cube",
      subtitle: "Tes guides, tes raccourcis et tes documents au même endroit, sans dépendre d’une vieille conversation.",
    })}

    <section class="panel">
      ${panelHead("Tes raccourcis", "", addButton("resources", "Ajouter un raccourci"))}
      ${addForm("resources")}
      ${
        resources.length
          ? usedCats
              .map(
                (cat) => `
                <div class="link-group">
                  <h3 class="link-cat">${escapeHtml(cat)}</h3>
                  <div class="row-list">${resources
                    .filter((x) => (x.category || "Autre") === cat)
                    .map(
                      (x) => `
                      <div class="row">
                        <div class="row-main">
                          <strong>${escapeHtml(x.title)}</strong>
                          ${x.url ? `<span class="sub">${escapeHtml(truncate(x.url, 48))}</span>` : ""}
                        </div>
                        ${rowActionsCell([
                          x.url ? `<a class="btn ghost sm" href="${escapeHtml(x.url)}" target="_blank" rel="noopener">Ouvrir</a>` : "",
                          delBtn("resources", x.id),
                        ])}
                      </div>`,
                    )
                    .join("")}</div>
                </div>`,
              )
              .join("")
          : emptyHint("Ajoute tes liens et outils importants (paiement, agenda, formulaires, communauté) pour les retrouver en un clic — comme un vrai tableau de bord.")
      }
    </section>

    <section class="resource-grid">
      ${guides
        .map(
          (r) => `
            <article class="resource-card">
              <span class="pill neutral">${escapeHtml(r.name)}</span>
              <p class="r-desc">${escapeHtml(r.desc)}</p>
              <div class="r-actions"><button type="button" class="btn ghost sm" data-route="${escapeHtml(r.route)}">${escapeHtml(r.cta)}</button></div>
            </article>`,
        )
        .join("")}
    </section>`;
}

/* ------------------------------------------------------------
   Parametres
   ------------------------------------------------------------ */
function renderSettings() {
  const { profile } = state.config;
  const progress = Math.max(0, Math.min(100, Number(state.config.priorityProgress) || 0));

  const themeSwatches = THEMES.map((t) => `
    <button type="button" class="theme-swatch ${t.id === state.config.theme ? "active" : ""}" data-theme-choice="${t.id}">
      <span class="swatch-dots">${t.dots.map((c) => `<i style="background:${c}"></i>`).join("")}</span>
      <span class="s-name">${escapeHtml(t.name)}</span>
    </button>`).join("");

  const hideable = ZONES.filter((z) => !z.fixed);
  const orderedHideable = state.config.navOrder.map((id) => hideable.find((z) => z.id === id)).filter(Boolean);

  const menuToggles = hideable
    .map((z) => {
      const on = !state.config.navHidden.includes(z.id);
      return `
        <div class="toggle-row">
          <div class="t-label"><strong>${escapeHtml(z.label)}</strong><small>${escapeHtml(z.subtitle)}</small></div>
          <button type="button" class="switch ${on ? "on" : ""}" data-toggle-zone="${z.id}" role="switch" aria-checked="${on}" aria-label="Afficher ${escapeHtml(z.label)}"></button>
        </div>`;
    })
    .join("");

  const reorderRows = orderedHideable
    .map((z, idx) => `
      <div class="reorder-item">
        <span class="order-num">${String(idx + 1).padStart(2, "0")}</span>
        <span>${escapeHtml(z.label)}</span>
        <span class="reorder-spacer"></span>
        <button type="button" class="move" data-move="up" data-zone="${z.id}" ${idx === 0 ? "disabled" : ""} aria-label="Monter">↑</button>
        <button type="button" class="move" data-move="down" data-zone="${z.id}" ${idx === orderedHideable.length - 1 ? "disabled" : ""} aria-label="Descendre">↓</button>
      </div>`)
    .join("");

  return `
    ${pageHeading({
      eyebrow: "Paramètres",
      title: "Personnalisation",
      iconName: "settings",
      subtitle: "Ton espace, à ton image. Tout ce que tu modifies ici est gardé sur cet appareil.",
      aside: `<span id="settings-saved" class="settings-saved">Enregistré</span>`,
    })}

    <div class="settings-stack">
      <section class="panel">
        ${panelHead("Ton espace", "Identité", null)}
        <div class="settings-stack">
          <div class="field-row">
            <div class="field">
              <label for="set-business">Nom de ton entreprise</label>
              <input id="set-business" type="text" value="${escapeHtml(profile.businessName)}" placeholder="Ton entreprise" data-field="businessName" />
            </div>
            <div class="field">
              <label for="set-owner">Ton prénom</label>
              <input id="set-owner" type="text" value="${escapeHtml(profile.ownerName)}" placeholder="Ton prénom" data-field="ownerName" />
            </div>
          </div>
          <div class="field">
            <label for="set-objective">Ta priorité du mois</label>
            <textarea id="set-objective" placeholder="La seule chose qui compte vraiment ce mois-ci…" data-field="objective">${escapeHtml(profile.objective)}</textarea>
            <span class="hint">Elle s’affiche sur ton cockpit, en grand, pour garder le cap.</span>
          </div>
          <div class="field">
            <label for="set-progress">Avancement de ta priorité — ${progress}%</label>
            <input id="set-progress" type="range" min="0" max="100" step="5" value="${progress}" data-field="priorityProgress" />
          </div>
        </div>
      </section>

      <section class="panel">
        ${panelHead("Apparence", "Choisis ton thème", null)}
        <div class="theme-grid">${themeSwatches}</div>
      </section>

      <section class="split-grid">
        <article class="panel">
          ${panelHead("Sections du menu", "Affiche ce qui te sert", null)}
          <div>${menuToggles}</div>
        </article>
        <article class="panel">
          ${panelHead("Ordre du menu", "Mets en avant tes priorités", null)}
          <div class="reorder-list">${reorderRows}</div>
        </article>
      </section>

      <section class="panel">
        ${panelHead("Données", SYNC.user ? "Ton espace est connecté à ta base" : "Tout est gardé sur cet appareil", null)}
        ${
          SYNC.user
            ? `<p style="font-size:0.875rem;color:var(--fg-secondary);line-height:1.6;margin-bottom:1rem">Tes données vivent dans ta base privée et se retrouvent sur tous tes appareils. Connecté avec <strong>${escapeHtml(SYNC.user.email || "ton compte")}</strong>.</p>
        <button type="button" class="btn ghost sm" data-logout="1">Se déconnecter de cet appareil</button>`
            : `<p style="font-size:0.875rem;color:var(--fg-secondary);line-height:1.6;margin-bottom:1rem">Tes données restent dans ce navigateur tant que ton espace n’est pas connecté. Tu peux repartir d’un espace vierge quand tu veux.</p>
        <button type="button" class="btn ghost sm" data-reset="1">Réinitialiser mon espace</button>`
        }
      </section>
    </div>`;
}

/* ------------------------------------------------------------
   Renderers
   ------------------------------------------------------------ */
const renderers = {
  cockpit: renderCockpit,
  acquisition: renderAcquisition,
  sales: renderSales,
  clients: renderClients,
  delivery: renderDelivery,
  pilotage: renderPilotage,
  resources: renderResources,
  agent: renderAgent,
  guide: renderGuide,
  settings: renderSettings,
};

/* ------------------------------------------------------------
   Guide — questionnaires + prompts prêts à l'emploi
   Le client répond avec ses mots, copie un prompt déjà rempli,
   et le donne à SON assistant IA qui construit l'espace avec lui.
   ------------------------------------------------------------ */
function guideCard(iconName, title, body) {
  return `
    <article class="panel guide-card">
      <div class="guide-card-head">${icon(iconName)}<strong>${escapeHtml(title)}</strong></div>
      <p>${body}</p>
    </article>`;
}

const PAGE_SUMMARY = [
  { id: "cockpit", what: "Pour voir absolument tout, d’un coup d’œil : tes chiffres, ta priorité du mois, ce qui t’attend aujourd’hui. La page que tu ouvres le matin." },
  { id: "acquisition", what: "Tout ce qui te rend visible et amène des prospects : tes idées et tes contenus, suivis de l’idée à la publication, canal par canal." },
  { id: "sales", what: "Tes ventes : une affaire par discussion en cours, avec l’étape, le montant et la prochaine action. Ton pipeline, sans trou." },
  { id: "clients", what: "Une fiche par client : où il en est, la prochaine action prévue. Plus aucun client oublié dans un coin de ta tête." },
  { id: "delivery", what: "Ce que tu as promis et dois livrer, avec un statut clair et une échéance. Ta liste de travail concrète." },
  { id: "pilotage", what: "Pour piloter tout ce qui se passe : tes objectifs chiffrés, l’argent réellement encaissé, tes automatisations et le journal de ce que fait ton assistant." },
  { id: "resources", what: "Tes liens et documents importants (paiement, agenda, formulaires…), rangés par catégorie, retrouvés en 5 secondes." },
  { id: "agent", what: "Ton assistant branché sur ton espace : la vue d’ensemble de tout ce qui est connecté, ses outils, et ses propositions qui attendent ton feu vert." },
  { id: "settings", what: "Ton nom, ta priorité du mois, ton thème, l’ordre du menu. Ton espace, à ton image — et ton assistant peut le régler pour toi." },
];

const MASTER_PROMPT = [
  "Tu es mon assistant IA (Claude, Codex, ou un autre). Ta mission : construire MON cockpit avec moi — mon espace de pilotage en ligne, avec ces pages : Cockpit (vue d’ensemble), Acquisition (contenus et visibilité), Ventes (pipeline), Clients (suivi), À délivrer (tâches et livrables), Pilotage (objectifs chiffrés, revenus encaissés, automatisations), Ressources (liens et documents), Paramètres (profil et priorité du mois).",
  "",
  "ÉTAPE 1 — Fais connaissance avec moi. Pose-moi ces questions UNE PAR UNE (jamais un interrogatoire d’un bloc), et adapte toute la suite à mes réponses :",
  "1. « Tu es plutôt à l’aise avec l’IA et l’informatique, ou débutant ? » → Si je suis débutant : une seule action à la fois, des mots simples, et tu vérifies que j’ai réussi avant de continuer.",
  "2. « Ton activité tourne déjà (clients, ventes, outils), ou tu pars de zéro ? »",
  "   → Si ça tourne déjà : demande-moi quels outils j’utilise (agenda, paiements, notes, tableur, messagerie) et lesquels tu peux consulter. Tu pars de ma VRAIE donnée. Tu n’inventes JAMAIS un chiffre ni un nom.",
  "   → Si je pars de zéro : tu construis tout à partir de mes réponses, avec des exemples adaptés à mon métier.",
  "   → Si c’est un mix (des choses en place, des trous) : tu reprends l’existant tel quel et tu combles les trous avec moi.",
  "3. Puis, une par une : mon activité en une phrase · mon offre et son prix · mes clients du moment · d’où viennent mes prospects · ma priorité des 30 prochains jours · ce qui me prend le plus de temps chaque semaine.",
  "",
  "ÉTAPE 2 — Propose avant de construire. Récapitule ce que tu as compris en 5 lignes, dis-moi ce que tu comptes mettre dans chaque page, et attends mon OK.",
  "",
  "ÉTAPE 3 — Construis, page par page (montre-moi le résultat après chaque page et attends ma validation avant la suivante) :",
  "1. Paramètres : mon profil (entreprise, prénom) et ma priorité du mois.",
  "2. Clients : une fiche par client — statut + prochaine action.",
  "3. Ventes : une affaire par discussion en cours — étape, montant, prochaine action.",
  "4. À délivrer : ce que je dois livrer, avec des échéances réalistes.",
  "5. Ressources : mes liens importants, chacun dans la bonne catégorie — et crée une catégorie s’il en manque une pour mon métier.",
  "6. Acquisition : 3 premières idées de contenu adaptées à mes canaux.",
  "7. Pilotage : ma priorité transformée en 1 à 3 objectifs chiffrés, et mes derniers encaissements notés.",
  "",
  "ÉTAPE 4 — Adapte mon cockpit à MON métier. Dis-moi ce qui manque pour mon cas précis et fais-le évoluer avec moi : renomme, réordonne ou cache des pages depuis Paramètres, crée les catégories utiles, propose les automatisations rentables (je choisis lesquelles activer).",
  "",
  "Règles non négociables :",
  "- Tu ne supprimes jamais une donnée sans me demander.",
  "- Tout message destiné à quelqu’un d’autre (relance, email, envoi) est d’abord déposé dans « À valider » : rien ne part sans mon feu vert.",
  "- Si tu es branché à mon espace (connecteur), écris directement dedans. Sinon, dis-moi exactement quoi remplir, page par page, et je le fais avec toi.",
].join("\n");

const DELEGATE_PROMPT = [
  "Tu es mon assistant IA. Objectif : trouver ce que je peux te déléguer pour gagner du temps chaque semaine, puis installer la première délégation ensemble, aujourd’hui.",
  "",
  "ÉTAPE 1 — Pose-moi ces questions, une par une :",
  "1. Raconte-moi ta semaine type : qu’est-ce que tu fais, en gros, jour par jour ?",
  "2. Qu’est-ce qui te prend le plus de temps sans te rapporter d’argent ?",
  "3. Qu’est-ce que tu détestes faire (et que tu repousses toujours) ?",
  "4. Qu’est-ce que tu refais à la main chaque semaine, pareil à chaque fois ?",
  "5. Quels outils tu utilises déjà (messagerie, agenda, paiements, réseaux) ?",
  "",
  "ÉTAPE 2 — Propose : le top 5 des choses que je devrais te déléguer, classées par temps gagné. Pour chacune : ce que tu ferais exactement, ce qu’il te faut pour le faire, et ce qui restera toujours à ma validation.",
  "",
  "ÉTAPE 3 — Installe la première avec moi, maintenant. Petite, concrète, qui marche aujourd’hui. Puis note dans mon cockpit (Pilotage) ce qu’on a mis en place, et propose la suivante la semaine prochaine.",
  "",
  "Règles : rien ne part vers l’extérieur sans mon feu vert (« À valider »), et tu ne supprimes jamais rien sans me demander.",
].join("\n");

const INSTALL_PROMPT = [
  "Tu es mon assistant IA. Aide-moi à mettre mon espace de pilotage en ligne, étape par étape, en me guidant écran par écran.",
  "Contexte : mon espace est une application web légère (des fichiers HTML, CSS et JavaScript, fournis avec leur guide d’installation dans le dossier). Elle se connecte à ma propre base de données privée (Supabase) avec une clé publique protégée ligne à ligne : aucune clé secrète ne doit jamais apparaître dans les fichiers ni dans notre discussion.",
  "Étapes attendues :",
  "1. Créer ma base privée et mon compte d’accès (email + mot de passe).",
  "2. Préparer le fichier de configuration de mon espace (adresse de ma base + clé publique).",
  "3. Mettre les fichiers en ligne sur mon propre hébergement.",
  "4. Vérifier ensemble que je peux me connecter et que mes données s’enregistrent bien.",
  "Règles : tu m’expliques chaque étape avec des mots simples, tu me demandes confirmation avant tout ce qui est irréversible, et tu ne me fais jamais coller un mot de passe dans la discussion.",
].join("\n");

function connectPrompt() {
  const origin = window.location.origin;
  return [
    "Tu es mon assistant IA. Mission : deviens mon vrai bras droit, branché sur mon espace de pilotage.",
    `Mon espace est en ligne ici : ${origin}`,
    "Adapte-toi à mon niveau : si je suis débutant, une seule action à la fois, tout expliqué simplement, et tu vérifies que j’ai réussi avant de continuer.",
    "",
    "ÉTAPE 1 — Installe le connecteur de mon espace (une seule fois) :",
    "1. Vérifie que Node.js (version 18 ou plus) est installé sur mon ordinateur (commande : node --version). Sinon, guide-moi pour l’installer depuis nodejs.org.",
    `2. Télécharge le connecteur : ${origin}/connecteur/server.mjs — enregistre-le dans un dossier stable de mon ordinateur (par exemple un dossier « mon-espace »).`,
    "3. Prépare la commande ci-dessous et affiche-la moi telle quelle. RÈGLE ABSOLUE : tu ne me demandes JAMAIS mon mot de passe dans la discussion. Tu laisses <MON-MOT-DE-PASSE> tel quel : c’est moi qui le remplace au moment de coller la commande dans mon terminal.",
    `   claude mcp add mon-espace -e COCKPIT_ESPACE=${origin} -e COCKPIT_EMAIL=<mon-email> -e COCKPIT_PASSWORD=<MON-MOT-DE-PASSE> -- node <dossier>/server.mjs`,
    "   (avec Codex : codex mcp add … — même commande ; avec un autre outil : son équivalent pour ajouter un serveur MCP en stdio)",
    "4. Quand le connecteur est ajouté, fais le test : avec l’outil ajouter_element, crée une tâche « Test de mon assistant », puis demande-moi de recharger mon espace pour confirmer qu’elle apparaît. Quand je confirme, marque-la « Fait » avec modifier_element.",
    "",
    "ÉTAPE 2 — Prends ton poste :",
    "- À ma demande, fais-moi le point avec voir_espace : ce qui a bougé, ce qui m’attend, la chose à faire en premier.",
    "- Relances, messages, emails : tu les prépares et tu les déposes dans « À valider » avec deposer_validation. Rien ne part sans mon feu vert.",
    "- Tu tiens mon espace à jour au fil de nos discussions : tâches faites, affaires qui avancent, nouveaux clients, idées de contenu, encaissements notés, objectifs mis à jour.",
    "",
    "ÉTAPE 3 — Mémorise ton poste (pour toutes nos prochaines sessions) :",
    `- Enregistre dans ta mémoire permanente (fichier CLAUDE.md, mémoire de projet ou l’équivalent de ton outil) : mon espace de pilotage est sur ${origin}, tu y es connecté via le connecteur « mon-espace », et tu reprends ce poste à CHAQUE session sans que j’aie à te re-briefer.`,
    "- Mémorise aussi mes règles : rien ne se supprime sans mon accord, tout envoi externe passe par « À valider », et tu ne me demandes jamais mon mot de passe.",
    "- Montre-moi ce que tu as enregistré, pour que je valide.",
    "",
    "Si le connecteur n’est pas possible sur mon installation, passe en mode copier-coller : tu me dis exactement quoi remplir, page par page, et je le fais avec toi.",
  ].join("\n");
}

function buildPromptFor(kind) {
  if (kind === "master") return MASTER_PROMPT;
  if (kind === "delegate") return DELEGATE_PROMPT;
  if (kind === "install") return INSTALL_PROMPT;
  if (kind === "section:agent") return connectPrompt();
  return "";
}

async function copyText(txt, btn) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(txt);
    ok = true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    } catch {
      ok = false;
    }
  }
  if (btn) {
    const old = btn.textContent;
    btn.textContent = ok ? "Copié ✓ — colle-le à ton assistant" : "Copie impossible sur ce navigateur";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = old;
      btn.classList.remove("copied");
    }, 1800);
  }
}

function copyRow(kind, label, hint) {
  return `
    <div class="copy-row">
      <button type="button" class="btn accent" data-copy="${escapeHtml(kind)}">${escapeHtml(label)}</button>
      ${hint ? `<span class="copy-hint">${escapeHtml(hint)}</span>` : ""}
    </div>
    <details class="prompt-preview" data-preview="${escapeHtml(kind)}">
      <summary>Voir le prompt avant de copier</summary>
      <pre></pre>
    </details>`;
}

/* Une carte prompt du Guide : ce qu'il fait, PUIS le bouton copier. */
function promptCard(num, title, does, kind, hint) {
  return `
    <article class="panel prompt-panel">
      <div class="prompt-head">
        <span class="step-num">${num}</span>
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(does)}</p>
        </div>
      </div>
      ${copyRow(kind, "Copier ce prompt", hint || "")}
    </article>`;
}

function renderGuide() {
  return `
    ${pageHeading({
      eyebrow: "Mode d’emploi",
      title: "Guide",
      iconName: "book",
      subtitle: "Deux minutes pour comprendre chaque page, un prompt à donner à ton IA — et elle construit tout avec toi.",
    })}

    <section class="panel">
      ${panelHead("Comment ça marche", "Trois gestes, c’est tout", null)}
      <div class="how-steps">
        <div><span class="step-num">1</span><div class="step-body"><strong>Lis le sommaire ci-dessous</strong><span>Tu sauras à quoi sert chaque page de ton cockpit — sans rien remplir ici.</span></div></div>
        <div><span class="step-num">2</span><div class="step-body"><strong>Copie le prompt n°1</strong><span>Colle-le dans ton assistant IA (Claude, Codex, ou un autre). Chaque prompt te dit ce qu’il va faire AVANT que tu le copies.</span></div></div>
        <div><span class="step-num">3</span><div class="step-body"><strong>Réponds à ses questions</strong><span>Débutant ou avancé, avec ou sans outils : il s’adapte, construit page par page, et tu valides.</span></div></div>
      </div>
      <div class="empty-hint" style="margin-top:0.8rem">Pas encore d’assistant IA ? Crée un compte gratuit sur claude.ai, installe l’application sur ton ordinateur, et reviens ici. Dix minutes, pas plus.</div>
    </section>

    <section class="panel">
      ${panelHead("Ton cockpit, page par page", "Le sommaire — clique pour ouvrir la page", null)}
      <div class="summary-grid">
        ${PAGE_SUMMARY.map((p) => {
          const zone = ZONES.find((z) => z.id === p.id);
          if (!zone) return "";
          return `
            <button type="button" class="summary-card" data-route="${zone.id}">
              ${icon(zone.icon)}
              <strong>${escapeHtml(zone.label)}</strong>
              <small>${escapeHtml(p.what)}</small>
            </button>`;
        }).join("")}
      </div>
    </section>

    <section class="panel guide-list">
      <h2>Les prompts — donne-les à ton IA, elle fait le reste</h2>
      <p class="panel-note">Chaque prompt te dit ce qu’il va faire avant que tu le copies. Commence par le n°1. Ton IA te pose les questions — pas de formulaire à remplir ici.</p>
      <div class="prompt-stack">
        ${promptCard(
          "1",
          "Construis mon cockpit avec moi",
          "Il te demande d’abord ton niveau (débutant ou à l’aise) et où tu en es (activité qui tourne, zéro, ou un mix). Si ton business tourne déjà, il part de ta vraie donnée — jamais de chiffres inventés. Puis il te propose un plan, attend ton OK, et remplit chaque page en te montrant le résultat.",
          "master",
          "Le point de départ. Tout le reste peut attendre.",
        )}
        ${promptCard(
          "2",
          "Trouve ce que je peux déléguer à mon IA",
          "Il te pose 5 questions sur ta semaine — ce qui te prend du temps, ce que tu détestes, ce que tu refais en boucle — puis te propose le top 5 des choses à lui confier, et installe la première avec toi, aujourd’hui.",
          "delegate",
          "À faire une fois ton cockpit construit.",
        )}
        ${promptCard(
          "3",
          "Branche mon assistant sur mon espace",
          "Il installe le petit connecteur de ton espace (5 minutes, guidé), prouve que ça marche avec une tâche test, puis prend son poste : il pourra lire et mettre à jour ton cockpit tout seul, à chaque session. Il ne te demandera jamais ton mot de passe dans la discussion.",
          "section:agent",
          "Le même bouton existe dans l’onglet Agent IA.",
        )}
        ${promptCard(
          "4",
          "Mets mon espace en ligne (si ce n’est pas déjà fait)",
          "Seulement si ton espace n’est pas encore en ligne chez toi : il crée ta base privée gratuite, configure ton espace et le met en ligne avec toi, écran par écran.",
          "install",
          "Ignore ce prompt si tu es déjà connecté à ton espace en ligne.",
        )}
      </div>
    </section>

    <section class="split-grid">
      ${guideCard("bot", "Ton assistant vit dans l’onglet Agent IA", "La vue d’ensemble de ton espace, ses outils, et ses propositions qui attendent ton feu vert dans « À valider ».")}
      ${guideCard("sparkles", "Ton cockpit évolue avec toi", "Il te manque une page, une catégorie, un suivi propre à ton métier ? Demande-le à ton assistant : cet espace t’appartient, il le fait évoluer pour toi.")}
    </section>
  `;
}

/* ------------------------------------------------------------
   Feedback
   ------------------------------------------------------------ */
let savedTimer = null;
function flashSaved() {
  const el = byId("settings-saved");
  if (!el) return;
  el.classList.add("show");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => el.classList.remove("show"), 1400);
}

function styleRange(input) {
  const pct = Math.max(0, Math.min(100, Number(input.value) || 0));
  input.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--bg-muted) ${pct}%, var(--bg-muted) 100%)`;
}

/* ------------------------------------------------------------
   Actions sur les donnees
   ------------------------------------------------------------ */
function handleAddSubmit(form) {
  const collection = form.dataset.addsubmit;
  const fd = new FormData(form);
  const get = (k) => text(fd.get(k)).trim();
  let item = null;
  let label = "";
  if (collection === "clients") {
    if (!get("name")) return;
    item = { name: get("name"), status: get("status") || "Prospect", next: get("next") };
    label = `Client ajouté : ${item.name}`;
    maybeWelcome(item.name);
  } else if (collection === "deals") {
    if (!get("name")) return;
    item = { name: get("name"), stage: get("stage") || "Découverte", value: Number(get("value")) || 0, next: get("next") };
    label = `Affaire ajoutée : ${item.name}`;
  } else if (collection === "tasks") {
    if (!get("title")) return;
    item = { title: get("title"), status: get("status") || "À faire", due: get("due") };
    label = `Tâche ajoutée : ${item.title}`;
  } else if (collection === "contents") {
    if (!get("title")) return;
    item = { title: get("title"), status: get("status") || "Idée", channel: get("channel") };
    label = `Idée de contenu ajoutée : ${item.title}`;
  } else if (collection === "resources") {
    if (!get("title")) return;
    item = { title: get("title"), url: get("url"), category: get("category") || "Autre" };
    label = `Raccourci ajouté : ${item.title}`;
  } else if (collection === "goals") {
    if (!get("title") || !Number(get("target"))) return;
    item = { title: get("title"), target: Number(get("target")), current: Number(get("current")) || 0, deadline: get("deadline") };
    label = `Objectif ajouté : ${item.title}`;
  } else if (collection === "revenue") {
    if (!get("source") || !Number(get("amount"))) return;
    item = { source: get("source"), amount: Number(get("amount")), date: get("date") };
    label = `Revenu noté : ${item.source} (${formatEur(item.amount)})`;
  }
  if (!item) return;
  addItem(collection, item);
  logActivity(label);
  saveData();
  state.ui.form = null;
  render();
}

/* Si l'automatisation "bienvenue" est active, preparer un message a valider */
function maybeWelcome(clientName) {
  const auto = state.data.automations.find((a) => a.id === "welcome");
  if (auto && auto.on) {
    addApproval({
      title: `Message de bienvenue pour ${clientName}`,
      detail: `Bonjour ${clientName}, ravi de démarrer avec toi. Voici les prochaines étapes…`,
      source: "Assistant",
    });
    logActivity(`Message de bienvenue préparé pour ${clientName}`);
  }
}

function prepareAction(kind, id) {
  if (kind === "client") {
    const c = state.data.clients.find((x) => x.id === id);
    if (!c) return;
    addApproval({ title: `Message pour ${c.name}`, detail: `Un message de suivi prêt à envoyer à ${c.name}, à relire avant l’envoi.`, source: "Assistant" });
    logActivity(`Message préparé pour ${c.name}`);
  } else if (kind === "deal") {
    const d = state.data.deals.find((x) => x.id === id);
    if (!d) return;
    addApproval({ title: `Relance — ${d.name}`, detail: `Une relance prête pour l’affaire « ${d.name} », à valider avant l’envoi.`, source: "Assistant" });
    logActivity(`Relance préparée pour ${d.name}`);
  }
  saveData();
  render();
}

function resolveApproval(id, approve) {
  const a = state.data.approvals.find((x) => x.id === id);
  if (!a) return;
  a.status = approve ? "approved" : "rejected";
  logActivity(`${approve ? "Validé" : "Rejeté"} : ${a.title}`);
  saveData();
  render();
}

function toggleAutomation(id) {
  const a = state.data.automations.find((x) => x.id === id);
  if (!a) return;
  a.on = !a.on;
  logActivity(`${a.on ? "Activé" : "Désactivé"} : ${a.name}`);
  saveData();
  render();
}

/* ------------------------------------------------------------
   Parametres : interactions
   ------------------------------------------------------------ */
function wireSettings() {
  document.querySelectorAll("[data-field]").forEach((input) => {
    const field = input.dataset.field;
    if (input.type === "range") styleRange(input);
    input.addEventListener("input", () => {
      if (field === "priorityProgress") {
        state.config.priorityProgress = Number(input.value);
        styleRange(input);
        const label = document.querySelector('label[for="set-progress"]');
        if (label) label.textContent = `Avancement de ta priorité — ${input.value}%`;
      } else {
        state.config.profile[field] = input.value;
        applyProfile();
      }
      saveConfig();
      flashSaved();
    });
  });

  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.config.theme = btn.dataset.themeChoice;
      applyTheme();
      saveConfig();
      document.querySelectorAll("[data-theme-choice]").forEach((b) => b.classList.toggle("active", b === btn));
      flashSaved();
    });
  });

  document.querySelectorAll("[data-toggle-zone]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.toggleZone;
      const hidden = new Set(state.config.navHidden);
      hidden.has(id) ? hidden.delete(id) : hidden.add(id);
      state.config.navHidden = [...hidden];
      saveConfig();
      renderSidebar();
      render();
      flashSaved();
    });
  });

  document.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", () => {
      moveZone(btn.dataset.zone, btn.dataset.move);
      saveConfig();
      renderSidebar();
      render();
      flashSaved();
    });
  });

  const reset = document.querySelector("[data-reset]");
  if (reset) {
    reset.addEventListener("click", () => {
      state.data = clone(DATA_DEFAULTS);
      saveData();
      logActivity("Espace réinitialisé");
      saveData();
      flashSaved();
      render();
    });
  }
}

function moveZone(id, direction) {
  const order = state.config.navOrder.filter((z) => z !== "cockpit" && z !== "settings");
  const idx = order.indexOf(id);
  if (idx === -1) return;
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= order.length) return;
  [order[idx], order[swap]] = [order[swap], order[idx]];
  state.config.navOrder = ["cockpit", ...order, "settings"];
}

/* ------------------------------------------------------------
   Command palette
   ------------------------------------------------------------ */
function renderCommandResults(filter = "") {
  const term = filter.trim().toLowerCase();
  const results = visibleZones().filter((z) => `${z.label} ${z.subtitle}`.toLowerCase().includes(term));
  byId("command-results").innerHTML = results
    .map(
      (z) => `<button type="button" data-route="${z.id}"><strong>${escapeHtml(z.label)}</strong><span>${escapeHtml(z.subtitle)}</span></button>`,
    )
    .join("");
}

function openCommand() {
  const dialog = byId("command-dialog");
  renderCommandResults();
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  const input = byId("command-input");
  input.value = "";
  input.focus();
}

function closeCommand() {
  const dialog = byId("command-dialog");
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  dialog.removeAttribute("open");
}

/* ------------------------------------------------------------
   Wiring de la vue
   ------------------------------------------------------------ */
function wireActions() {
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (SYNC.client) await SYNC.client.auth.signOut();
      window.location.reload();
    });
  });

  document.querySelectorAll("[data-route]").forEach((el) => {
    el.addEventListener("click", (event) => {
      const route = event.currentTarget.dataset.route;
      if (!route) return;
      if (event.currentTarget.tagName === "A") event.preventDefault();
      closeCommand();
      closeMobileNav();
      navigate(route);
    });
  });

  document.querySelectorAll("[data-addopen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.ui.form = state.ui.form === btn.dataset.addopen ? null : btn.dataset.addopen;
      render();
    });
  });
  document.querySelectorAll("[data-addcancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.ui.form = null;
      render();
    });
  });
  document.querySelectorAll("[data-addsubmit]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleAddSubmit(form);
    });
  });
  document.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [collection, id] = btn.dataset.del.split(":");
      removeItem(collection, id);
      render();
    });
  });
  document.querySelectorAll("[data-prepare]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [kind, id] = btn.dataset.prepare.split(":");
      prepareAction(kind, id);
    });
  });
  document.querySelectorAll("[data-approve]").forEach((btn) => btn.addEventListener("click", () => resolveApproval(btn.dataset.approve, true)));
  document.querySelectorAll("[data-reject]").forEach((btn) => btn.addEventListener("click", () => resolveApproval(btn.dataset.reject, false)));
  document.querySelectorAll("[data-automation]").forEach((btn) => btn.addEventListener("click", () => toggleAutomation(btn.dataset.automation)));
  document.querySelectorAll("[data-tasktoggle]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const t = state.data.tasks.find((x) => x.id === btn.dataset.tasktoggle);
      if (!t) return;
      t.status = t.status === "Fait" ? "À faire" : "Fait";
      logActivity(`${t.status === "Fait" ? "Terminé" : "Rouvert"} : ${t.title}`);
      saveData();
      render();
    }),
  );

  document.querySelectorAll("[data-contentnext]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const c = state.data.contents.find((x) => x.id === btn.dataset.contentnext);
      if (!c) return;
      c.status = c.status === "Idée" ? "En cours" : c.status === "En cours" ? "Publié" : "Idée";
      logActivity(`Contenu « ${truncate(c.title, 30)} » → ${c.status}`);
      saveData();
      render();
    }),
  );

  document.querySelectorAll("[data-tool]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const t = ASSISTANT_TOOLS.find((x) => x.id === btn.dataset.tool);
      if (!t) return;
      state.ui.form = t.form || null;
      if (t.to === state.route) render();
      else window.location.hash = `#/${t.to}`;
    }),
  );

  document.querySelectorAll("[data-goalcur]").forEach((input) =>
    input.addEventListener("change", () => {
      const g = state.data.goals.find((x) => x.id === input.dataset.goalcur);
      if (!g) return;
      g.current = Math.max(0, Number(input.value) || 0);
      if (g.current >= (Number(g.target) || 1)) logActivity(`Objectif atteint : ${g.title} 🎉`);
      saveData();
      render();
    }),
  );

  // Guide : copie de prompts + questionnaires (pas de re-render pendant la frappe)
  document.querySelectorAll("[data-copy]").forEach((btn) =>
    btn.addEventListener("click", () => copyText(buildPromptFor(btn.dataset.copy), btn)),
  );
  document.querySelectorAll("[data-preview]").forEach((det) =>
    det.addEventListener("toggle", () => {
      if (det.open) {
        const pre = det.querySelector("pre");
        if (pre) pre.textContent = buildPromptFor(det.dataset.preview);
      }
    }),
  );
}

function closeMobileNav() {
  byId("app-shell").classList.remove("nav-open");
}

/* ------------------------------------------------------------
   Render principal
   ------------------------------------------------------------ */
function render() {
  state.route = routeFromHash();
  const zone = currentZone();
  byId("mode-label").textContent = zone.id === "cockpit" ? "Mon espace" : zone.label;
  renderSidebar();
  byId("app-view").innerHTML = (renderers[state.route] || renderCockpit)();
  wireActions();
  if (state.route === "settings") wireSettings();
  // autofocus du premier champ du formulaire d'ajout
  const firstInput = document.querySelector(".add-form input, .add-form textarea");
  if (firstInput) firstInput.focus();
  byId("app-view").focus({ preventScroll: true });
  if (state.route === "agent") wireGraph();
}

/* ------------------------------------------------------------
   Init
   ------------------------------------------------------------ */
async function init() {
  state.config = loadConfig();
  state.data = loadData();

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (response.ok) {
      const manifest = await response.json();
      const ids = Array.isArray(manifest?.categories) ? manifest.categories.map((c) => c.id) : null;
      if (ids && ids.length) {
        const allowed = new Set([...ids, "cockpit", "settings"]);
        state.config.navOrder = sanitizeOrder(state.config.navOrder.filter((id) => allowed.has(id) && ZONES.some((z) => z.id === id)));
      }
    }
  } catch {
    /* pas de manifest accessible */
  }

  try {
    const response = await fetch(clientProfileUrl, { cache: "no-store" });
    if (response.ok) {
      const shipped = await response.json();
      const noLocal = !localStorage.getItem(STORE_KEY);
      if (noLocal && shipped && typeof shipped === "object") {
        if (shipped.businessName) state.config.profile.businessName = shipped.businessName;
        if (shipped.ownerName) state.config.profile.ownerName = shipped.ownerName;
        if (shipped.objective) state.config.profile.objective = shipped.objective;
        if (shipped.theme && THEMES.some((t) => t.id === shipped.theme)) state.config.theme = shipped.theme;
      }
    }
  } catch {
    /* pas de profil livre */
  }

  // Base connectée ? (config présente -> connexion obligatoire, données distantes)
  const syncStatus = await initSupabaseSync();
  if (syncStatus === "login") {
    applyTheme();
    showLoginGate();
    return;
  }

  applyTheme();
  applyProfile();

  byId("command-trigger").addEventListener("click", openCommand);
  byId("command-input").addEventListener("input", (e) => renderCommandResults(e.currentTarget.value));
  byId("command-results").addEventListener("click", (e) => {
    const button = e.target.closest("[data-route]");
    if (!button) return;
    closeCommand();
    navigate(button.dataset.route);
  });

  byId("menu-toggle").addEventListener("click", () => byId("app-shell").classList.toggle("nav-open"));
  byId("scrim").addEventListener("click", closeMobileNav);

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCommand();
    }
    if (e.key === "Escape") closeMobileNav();
  });

  window.addEventListener("hashchange", render);
  render();
}

init();
