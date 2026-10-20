import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase-config';

// Server-only service-role client. Used ONLY for rows that have no user-level
// insert policy by design (generation_jobs, audit_log) and for platform-wide
// admin aggregates. Never import this from a client component.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createSupabaseClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
