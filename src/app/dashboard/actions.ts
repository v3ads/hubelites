'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

export type SaveDestinationResult = { ok: true } | { ok: false; error: string };

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function saveDestination(rawUrl: string): Promise<SaveDestinationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session expired. Sign in again.' };

  const url = normalizeUrl(rawUrl);
  if (!url || url === 'https://') return { ok: false, error: 'Enter your Mission 1000 destination URL.' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'No workspace found for your account yet.' };

  const { error } = await supabase.from('ambassador_destinations').upsert(
    {
      organization_id: membership.organization_id,
      campaign_key: 'mission-1000',
      destination_url: url,
      is_active: true,
    },
    { onConflict: 'organization_id,campaign_key' },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  return { ok: true };
}
