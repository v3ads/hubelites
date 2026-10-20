import { OnboardingFlow } from '@/components/app/onboarding-flow';
import { redirect } from 'next/navigation';
import { PUBLIC_ACCESS_ENABLED } from '@/lib/public-access';
import { createClient } from '@/lib/supabase-server';

export const metadata = { title: 'Onboarding' };

export default async function OnboardingPage() {
  if (!PUBLIC_ACCESS_ENABLED) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name,onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.onboarding_completed_at) redirect('/dashboard');

  return (
    <OnboardingFlow
      initialName={(profile?.display_name as string | undefined) ?? ''}
      email={user.email ?? ''}
    />
  );
}
