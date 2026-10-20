'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

export type MissionBrainInput = {
  id?: string;
  key: string;
  category: string;
  title: string;
  text: string;
  status: 'draft' | 'active' | 'retired';
};

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: 'Your session expired. Sign in again.' as const };
  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single();
  if (!profile?.is_super_admin) return { supabase, user: null, error: 'Super Admin access required.' as const };
  return { supabase, user, error: null };
}

export async function saveMissionBrainItem(input: MissionBrainInput): Promise<ActionResult> {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { ok: false, error: error ?? 'Not authorized.' };

  const key = input.key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!key) return { ok: false, error: 'A key is required (letters, numbers, dashes).' };
  if (!input.title.trim()) return { ok: false, error: 'A title is required.' };
  if (!input.text.trim()) return { ok: false, error: 'Content text is required.' };

  const payload = {
    key,
    category: input.category.trim() || 'positioning',
    title: input.title.trim(),
    content: { text: input.text.trim() },
    status: input.status,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error: writeError } = input.id
    ? await supabase.from('mission_brain_items').update(payload).eq('id', input.id)
    : await supabase.from('mission_brain_items').insert(payload);

  if (writeError) return { ok: false, error: writeError.message };

  revalidatePath('/admin/mission-brain');
  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteMissionBrainItem(id: string): Promise<ActionResult> {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return { ok: false, error };

  const { error: deleteError } = await supabase.from('mission_brain_items').delete().eq('id', id);
  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath('/admin/mission-brain');
  revalidatePath('/admin');
  return { ok: true };
}
