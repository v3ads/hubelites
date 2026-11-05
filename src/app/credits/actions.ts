'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getPack, packPriceId } from '@/lib/credits';
import { createPackCheckoutSession, stripeConfigured } from '@/lib/stripe';

export async function buyPack(formData: FormData) {
  const pack = getPack(String(formData.get('pack_id') ?? ''));
  if (!pack) redirect('/credits?checkout=error');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect('/onboarding');

  if (!stripeConfigured()) redirect('/credits?checkout=unavailable');
  const priceId = packPriceId(pack);
  if (!priceId) redirect('/credits?checkout=unavailable');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hubelites.com';
  const session = await createPackCheckoutSession({
    priceId,
    organizationId: membership.organization_id,
    packId: pack.id,
    credits: pack.credits,
    customerEmail: user.email ?? '',
    appUrl,
  });
  redirect(session.url);
}
