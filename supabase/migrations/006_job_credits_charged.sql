-- HubElites — Phase 4 fix (2026-11-06): generation_jobs was created in 001
-- without credits_charged, but the Phase 3 reserve plumbing and the Phase 4
-- charge path both write it. The missing column made every media charge
-- update fail silently (PostgREST error, unchecked), so completed media
-- jobs stayed 'running' and wallets were never debited. Found by the
-- Phase 4 live test: video + image rendered, zero charges recorded.
-- Applied live via the Management API on 2026-11-06 before this file landed.

alter table public.generation_jobs
  add column if not exists credits_charged integer not null default 0;
