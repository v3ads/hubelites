import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/app/app-shell';
import { memberNav } from '@/components/app/member-nav';
import { Icon } from '@/components/icon';

export const metadata = { title: 'Campaigns' };

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  generating: 'Generating',
  ready: 'Ready to review',
  scheduled: 'Scheduled',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
};

export default async function CampaignsPage() {
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

  const [{ data: campaigns }, { data: audiences }, { data: wallet }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id,title,status,budget_mode,audience_id,created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase.from('audiences').select('id,name').eq('organization_id', orgId),
    supabase.from('credit_wallets').select('balance,lifetime_used').eq('organization_id', orgId).maybeSingle(),
  ]);

  const rows = campaigns ?? [];
  const { data: assets } = rows.length
    ? await supabase.from('campaign_assets').select('id,campaign_id,status').eq('organization_id', orgId)
    : { data: [] };
  const assetCounts = new Map<string, { total: number; approved: number }>();
  for (const asset of assets ?? []) {
    const entry = assetCounts.get(asset.campaign_id as string) ?? { total: 0, approved: 0 };
    entry.total += 1;
    if (asset.status === 'approved') entry.approved += 1;
    assetCounts.set(asset.campaign_id as string, entry);
  }
  const audienceName = new Map((audiences ?? []).map((a) => [a.id as string, a.name as string]));

  const email = user.email ?? '';
  const name = (profile?.display_name as string | undefined) ?? email.split('@')[0] ?? 'Ambassador';
  const creditTotal = ((wallet?.balance as number | undefined) ?? 0) + ((wallet?.lifetime_used as number | undefined) ?? 0);

  return (
    <AppShell
      groups={memberNav('Campaigns', Boolean(profile?.is_super_admin))}
      crumbs={['Workspace', 'Campaigns']}
      user={{ name, email, role: profile?.is_super_admin ? 'Super Admin' : 'Ambassador' }}
      credits={creditTotal > 0 ? { used: (wallet?.lifetime_used as number) ?? 0, total: creditTotal } : undefined}
      action={
        <a className="btn btn-primary" href="/campaigns/new">
          <Icon name="sparkles" />
          Create with AI
        </a>
      }
    >
      <div className="page-head">
        <div>
          <h1>Campaigns</h1>
          <p>Every campaign starts from one audience decision. Open one to generate its week, review the assets, and approve what ships.</p>
        </div>
        <a className="btn btn-primary" href="/campaigns/new">
          <Icon name="plus" />
          New campaign
        </a>
      </div>

      {rows.length === 0 ? (
        <section className="panel">
          <div className="panel-body">
            <h2 style={{ marginTop: 0 }}>No campaigns yet</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)', maxWidth: '62ch' }}>
              Your first campaign is one decision away: pick an audience, and the Campaign Brain builds the angle,
              the calendar and the assets around your Mission 1000 destination.
            </p>
            <a className="btn btn-primary" href="/campaigns/new">
              <Icon name="sparkles" />
              Create your first campaign
            </a>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-body flush" style={{ padding: '16px 8px 8px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Audience</th>
                  <th>Status</th>
                  <th>Assets</th>
                  <th>Mode</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((campaign) => {
                  const counts = assetCounts.get(campaign.id as string) ?? { total: 0, approved: 0 };
                  return (
                    <tr key={campaign.id as string}>
                      <td>
                        <a href={`/campaigns/${campaign.id}`} style={{ fontWeight: 700, color: 'inherit' }}>
                          {campaign.title as string}
                        </a>
                      </td>
                      <td>{campaign.audience_id ? audienceName.get(campaign.audience_id as string) ?? '—' : '—'}</td>
                      <td>
                        <span className={`pill ${campaign.status === 'ready' ? 'pill-live' : ''}`}>
                          {statusLabels[campaign.status as string] ?? (campaign.status as string)}
                        </span>
                      </td>
                      <td>
                        {counts.total ? `${counts.total} (${counts.approved} approved)` : 'Not generated'}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{(campaign.budget_mode as string).replace('_', ' ')}</td>
                      <td>
                        {new Date(campaign.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td>
                        <a className="btn btn-sm" href={`/campaigns/${campaign.id}`}>
                          Open
                          <Icon name="arrow" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppShell>
  );
}
