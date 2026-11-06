import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/app-shell';
import { adminNav } from '@/components/app/admin-nav';
import { createClient } from '@/lib/supabase-server';

type JobRow = {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  status: string;
  credits_reserved: number;
  credits_charged: number;
  provider_cost_micros: number | null;
  error_message: string | null;
  request: { kind?: string; provider?: string; engine?: string; asset_id?: string } | null;
  created_at: string;
  completed_at: string | null;
};

export default async function AdminMediaJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_super_admin) redirect('/dashboard');

  const [{ data: jobs }, { data: orgs }, { data: campaigns }] = await Promise.all([
    supabase
      .from('generation_jobs')
      .select('id, organization_id, campaign_id, status, credits_reserved, credits_charged, provider_cost_micros, error_message, request, created_at, completed_at')
      .in('request->>kind', ['media_image', 'media_video'])
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('organizations').select('id, name'),
    supabase.from('campaigns').select('id, title'),
  ]);
  const rows = (jobs ?? []) as unknown as JobRow[];
  const orgName = new Map((orgs ?? []).map((org) => [org.id, org.name]));
  const campaignTitle = new Map((campaigns ?? []).map((campaign) => [campaign.id, campaign.title]));
  const succeeded = rows.filter((job) => job.status === 'succeeded');
  const failed = rows.filter((job) => job.status === 'failed');
  const creditsCharged = rows.reduce((sum, job) => sum + (job.credits_charged ?? 0), 0);
  const providerCost = rows.reduce((sum, job) => sum + (job.provider_cost_micros ?? 0), 0);

  return (
    <AppShell
      groups={adminNav('Media Jobs')}
      crumbs={['Admin', 'Media Jobs']}
      user={{ name: profile.display_name ?? 'Admin', email: user.email ?? '', role: 'Super Admin' }}
    >
      <div className="page-head">
        <div>
          <h1>Media Jobs</h1>
          <p>Every image and avatar-video generation across workspaces — provider, status, credits charged, and the platform's real provider cost beside them.</p>
        </div>
      </div>

      <div className="grid cols-4">
        <article className="stat"><span>Jobs</span><strong>{rows.length}</strong><small>most recent 100</small></article>
        <article className="stat"><span>Succeeded / failed</span><strong>{succeeded.length} / {failed.length}</strong><small>failures are never charged</small></article>
        <article className="stat"><span>Credits charged</span><strong>{creditsCharged.toLocaleString()}</strong><small>member credits</small></article>
        <article className="stat"><span>Provider cost</span><strong>${(providerCost / 1_000_000).toFixed(2)}</strong><small>tracked from job results</small></article>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No media jobs yet. The first generated image or avatar video will appear here.</p>
        ) : (
          rows.map((job) => (
            <div className="ledger-row" key={job.id}>
              <div>
                <strong>
                  {job.request?.kind === 'media_video' ? 'Avatar video' : 'Image'} · {job.request?.provider ?? '—'}
                  {job.request?.engine ? ` · ${job.request.engine}` : ''}
                </strong>
                <div className="small muted">
                  {orgName.get(job.organization_id) ?? job.organization_id}
                  {job.campaign_id ? ` · ${campaignTitle.get(job.campaign_id) ?? 'Campaign'}` : ''} · {job.status}
                  {job.error_message ? ` · ${job.error_message}` : ''}
                </div>
                <div className="small muted">
                  {new Date(job.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  {job.completed_at ? ` → ${new Date(job.completed_at).toLocaleString('en-US', { timeStyle: 'short' })}` : ''}
                </div>
              </div>
              <div className="ledger-amount">
                <span>{job.credits_charged > 0 ? `−${job.credits_charged} credits` : job.status === 'running' ? `${job.credits_reserved} reserved` : '0 credits'}</span>
                <small className="muted">{job.provider_cost_micros ? `cost $${(job.provider_cost_micros / 1_000_000).toFixed(3)}` : 'cost —'}</small>
              </div>
            </div>
          ))
        )}
      </section>

      <style>{`
        .grid { display: grid; gap: 14px; margin: 14px 0; }
        .grid.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        @media (max-width: 900px) { .grid.cols-4 { grid-template-columns: 1fr 1fr; } }
        .stat { background: var(--surface-1); border: 1px solid var(--line); border-radius: 14px; padding: 16px; display: grid; gap: 3px; }
        .stat span { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-3); }
        .stat strong { font-size: 26px; }
        .stat small { color: var(--text-3); }
        .ledger-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
        .ledger-row:last-child { border-bottom: 0; }
        .ledger-amount { text-align: right; display: grid; gap: 2px; }
      `}</style>
    </AppShell>
  );
}
