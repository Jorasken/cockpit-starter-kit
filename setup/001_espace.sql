-- ============================================================
-- Espace de pilotage — base de données (une seule table)
-- À exécuter UNE FOIS dans le SQL Editor du projet Supabase
-- du client (single-tenant : UN projet Supabase par client).
-- Rejouable sans risque (idempotent).
-- ============================================================

create table if not exists public.client_os_collections (
  id uuid primary key default gen_random_uuid(),
  client_slug text not null default 'moi',
  collection text not null,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (client_slug, collection)
);

alter table public.client_os_collections enable row level security;

-- Sécurité single-tenant : toute personne CONNECTÉE à ce projet
-- est le propriétaire de l'espace (un projet = un client).
-- La clé publique (anon) seule ne donne AUCUN accès.
-- Aucune policy DELETE : ni le client ni son IA ne suppriment une collection.
drop policy if exists client_os_collections_owner_select on public.client_os_collections;
create policy client_os_collections_owner_select
  on public.client_os_collections for select to authenticated using (true);

drop policy if exists client_os_collections_owner_insert on public.client_os_collections;
create policy client_os_collections_owner_insert
  on public.client_os_collections for insert to authenticated with check (true);

drop policy if exists client_os_collections_owner_update on public.client_os_collections;
create policy client_os_collections_owner_update
  on public.client_os_collections for update to authenticated using (true) with check (true);

-- Droits d'accès explicites (aucun droit pour anon, pas de delete)
revoke all on public.client_os_collections from anon;
grant select, insert, update on public.client_os_collections to authenticated;
