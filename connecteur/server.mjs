#!/usr/bin/env node
/* ============================================================
   Connecteur espace de pilotage — MCP (stdio), zéro dépendance.
   Donne à TON assistant IA (Claude, Codex…) un accès réel à TON
   espace : lire, ajouter, mettre à jour — dans TA base privée.
   Sécurité : identifiants fournis par variables d'environnement
   (jamais dans la discussion), clé publique protégée ligne à
   ligne (RLS), aucune suppression possible depuis ce connecteur.

   Variables d'environnement requises :
     COCKPIT_ESPACE    adresse de ton espace (ex. https://cockpit.exemple.fr)
     COCKPIT_EMAIL     ton email de connexion à l'espace
     COCKPIT_PASSWORD  ton mot de passe (tape-le toi-même dans la commande)
   Optionnel (si ton espace n'expose pas cockpit/client-config.json) :
     COCKPIT_SUPABASE_URL, COCKPIT_SUPABASE_ANON_KEY

   Installation type (l'assistant prépare, TOI tu colles le mot de passe) :
     claude mcp add mon-espace \
       -e COCKPIT_ESPACE=https://... -e COCKPIT_EMAIL=... -e COCKPIT_PASSWORD=... \
       -- node /chemin/vers/server.mjs
     (équivalent Codex : codex mcp add mon-espace ... -- node /chemin/vers/server.mjs)
   ============================================================ */

import { createInterface } from "node:readline";

const ESPACE = (process.env.COCKPIT_ESPACE || "").replace(/\/+$/, "");
const EMAIL = process.env.COCKPIT_EMAIL || "";
const PASSWORD = process.env.COCKPIT_PASSWORD || "";

const CFG = {
  url: (process.env.COCKPIT_SUPABASE_URL || "").replace(/\/+$/, ""),
  anon: process.env.COCKPIT_SUPABASE_ANON_KEY || "",
  token: null,
  slug: "moi",
};

/* ---------------- Accès base (REST Supabase, fetch natif) ---------------- */

async function ensureConfig() {
  if (CFG.url && CFG.anon) return;
  if (!ESPACE) throw new Error("COCKPIT_ESPACE manquant (adresse de ton espace).");
  const res = await fetch(`${ESPACE}/cockpit/client-config.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Impossible de lire la configuration de l'espace (${res.status}). Renseigne COCKPIT_SUPABASE_URL et COCKPIT_SUPABASE_ANON_KEY.`);
  const cfg = await res.json();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error("Configuration de l'espace incomplète.");
  CFG.url = String(cfg.supabaseUrl).replace(/\/+$/, "");
  CFG.anon = cfg.supabaseAnonKey;
}

async function login() {
  if (!EMAIL || !PASSWORD) throw new Error("COCKPIT_EMAIL / COCKPIT_PASSWORD manquants.");
  const res = await fetch(`${CFG.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: CFG.anon, "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error("Connexion refusée : vérifie l'email et le mot de passe de ton espace.");
  const data = await res.json();
  CFG.token = data.access_token;
}

async function rest(path, options = {}, retry = true) {
  await ensureConfig();
  if (!CFG.token) await login();
  const res = await fetch(`${CFG.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: CFG.anon,
      authorization: `Bearer ${CFG.token}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && retry) {
    CFG.token = null;
    return rest(path, options, false);
  }
  if (!res.ok) throw new Error(`La base a répondu ${res.status} : ${(await res.text()).slice(0, 200)}`);
  const body = await res.text();
  return body ? JSON.parse(body) : null;
}

async function getCollections() {
  const rows = await rest("client_os_collections?select=collection,data");
  const map = {};
  for (const r of rows || []) map[r.collection] = r.data;
  return map;
}

async function setCollection(name, data) {
  await rest("client_os_collections?on_conflict=client_slug,collection", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ client_slug: CFG.slug, collection: name, data, updated_at: new Date().toISOString() }]),
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function pushActivity(map, texte) {
  const activity = Array.isArray(map.activity) ? map.activity : [];
  activity.unshift({ id: uid(), ts: nowHM(), text: texte });
  await setCollection("activity", activity.slice(0, 50));
}

/* ---------------- Outils ---------------- */

const TYPE_MAP = {
  tache: { collection: "tasks", statuts: ["À faire", "En cours", "Fait"] },
  affaire: { collection: "deals", statuts: ["Découverte", "Proposition", "Négociation", "Gagné", "Perdu"] },
  client: { collection: "clients", statuts: ["Prospect", "Actif", "En pause", "Terminé"] },
  contenu: { collection: "contents", statuts: ["Idée", "En cours", "Publié"] },
  ressource: { collection: "resources", statuts: [] },
  objectif: { collection: "goals", statuts: [] },
  revenu: { collection: "revenue", statuts: [] },
};

const LINK_CATEGORIES = ["Paiement", "Agenda", "Formulaire", "Communauté", "Outil", "Document", "Autre"];

const TOOLS = [
  {
    name: "voir_espace",
    description:
      "Lire l'espace de pilotage. Sans argument : résumé complet (profil, priorité, objectifs, revenus, compteurs, à traiter). Avec `collection` : contenu détaillé (tasks, deals, clients, contents, resources, goals, revenue, approvals, activity, automations, _config). Lis-le en début de session : l'espace est ta mémoire de travail avec le propriétaire.",
    inputSchema: {
      type: "object",
      properties: { collection: { type: "string", description: "Nom de la collection à lire (optionnel)" } },
    },
  },
  {
    name: "ajouter_element",
    description:
      "Ajouter un élément dans l'espace : une tache (À délivrer), une affaire (Ventes, avec montant en euros), un client, un contenu (Acquisition), une ressource (lien, avec catégorie — une catégorie inconnue est créée automatiquement, adapte-les au métier du propriétaire), un objectif chiffré (Pilotage, avec cible) ou un revenu encaissé (Pilotage, avec montant).",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["tache", "affaire", "client", "contenu", "ressource", "objectif", "revenu"] },
        titre: { type: "string", description: "Titre ou nom de l'élément (pour un revenu : d'où vient l'argent)" },
        montant: { type: "number", description: "Montant en euros (affaire ou revenu)" },
        statut: { type: "string", description: "Statut ou étape de départ (optionnel)" },
        prochaine_action: { type: "string", description: "Prochaine action (client / affaire)" },
        echeance: { type: "string", description: "Échéance lisible (tache, objectif), ex. « vendredi », « fin septembre »" },
        canal: { type: "string", description: "Canal (contenu), ex. « LinkedIn »" },
        url: { type: "string", description: "Lien (ressource)" },
        categorie: { type: "string", description: `Catégorie de la ressource. Socle : ${LINK_CATEGORIES.join(" / ")} — ou toute nouvelle catégorie utile au métier (elle sera créée)` },
        cible: { type: "number", description: "Cible chiffrée (objectif), ex. 10000" },
        avancement: { type: "number", description: "Où on en est (objectif), ex. 2500" },
        date: { type: "string", description: "Date lisible (revenu), ex. « 4 juillet »" },
      },
      required: ["type", "titre"],
    },
  },
  {
    name: "modifier_element",
    description:
      "Mettre à jour un élément existant retrouvé par son titre (ou son id) : changer son statut/étape, sa prochaine action ou son échéance. Ne supprime jamais rien.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["tache", "affaire", "client", "contenu", "ressource", "objectif"] },
        titre: { type: "string", description: "Titre (ou début de titre) de l'élément à retrouver" },
        id: { type: "string", description: "Id exact si connu (prioritaire sur le titre)" },
        statut: { type: "string", description: "Nouveau statut / étape" },
        prochaine_action: { type: "string" },
        echeance: { type: "string" },
        avancement: { type: "number", description: "Nouvel avancement chiffré (objectif uniquement)" },
      },
      required: ["type"],
    },
  },
  {
    name: "definir_priorite",
    description: "Définir la priorité du mois affichée sur le cockpit, et son avancement (0-100).",
    inputSchema: {
      type: "object",
      properties: {
        priorite: { type: "string", description: "La priorité du mois, en une phrase" },
        avancement: { type: "number", description: "Avancement en % (0-100), optionnel" },
      },
      required: ["priorite"],
    },
  },
  {
    name: "deposer_validation",
    description:
      "Déposer une proposition dans « À valider » (message de relance, email, envoi…). OBLIGATOIRE avant tout envoi vers l'extérieur : rien ne part sans le feu vert du propriétaire de l'espace.",
    inputSchema: {
      type: "object",
      properties: {
        titre: { type: "string", description: "Titre court, ex. « Relance — devis Martin »" },
        detail: { type: "string", description: "Le contenu proposé, prêt à relire" },
      },
      required: ["titre", "detail"],
    },
  },
  {
    name: "noter_activite",
    description: "Ajouter une ligne au journal d'activité de l'espace (trace de ce qui vient d'être fait).",
    inputSchema: {
      type: "object",
      properties: { texte: { type: "string" } },
      required: ["texte"],
    },
  },
];

function summarize(map) {
  const cfg = map._config && typeof map._config === "object" ? map._config : {};
  const profile = cfg.profile || {};
  const arr = (k) => (Array.isArray(map[k]) ? map[k] : []);
  const tasks = arr("tasks");
  const deals = arr("deals");
  const open = deals.filter((d) => d.stage !== "Gagné" && d.stage !== "Perdu");
  const won = deals.filter((d) => d.stage === "Gagné");
  const pending = arr("approvals").filter((a) => a.status === "pending");
  const lines = [
    `Espace de : ${profile.businessName || "(entreprise non renseignée)"} — ${profile.ownerName || "(prénom non renseigné)"}`,
    `Priorité du mois : ${profile.objective || "(à définir)"} (${cfg.priorityProgress || 0}%)`,
    `Clients : ${arr("clients").length} · Affaires ouvertes : ${open.length} (${open.reduce((s, d) => s + (Number(d.value) || 0), 0)} €) · Gagnées : ${won.length}`,
    `Tâches ouvertes : ${tasks.filter((t) => t.status !== "Fait").length}/${tasks.length} · Contenus : ${arr("contents").length} · Ressources : ${arr("resources").length}`,
    `En attente de validation : ${pending.length}${pending.length ? " — " + pending.map((p) => p.title).slice(0, 3).join(" · ") : ""}`,
  ];
  const goals = arr("goals");
  if (goals.length) lines.push(`Objectifs : ${goals.map((g) => `${g.title} (${Number(g.current) || 0}/${Number(g.target) || 0})`).slice(0, 3).join(" · ")}`);
  const revenue = arr("revenue");
  if (revenue.length) lines.push(`Revenus encaissés : ${revenue.reduce((s, r) => s + (Number(r.amount) || 0), 0)} € (${revenue.length} entrées)`);
  const todo = tasks.filter((t) => t.status !== "Fait").slice(0, 5);
  if (todo.length) lines.push(`À faire : ${todo.map((t) => t.title + (t.due ? ` (${t.due})` : "")).join(" · ")}`);
  return lines.join("\n");
}

async function callTool(name, args = {}) {
  if (name === "voir_espace") {
    const map = await getCollections();
    if (args.collection) {
      const data = map[args.collection];
      if (data === undefined) return `Collection inconnue. Disponibles : ${Object.keys(map).join(", ")}`;
      return JSON.stringify(data, null, 2);
    }
    return summarize(map);
  }

  if (name === "ajouter_element") {
    const t = TYPE_MAP[args.type];
    if (!t) throw new Error("Type inconnu (tache, affaire, client, contenu, ressource, objectif, revenu).");
    const map = await getCollections();
    const list = Array.isArray(map[t.collection]) ? map[t.collection] : [];
    let item;
    if (args.type === "tache") item = { id: uid(), title: args.titre, status: args.statut || "À faire", due: args.echeance || "" };
    else if (args.type === "affaire") item = { id: uid(), name: args.titre, stage: args.statut || "Découverte", value: Number(args.montant) || 0, next: args.prochaine_action || "" };
    else if (args.type === "client") item = { id: uid(), name: args.titre, status: args.statut || "Prospect", next: args.prochaine_action || "" };
    else if (args.type === "contenu") item = { id: uid(), title: args.titre, status: args.statut || "Idée", channel: args.canal || "" };
    else if (args.type === "objectif") item = { id: uid(), title: args.titre, target: Number(args.cible) || 1, current: Number(args.avancement) || 0, deadline: args.echeance || "" };
    else if (args.type === "revenu") item = { id: uid(), source: args.titre, amount: Number(args.montant) || 0, date: args.date || "" };
    else item = { id: uid(), title: args.titre, url: args.url || "", category: (args.categorie || "").trim() || "Autre" };
    list.unshift(item);
    await setCollection(t.collection, list);
    await pushActivity(map, `Ajouté par l'assistant : ${args.titre}`);
    return `Fait : « ${args.titre} » ajouté (${args.type}, id ${item.id}). Recharge ton espace pour le voir.`;
  }

  if (name === "modifier_element") {
    const t = TYPE_MAP[args.type];
    if (!t) throw new Error("Type inconnu.");
    const map = await getCollections();
    const list = Array.isArray(map[t.collection]) ? map[t.collection] : [];
    const needle = (args.titre || "").toLowerCase();
    const item = list.find((x) => (args.id ? x.id === args.id : ((x.title || x.name || "").toLowerCase().includes(needle) && needle)));
    if (!item) return `Introuvable. Éléments actuels : ${list.map((x) => x.title || x.name).slice(0, 10).join(" · ") || "(vide)"}`;
    if (args.statut) {
      if (t.statuts.length && !t.statuts.includes(args.statut)) return `Statut invalide. Choix : ${t.statuts.join(" / ")}`;
      if (args.type === "affaire") item.stage = args.statut;
      else item.status = args.statut;
    }
    if (args.prochaine_action !== undefined) item.next = args.prochaine_action;
    if (args.echeance !== undefined) {
      if (args.type === "objectif") item.deadline = args.echeance;
      else item.due = args.echeance;
    }
    if (args.avancement !== undefined && args.type === "objectif") item.current = Math.max(0, Number(args.avancement) || 0);
    await setCollection(t.collection, list);
    await pushActivity(map, `Mis à jour par l'assistant : ${item.title || item.name}`);
    return `Fait : « ${item.title || item.name} » mis à jour${args.statut ? ` → ${args.statut}` : ""}.`;
  }

  if (name === "definir_priorite") {
    const map = await getCollections();
    const cfg = map._config && typeof map._config === "object" ? map._config : {};
    cfg.profile = { ...(cfg.profile || {}), objective: args.priorite };
    if (args.avancement !== undefined) cfg.priorityProgress = Math.max(0, Math.min(100, Number(args.avancement) || 0));
    await setCollection("_config", cfg);
    await pushActivity(map, `Priorité du mois mise à jour : ${args.priorite}`);
    return `Fait : priorité du mois → « ${args.priorite} »${args.avancement !== undefined ? ` (${cfg.priorityProgress}%)` : ""}.`;
  }

  if (name === "deposer_validation") {
    const map = await getCollections();
    const approvals = Array.isArray(map.approvals) ? map.approvals : [];
    approvals.unshift({ id: uid(), status: "pending", title: args.titre, detail: args.detail, source: "Assistant" });
    await setCollection("approvals", approvals);
    await pushActivity(map, `Proposition déposée à valider : ${args.titre}`);
    return `Déposé dans « À valider » : « ${args.titre} ». Rien ne part sans le feu vert du propriétaire.`;
  }

  if (name === "noter_activite") {
    const map = await getCollections();
    await pushActivity(map, args.texte);
    return "Noté dans le journal d'activité.";
  }

  throw new Error(`Outil inconnu : ${name}`);
}

/* ---------------- Protocole MCP (stdio, un message JSON par ligne) ---------------- */

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, message) {
  send({ jsonrpc: "2.0", id, error: { code: -32000, message } });
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on("line", async (line) => {
  const raw = line.trim();
  if (!raw) return;
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  const { id, method, params } = msg;
  try {
    if (method === "initialize") {
      reply(id, {
        protocolVersion: (params && params.protocolVersion) || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "connecteur-espace", version: "1.0.0" },
      });
    } else if (method === "notifications/initialized" || (method || "").startsWith("notifications/")) {
      /* rien à répondre */
    } else if (method === "ping") {
      reply(id, {});
    } else if (method === "tools/list") {
      reply(id, { tools: TOOLS });
    } else if (method === "tools/call") {
      try {
        const text = await callTool(params.name, params.arguments || {});
        reply(id, { content: [{ type: "text", text }] });
      } catch (e) {
        reply(id, { content: [{ type: "text", text: `Erreur : ${e.message}` }], isError: true });
      }
    } else if (id !== undefined) {
      replyError(id, `Méthode non gérée : ${method}`);
    }
  } catch (e) {
    if (id !== undefined) replyError(id, e.message);
  }
});
