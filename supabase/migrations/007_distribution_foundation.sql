-- HubElites — Phase 5 Slice 1 (2026-11-07): distribution foundation.
-- A distribution connection links an organization to a publishing
-- provider (V1: HubRipple only). Connection metadata is member-visible
-- under the usual tenant policy; the provider API key lives in a
-- separate secrets table with RLS enabled and NO authenticated policies
-- at all — only the service role (server-side push/sync) can read it.
-- Publications are the per-asset distribution records; every one owns a
-- tracked /r/<slug> link whose clicks are logged in link_clicks (the
-- Phase 6 seed) before redirecting to the ambassador's destination.

create table public.distribution_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'hubripple' check (provider in ('hubripple')),
  workspace_label text,
  status text not null default 'connected' check (status in ('connected','error','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table public.distribution_secrets (
  connection_id uuid primary key references public.distribution_connections(id) on delete cascade,
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  asset_id uuid references public.campaign_assets(id) on delete set null,
  connection_id uuid references public.distribution_connections(id) on delete set null,
  platforms text[] not null default '{}',
  caption text not null default '',
  link_slug text not null unique,
  destination_url text not null,
  scheduled_at timestamptz,
  status text not null default 'queued'
    check (status in ('queued','sent','published','partial','failed')),
  external_post_id text,
  published_urls jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  user_agent text,
  referer text
);

create index publications_org_idx on public.publications (organization_id, created_at desc);
create index link_clicks_publication_idx on public.link_clicks (publication_id, clicked_at desc);

alter table public.distribution_connections enable row level security;
alter table public.distribution_secrets enable row level security;
alter table public.publications enable row level security;
alter table public.link_clicks enable row level security;

-- Metadata: org admins manage, members + super admins read/manage per
-- the platform's tenant conventions.
create policy distribution_connections_tenant on public.distribution_connections
  for all using (public.is_org_member(organization_id) or public.is_super_admin())
  with check (public.is_org_admin(organization_id) or public.is_super_admin());

create policy publications_tenant on public.publications
  for all using (public.is_org_member(organization_id) or public.is_super_admin())
  with check (public.is_org_member(organization_id) or public.is_super_admin());

-- Clicks are written by the public /r route through the service role;
-- members can read their own publications' clicks (Phase 6 analytics).
create policy link_clicks_read on public.link_clicks
  for select using (
    exists (
      select 1 from public.publications p
      where p.id = publication_id
        and (public.is_org_member(p.organization_id) or public.is_super_admin())
    )
  );

-- distribution_secrets intentionally has NO policies: with RLS enabled,
-- authenticated/anon roles can neither read nor write it. The service
-- role bypasses RLS and is the only reader.
