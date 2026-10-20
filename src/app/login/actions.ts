'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { PUBLIC_ACCESS_ENABLED } from '@/lib/public-access';

function loginUrl(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/login?${search.toString()}`;
}

export async function requestLoginCode(formData: FormData) {
  if (!PUBLIC_ACCESS_ENABLED) redirect('/');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) redirect(loginUrl({ error: 'email_required' }));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) redirect(loginUrl({ error: error.message, email }));
  redirect(loginUrl({ sent: '1', email }));
}

export async function verifyLoginCode(formData: FormData) {
  if (!PUBLIC_ACCESS_ENABLED) redirect('/');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const token = String(formData.get('token') ?? '').replace(/\s+/g, '');

  if (!email) redirect(loginUrl({ error: 'email_required' }));
  if (!/^\d{6,8}$/.test(token)) {
    redirect(loginUrl({ sent: '1', email, error: 'invalid_code' }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) redirect(loginUrl({ sent: '1', email, error: error.message }));

  // New and unfinished accounts go to onboarding; finished ones go to the dashboard.
  const userId = data.user?.id;
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('id', userId)
      .maybeSingle();
    if (!profile?.onboarding_completed_at) redirect('/onboarding');
  }
  redirect('/dashboard');
}
