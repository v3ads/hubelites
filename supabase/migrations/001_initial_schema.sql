-- HubElites V1 — Ambassador Marketing Engine
-- Multi-tenant schema with tenant isolation and Super Admin visibility.

create extension if not exists pgcrypto;

create type public.org_role as enum ('owner','admin','member');
create type public.campaign_status as enum ('draft','generating','ready','scheduled','active','paused','completed','failed');
create type public.asset_type as enum ('social_post','email','image','video','carousel','script','landing_copy');
create type public.job_status as enum ('queued','running','succeeded','failed','cancelled');
create type public.credit_entry_type as enum ('grant','purchase','usage','refund','adjustment');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  is_super_admin boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','suspended','closed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table public.brand_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  business_name text,
  personal_name text,
  website_url text,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  voice_style text,
  default_theme text not null default 'dark' check (default_theme in ('dark','light')),
  updated_at timestamptz not null default now()
);

create table public.ambassador_destinations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_key text not null default 'mission-1000',
  destination_url text not null,
  verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id,campaign_key)
);

create table public.audiences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  pains jsonb not null default '[]'::jsonb,
  desired_outcomes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.social_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  external_account_id text,
  display_name text,
  token_reference text,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected','expired','revoked','error')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (organization_id,provider,external_account_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  audience_id uuid references public.audiences(id) on delete set null,
  destination_id uuid references public.ambassador_destinations(id) on delete set null,
  title text not null,
  objective text not null default 'webinar_registration',
  budget_mode text not null default 'balanced' check (budget_mode in ('economy','balanced','video_heavy')),
  status public.campaign_status not null default 'draft',
  brief jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type public.asset_type not null,
  title text,
  body text,
  media_url text,
  thumbnail_url text,
  channel text,
  status text not null default 'draft' check (status in ('draft','ready','approved','scheduled','published','failed')),
  scheduled_for timestamptz,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_provider_catalog (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_key text not null,
  display_name text not null,
  media_kind text not null check (media_kind in ('image','video','avatar_video','audio')),
  internal_cost_micros bigint not null default 0,
  credit_cost integer not null check (credit_cost >= 0),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (provider,model_key)
);

create table public.credit_wallets (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_purchased integer not null default 0,
  lifetime_used integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_type public.credit_entry_type not null,
  credits integer not null,
  balance_after integer not null,
  amount_cents integer,
  external_reference text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  asset_id uuid references public.campaign_assets(id) on delete set null,
  provider_catalog_id uuid references public.media_provider_catalog(id),
  status public.job_status not null default 'queued',
  credits_reserved integer not null default 0,
  provider_cost_micros bigint,
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_name text,
  website_url text,
  contact_name text,
  contact_email text,
  status text not null default 'new' check (status in ('new','researched','contacted','engaged','converted','lost')),
  research jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mission_brain_items (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  category text not null,
  title text not null,
  content jsonb not null,
  status text not null default 'active' check (status in ('draft','active','retired')),
  effective_from timestamptz,
  effective_until timestamptz,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  asset_id uuid references public.campaign_assets(id) on delete cascade,
  event_name text not null,
  source text,
  anonymous_id text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce((select is_super_admin from public.profiles where id=auth.uid()),false); $$;

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.organization_members where organization_id=org_id and user_id=auth.uid()); $$;

create or replace function public.is_org_admin(org_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.is_super_admin() or exists(select 1 from public.organization_members where organization_id=org_id and user_id=auth.uid() and role in ('owner','admin')); $$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.ambassador_destinations enable row level security;
alter table public.audiences enable row level security;
alter table public.social_connections enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_assets enable row level security;
alter table public.media_provider_catalog enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.prospects enable row level security;
alter table public.mission_brain_items enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_read on public.profiles for select using (id=auth.uid() or public.is_super_admin());
create policy profiles_update on public.profiles for update using (id=auth.uid() or public.is_super_admin());
create policy org_read on public.organizations for select using (public.is_org_member(id) or public.is_super_admin());
create policy org_update on public.organizations for update using (public.is_org_admin(id));
create policy members_read on public.organization_members for select using (public.is_org_member(organization_id) or public.is_super_admin());
create policy members_write on public.organization_members for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy brand_tenant on public.brand_profiles for all using (public.is_org_member(organization_id) or public.is_super_admin()) with check (public.is_org_admin(organization_id));
create policy destinations_tenant on public.ambassador_destinations for all using (public.is_org_member(organization_id) or public.is_super_admin()) with check (public.is_org_admin(organization_id));
create policy audiences_tenant on public.audiences for all using (public.is_org_member(organization_id) or public.is_super_admin()) with check (public.is_org_member(organization_id) or public.is_super_admin());
create policy social_read on public.social_connections for select using (public.is_org_member(organization_id) or public.is_super_admin());
create policy social_write on public.social_connections for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy campaigns_tenant on public.campaigns for all using (public.is_org_member(organization_id) or public.is_super_admin()) with check (public.is_org_member(organization_id) or public.is_super_admin());
create policy assets_tenant on public.campaign_assets for all using (public.is_org_member(organization_id) or public.is_super_admin()) with check (public.is_org_member(organization_id) or public.is_super_admin());
create policy wallets_read on public.credit_wallets for select using (public.is_org_member(organization_id) or public.is_super_admin());
create policy ledger_read on public.credit_ledger for select using (public.is_org_member(organization_id) or public.is_super_admin());
create policy jobs_read on public.generation_jobs for select using (public.is_org_member(organization_id) or public.is_super_admin());
create policy prospects_tenant on public.prospects for all using (public.is_org_member(organization_id) or public.is_super_admin()) with check (public.is_org_member(organization_id) or public.is_super_admin());
create policy analytics_read on public.analytics_events for select using (organization_id is null or public.is_org_member(organization_id) or public.is_super_admin());
create policy providers_super_read on public.media_provider_catalog for select using (public.is_super_admin());
create policy providers_super_write on public.media_provider_catalog for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy mission_read on public.mission_brain_items for select to authenticated using (status='active' or public.is_super_admin());
create policy mission_write on public.mission_brain_items for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy audit_super_read on public.audit_log for select using (public.is_super_admin());

create index campaigns_org_idx on public.campaigns(organization_id,created_at desc);
create index assets_org_idx on public.campaign_assets(organization_id,created_at desc);
create index jobs_org_idx on public.generation_jobs(organization_id,created_at desc);
create index prospects_org_idx on public.prospects(organization_id,created_at desc);
create index analytics_org_idx on public.analytics_events(organization_id,occurred_at desc);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,email,display_name)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1)))
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_auth_user();

create or replace function public.create_my_organization(org_name text,org_slug text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare new_org_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(trim(org_name))<2 then raise exception 'organization name is required'; end if;
  if org_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'invalid organization slug'; end if;

  insert into public.organizations(name,slug,created_by)
  values(trim(org_name),lower(org_slug),auth.uid()) returning id into new_org_id;

  insert into public.organization_members(organization_id,user_id,role) values(new_org_id,auth.uid(),'owner');
  insert into public.brand_profiles(organization_id,business_name) values(new_org_id,trim(org_name));
  insert into public.credit_wallets(organization_id) values(new_org_id);
  insert into public.audit_log(actor_user_id,organization_id,action,entity_type,entity_id)
  values(auth.uid(),new_org_id,'organization.created','organization',new_org_id::text);
  return new_org_id;
end;
$$;

grant execute on function public.create_my_organization(text,text) to authenticated;
