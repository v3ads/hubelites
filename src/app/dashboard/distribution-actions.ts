'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export type ConnectionResult = { ok: true } | { ok: false; error: string };

async function resolveOrganizationId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  return (membership?.organization_id as string | undefined) ?? null;
}

/**
 * Save the HubRipple connection. The workspace key is stored ONLY in
 * distribution_secrets (service-role table, no member policies). An
 * empty key field means "keep what's saved" — the wizard rule: a saved
 * secret is never re-entered and never wiped by an empty field.
 */
export async function saveHubRippleConnection(label: string, apiKey: string): Promise<ConnectionResult> {
  const supabase = await createClient();
  const organizationId = await resolveOrganizationId(supabase);
  if (!organizationId) return { ok: false, error: 'No workspace found for your account yet.' };

  const { data: connection, error } = await supabase
    .from('distribution_connections')
    .upsert(
      {
        organization_id: organizationId,
        provider: 'hubripple',
        workspace_label: label.trim() || null,
        status: 'connected',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,provider' },
    )
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  const key = apiKey.trim();
  if (key) {
    const admin = createAdminClient();
    const { error: secretError } = await admin.from('distribution_secrets').upsert(
      { connection_id: connection.id, api_key: key, updated_at: new Date().toISOString() },
      { onConflict: 'connection_id' },
    );
    if (secretError) return { ok: false, error: 'Connection saved, but the key could not be stored. Try again.' };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

export async function disconnectHubRipple(): Promise<ConnectionResult> {
  const supabase = await createClient();
  const organizationId = await resolveOrganizationId(supabase);
  if (!organizationId) return { ok: false, error: 'No workspace found for your account yet.' };

  const { data: connection } = await supabase
    .from('distribution_connections')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'hubripple')
    .maybeSingle();
  if (connection) {
    const admin = createAdminClient();
    await admin.from('distribution_secrets').delete().eq('connection_id', connection.id);
    const { error } = await supabase
      .from('distribution_connections')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', connection.id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
