import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/app/app-shell';
import { memberNav } from '@/components/app/member-nav';
import { NewCampaignForm } from '@/components/app/campaign-studio';

export const metadata = { title: 'New campaign' };

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name,is_super_admin')
    .eq('id', user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect('/onboarding');
  const orgId = membership.organization_id as string;

  const [{ data: audiences }, { data: wallet }] = await Promise.all([
    supabase.from('audiences').select('id,name').eq('organization_id', orgId).order('created_at', { ascending: true }),
    supabase.from('credit_wallets').select('balance,lifetime_used').eq('organization_id', orgId).maybeSingle(),
  ]);

  const email = user.email ?? '';
  const name = (profile?.display_name as string | undefined) ?? email.split('@')[0] ?? 'Ambassador';
  const creditTotal = ((wallet?.balance as number | undefined) ?? 0) + ((wallet?.lifetime_used as number | undefined) ?? 0);

  return (
    <AppShell
      groups={memberNav('Create', Boolean(profile?.is_super_admin))}
      crumbs={['Workspace', 'Campaigns', 'New']}
      user={{ name, email, role: profile?.is_super_admin ? 'Super Admin' : 'Ambassador' }}
      credits={creditTotal > 0 ? { used: (wallet?.lifetime_used as number) ?? 0, total: creditTotal } : undefined}
    >
      <div className="page-head">
        <div>
          <h1>New campaign</h1>
          <p>One decision — who this is for. The Campaign Brain handles positioning, hooks, objections, cadence and calls to action from there.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-body">
          <NewCampaignForm audiences={(audiences ?? []).map((a) => ({ id: a.id as string, name: a.name as string }))} />
        </div>
      </section>
    </AppShell>
  );
}
