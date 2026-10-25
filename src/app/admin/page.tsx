import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getAiSpendSummary } from '@/lib/ai-ledger';
import { AI_WORKLOADS, capUsdFor, cycleLabel } from '@/lib/ai-config';
import { AppShell } from '@/components/app/app-shell';
import { adminNav } from '@/components/app/admin-nav';
import { Icon } from '@/components/icon';

export const metadata = { title: 'Platform Overview' };

function dailyBars(rows: { created_at: string }[]) {
  const days: number[] = Array.from({ length: 7 }, () => 0);
  const now = new Date();
  for (const row of rows) {
    const diff = Math.floor((now.getTime() - new Date(row.created_at).getTime()) / 86_400_000);
    if (diff >= 0 && diff < 7) days[6 - diff] += 1;
  }
  const max = Math.max(...days, 1);
  return days.map((count) => Math.max(12, Math.round((count / max) * 100)));
}

function count30d(rows: { created_at: string }[]) {
  const cutoff = Date.now() - 30 * 86_400_000;
  return rows.filter((row) => new Date(row.created_at).getTime() >= cutoff).length;
}

type HealthItem = { name: string; detail: string; status: string; ok: boolean | null };

async function checkOpenRouter(): Promise<HealthItem> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { name: 'OpenRouter', detail: 'Campaign Brain reasoning', status: 'Not configured', ok: null };
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    return {
      name: 'OpenRouter',
      detail: 'Campaign Brain reasoning',
      status: response.ok ? 'Operational' : `HTTP ${response.status}`,
      ok: response.ok,
    };
  } catch {
    return { name: 'OpenRouter', detail: 'Campaign Brain reasoning', status: 'Unreachable', ok: false };
  }
}

async function checkBrevo(): Promise<HealthItem> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { name: 'Brevo', detail: 'Login codes · Campaign mail', status: 'Not configured', ok: null };
  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': key },
      signal: AbortSignal.timeout(5000),
    });
    return {
      name: 'Brevo',
      detail: 'Login codes · Campaign mail',
      status: response.ok ? 'Operational' : `HTTP ${response.status}`,
      ok: response.ok,
    };
  } catch {
    return { name: 'Brevo', detail: 'Login codes · Campaign mail', status: 'Unreachable', ok: false };
  }
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('is_super_admin,display_name').eq('id', user.id).single();
  if (!profile?.is_super_admin) redirect('/dashboard');


  const [membersResult, orgsResult, campaignsResult, assetsResult, walletsResult, jobsResult, brainResult, auditResult, healthOpenRouter, healthBrevo] =
    await Promise.all([
      supabase.from('profiles').select('id,email,created_at').order('created_at', { ascending: false }).limit(1000),
      supabase.from('organizations').select('id,name,created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('campaigns').select('id,organization_id,created_at').order('created_at', { ascending: false }).limit(1000),
      supabase.from('campaign_assets').select('id,created_at').order('created_at', { ascending: false }).limit(2000),
      supabase.from('credit_wallets').select('organization_id,balance,lifetime_purchased,lifetime_used'),
      supabase.from('generation_jobs').select('id,status,provider_cost_micros,created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('mission_brain_items').select('id,status,updated_at').order('updated_at', { ascending: false }).limit(100),
      supabase.from('audit_log').select('id,action,entity_type,created_at').order('created_at', { ascending: false }).limit(5),
      checkOpenRouter(),
      checkBrevo(),
    ]);

  const members = membersResult.data ?? [];
  const orgs = orgsResult.data ?? [];
  const campaigns = campaignsResult.data ?? [];
  const assets = assetsResult.data ?? [];
  const wallets = walletsResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const brainItems = brainResult.data ?? [];
  const auditEvents = auditResult.data ?? [];

  const creditsUsed = wallets.reduce((sum, wallet) => sum + ((wallet.lifetime_used as number) ?? 0), 0);
  const creditsSold = wallets.reduce((sum, wallet) => sum + ((wallet.lifetime_purchased as number) ?? 0), 0);
  const creditsConsumed = creditsUsed;
  const jobsSucceeded = jobs.filter((job) => job.status === 'succeeded').length;
  const jobsFailed = jobs.filter((job) => job.status === 'failed').length;
  const activeBrain = brainItems.filter((item) => item.status === 'active').length;
  const brainUpdated = brainItems[0]?.updated_at
    ? new Date(brainItems[0].updated_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'never';

  const kpis = [
    { label: 'Members', value: String(members.length), delta: `+${count30d(members)} / 30d`, tone: '', bars: dailyBars(members) },
    { label: 'Campaigns', value: String(campaigns.length), delta: `+${count30d(campaigns)} / 30d`, tone: 'violet', bars: dailyBars(campaigns) },
    { label: 'Assets generated', value: String(assets.length), delta: `+${count30d(assets)} / 30d`, tone: 'cyan', bars: dailyBars(assets) },
    {
      label: 'Media credits used',
      value: String(creditsUsed),
      delta: creditsSold ? `of ${creditsSold} purchased` : 'No purchases yet',
      tone: 'lime',
      bars: dailyBars(jobs as unknown as { created_at: string }[]),
    },
  ];

  // Tenant table: real organizations with owner, campaign count, wallet balance, derived status.
  const { data: ownerRows } = await supabase
    .from('organization_members')
    .select('organization_id,user_id,profiles(email)')
    .eq('role', 'owner');
  const ownerEmailByOrg = new Map<string, string>();
  for (const row of ownerRows ?? []) {
    const profileRef = (row as unknown as { profiles: { email: string } | null }).profiles;
    if (profileRef?.email) ownerEmailByOrg.set(row.organization_id as string, profileRef.email);
  }
  const campaignsByOrg = new Map<string, number>();
  for (const campaign of campaigns) {
    const orgId = campaign.organization_id as string;
    campaignsByOrg.set(orgId, (campaignsByOrg.get(orgId) ?? 0) + 1);
  }
  const walletByOrg = new Map(wallets.map((wallet) => [wallet.organization_id as string, wallet]));

  const tenants = orgs.slice(0, 10).map((org) => {
    const wallet = walletByOrg.get(org.id as string);
    const campaignCount = campaignsByOrg.get(org.id as string) ?? 0;
    const balance = (wallet?.balance as number | undefined) ?? 0;
    const used = (wallet?.lifetime_used as number | undefined) ?? 0;
    const status = campaignCount === 0 ? 'Onboarding' : used > 0 && balance === 0 ? 'Low credits' : 'Healthy';
    return {
      org: org.name as string,
      owner: ownerEmailByOrg.get(org.id as string) ?? '—',
      campaigns: campaignCount,
      credits: balance,
      status,
    };
  });

  const health: HealthItem[] = [
    { name: 'Supabase', detail: 'Auth · Postgres · Storage', status: membersResult.error ? 'Unreachable' : 'Operational', ok: !membersResult.error },
    healthBrevo.ok === null ? { ...healthBrevo, detail: 'Login codes · Campaign mail' } : healthBrevo,
    healthOpenRouter,
    { name: 'HeyGen', detail: 'Avatar video jobs', status: process.env.HEYGEN_API_KEY ? 'Key configured' : 'Not configured — media phase', ok: null },
    { name: 'Higgsfield', detail: 'Generative media', status: process.env.HIGGSFIELD_API_KEY ? 'Key configured' : 'Not configured — media phase', ok: null },
  ];
  const degraded = health.filter((item) => item.ok === false).length;

  // Anthropic credit-cycle readout (fail-safe: null when the ledger is not
  // installed yet or the service role is unavailable — page renders a hint).
  const aiSpend = await getAiSpendSummary(AI_WORKLOADS.hubelitesGeneration);
  const anthropicCap = capUsdFor(AI_WORKLOADS.hubelitesGeneration);
  const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;

  const email = user.email ?? 'admin@hubelites.com';
  const name = (profile.display_name as string | undefined) ?? email.split('@')[0] ?? 'Super Admin';

  return (
    <AppShell
      groups={adminNav('Platform Overview')}
      crumbs={['Platform', 'Overview']}
      user={{ name, email, role: 'Super Admin' }}
      badge={{ label: 'Super Admin', tone: 'pill-violet' }}
      action={
        <a className="btn" href="/dashboard">
          <Icon name="users" />
          View as member
        </a>
      }
    >
      <div className="page-head">
        <div>
          <h1>Platform overview</h1>
          <p>Real platform data — every number below is read live from the database and the providers.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {degraded === 0 ? (
            <span className="pill pill-live">
              <span className="dot" /> Core services operational
            </span>
          ) : (
            <span className="pill pill-warn">{degraded} service{degraded === 1 ? '' : 's'} need attention</span>
          )}
          <span className="pill">{orgs.length} organization{orgs.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="kpis">
        {kpis.map((kpi) => (
          <article className={`kpi ${kpi.tone}`} key={kpi.label}>
            <div className="kpi-top">
              <span className="label">{kpi.label}</span>
              <span className="delta">{kpi.delta}</span>
            </div>
            <strong>{kpi.value}</strong>
            <div className="kpi-spark" aria-hidden="true">
              {kpi.bars.map((bar, index) => (
                <i key={index} style={{ height: `${bar}%` }} />
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="cols">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Tenant activity</h2>
              <p>Organizations on the platform, newest first.</p>
            </div>
          </div>
          <div className="panel-body flush" style={{ padding: '16px 8px 8px' }}>
            {tenants.length === 0 ? (
              <p style={{ padding: '0 16px 12px', fontSize: 14, color: 'var(--text-3)' }}>No organizations yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Owner</th>
                    <th>Campaigns</th>
                    <th>Credits</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.org}>
                      <td>
                        <b>{tenant.org}</b>
                      </td>
                      <td>{tenant.owner}</td>
                      <td>{tenant.campaigns}</td>
                      <td>{tenant.credits}</td>
                      <td>
                        <span
                          className={
                            tenant.status === 'Healthy'
                              ? 'pill pill-live'
                              : tenant.status === 'Low credits'
                                ? 'pill pill-warn'
                                : 'pill pill-accent'
                          }
                        >
                          {tenant.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>System health</h2>
              <p>Checked live when this page loaded.</p>
            </div>
          </div>
          <div className="health">
            {health.map((item) => (
              <div key={item.name}>
                <span className={`ichip ichip-sm ${item.ok === true ? 'ichip-emerald' : item.ok === false ? 'ichip-amber' : 'ichip-violet'}`}>
                  <Icon name={item.ok === true ? 'check' : 'bolt'} />
                </span>
                <div>
                  <b>{item.name}</b>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{item.detail}</div>
                </div>
                <small>{item.status}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="cols-3">
        <section className="panel">
          <div className="panel-head">
            <h2>Mission Brain</h2>
            <span className="pill pill-accent">{activeBrain} active</span>
          </div>
          <div className="panel-body">
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Approved Mission 1000 positioning, offers, claims and restrictions currently served to every campaign.
            </p>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <div className="row-item" style={{ padding: '10px 0', borderTop: 0 }}>
                <span className="ichip ichip-sm ichip-violet">
                  <Icon name="brain" />
                </span>
                <div>
                  <b>
                    {activeBrain} approved item{activeBrain === 1 ? '' : 's'} of {brainItems.length}
                  </b>
                  <small>Last updated {brainUpdated}</small>
                </div>
              </div>
              <a className="btn btn-sm" href="/admin/mission-brain" style={{ justifySelf: 'start' }}>
                Open Mission Brain
                <Icon name="arrow" />
              </a>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Generation & credits</h2>
            <span className="pill">All time</span>
          </div>
          <div className="panel-body">
            <div className="credit-visual">
              <div className="row">
                <span>Credits purchased</span>
                <b>{creditsSold}</b>
              </div>
              <div className="row">
                <span>Credits consumed</span>
                <b>{creditsConsumed}</b>
              </div>
              <div className="row">
                <span>Generation jobs</span>
                <b>{jobs.length}</b>
              </div>
              <div className="row">
                <span>Jobs succeeded / failed</span>
                <b>
                  {jobsSucceeded} / {jobsFailed}
                </b>
              </div>
              <div className="row">
                <span>Anthropic cycle spend ({cycleLabel()})</span>
                <b>
                  {!anthropicConfigured
                    ? 'Not configured'
                    : aiSpend
                      ? `$${aiSpend.anthropicSpendUsd.toFixed(2)} of $${anthropicCap} cap`
                      : 'Ledger pending'}
                </b>
              </div>
              <div className="row">
                <span>Last generation provider</span>
                <b>
                  {aiSpend?.lastProvider
                    ? `${aiSpend.lastProvider === 'anthropic' ? 'Anthropic' : 'OpenRouter'}${aiSpend.lastModel ? ` · ${aiSpend.lastModel}` : ''}`
                    : '—'}
                </b>
              </div>
            </div>
            {anthropicConfigured && !aiSpend && (
              <p style={{ fontSize: 12.5, color: 'var(--text-4)', marginTop: 12 }}>
                Anthropic first-spend activates once migration 002 (ai_spend_ledger) is applied in Supabase.
                Until then generation runs on OpenRouter.
              </p>
            )}
            {jobs.length === 0 && (
              <p style={{ fontSize: 12.5, color: 'var(--text-4)', marginTop: 12 }}>
                No generation jobs yet. The first campaign generation will appear here with its provider cost.
              </p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Recent audit events</h2>
          </div>
          <div className="rows">
            {auditEvents.length === 0 && (
              <p style={{ padding: 16, fontSize: 14, color: 'var(--text-3)' }}>No audit events recorded yet.</p>
            )}
            {auditEvents.map((event) => (
              <div className="row-item" key={event.id as string}>
                <span className="ichip ichip-sm ichip-blue">
                  <Icon name="lock" />
                </span>
                <div>
                  <b>{event.action as string}</b>
                  <small>
                    {(event.entity_type as string | null) ?? 'platform'} ·{' '}
                    {new Date(event.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
