import { OnboardingFlow } from '@/components/app/onboarding-flow';
import { redirect } from 'next/navigation';
import { PUBLIC_ACCESS_ENABLED } from '@/lib/public-access';

export const metadata = { title: 'Onboarding' };

export default function OnboardingPage() {
  if (!PUBLIC_ACCESS_ENABLED) redirect('/');
  return <OnboardingFlow />;
}
