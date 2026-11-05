-- 003: let the Campaign Engine write its own bookkeeping through the member's
-- session (RLS-scoped), instead of depending on a service-role key in the app env.
-- generation_jobs: members may insert/update jobs for organizations they belong to.
drop policy if exists jobs_insert_member on public.generation_jobs;
create policy jobs_insert_member on public.generation_jobs
  for insert to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists jobs_update_member on public.generation_jobs;
create policy jobs_update_member on public.generation_jobs
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- audit_log: a signed-in user may append entries about their own actions in
-- organizations they belong to. Reads stay super-admin / own-actor only.
drop policy if exists audit_insert_own on public.audit_log;
create policy audit_insert_own on public.audit_log
  for insert to authenticated
  with check (
    actor_user_id = auth.uid()
    and (organization_id is null or public.is_org_member(organization_id))
  );
