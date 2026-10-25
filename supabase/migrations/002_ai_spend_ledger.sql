-- HubElites — AI provider spend ledger (Anthropic credit-cycle tracking)
--
-- APPLY MANUALLY: paste this whole file into the Supabase SQL Editor for the
-- "HubElites" project (us-east-1) and run it once, after 001_initial_schema.sql.
-- (Migrations in this repo are applied by hand; nothing runs this file
-- automatically.) Until it is applied, the app behaves exactly as before:
-- the Anthropic first-spend layer stays inactive and generation uses
-- OpenRouter only.
--
-- One row per AI generation call. cycle_start is the 4th-of-month anchor of
-- the Anthropic credit cycle the call belongs to (cycles run 4th -> 3rd).
-- The hubelites-generation workload has a $35/cycle Anthropic cap
-- (src/lib/ai-config.ts); the router sums provider='anthropic' rows for the
-- current cycle_start before spending more credits.
--
-- Writes come from the server via the service role (no user insert policy,
-- same pattern as generation_jobs / audit_log). Super Admins can read.

create table public.ai_spend_ledger (
  id bigint generated always as identity primary key,
  cycle_start date not null,
  workload text not null,
  provider text not null check (provider in ('anthropic','openrouter')),
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  est_cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ai_spend_ledger enable row level security;

create policy ai_spend_super_read on public.ai_spend_ledger for select using (public.is_super_admin());

create index ai_spend_cycle_idx on public.ai_spend_ledger(workload, cycle_start, provider);
create index ai_spend_created_idx on public.ai_spend_ledger(created_at desc);
