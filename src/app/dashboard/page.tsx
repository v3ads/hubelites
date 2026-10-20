import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AppShell, type NavGroup } from '@/components/app/app-shell';
import { DestinationForm } from '@/components/app/destination-form';
import { Icon } from '@/components/icon';

export const metadata = { title: 'Dashboard' };

type AssetRow = {
  id: string;
  title: string | null;
  type: string;
  channel: string | null;
  status: string;
  scheduled_for: string | null;
  created_at: string;
};

const typeLabels: Record<string, string> = {
  social_post: 'Social post',
  email: 'Email',
  image: 'Graphic',
  video: 'Video',
  carousel: 'Carousel',
  script: 'Script',
  landing_copy: 'Landing copy',
};

const typeTones: Record<string, string> = {
  social_post: 'violet',
  email: 'cyan',
  image: 'lime',
  video: 'blue',
  carousel: 'lime',
  script: 'blue',
  landing_copy: 'violet',
};

function dailyBars(rows: { created_at: string }[]) {
  const days: number[] = Array.from({ length: 7 }, () => 0);
  const now = new Date();
  for (const row of rows) {
    const created = new Date(row.created_at);
    const diff = Math.floor((now.getTime() - created.getTime()) / 86_400_000);
    if (diff >= 0 && diff < 7) days[6 - diff] += 1;
  }
  const max = Math.max(...days, 1);
  return days.map((count) => Math.max(12, Math.round((count / max) * 100)));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name,is_super_admin,onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id,role,organizations(name,slug)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  // Signed in but no workspace yet — onboarding creates it.
  if (!membership) redirect('/onboarding');

  const orgId = membership.organization_id as string;
  const org = (membership as unknown as { organizations: { name: string; slug: string } | null }).organizations;

  const [brandResult, destinationResult, audiencesResult, campaignsResult, assetsResult, walletResult, visitsResult, prospectsResult] =
    await Promise.all([
      supabase.from('brand_profiles').select('*').eq('organization_id', orgId).maybeSingle(),
      supabase
        .from('ambassador_destinations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('audiences').select('id,name').eq('organization_id', orgId).order('created_at', { ascending: true }),
      supabase
        .from('campaigns')
        .select('id,title,status,brief,audience_id,created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('campaign_assets')
        .select('id,title,type,channel,status,scheduled_for,created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('credit_wallets').select('*').eq('organization_id', orgId).maybeSingle(),
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .in('event_name', ['funnel_visit', 'click', 'asset_click']),
      supabase.from('prospects').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    ]);

  const brand = brandResult.data;
  const destination = destinationResult.data;
  const audiences = audiencesResult.data ?? [];
  const campaigns = campaignsResult.data ?? [];
  const assets = (assetsResult.data ?? []) as AssetRow[];
  const wallet = walletResult.data;
  const funnelVisits = visitsResult.count ?? 0;
  const prospectsCount = prospectsResult.count ?? 0;

  const email = user.email ?? 'ambassador@hubelites.com';
  const name =
    (profile?.display_name as string | undefined) ??
    ((user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0]) ??
    'Ambassador';
  const isSuperAdmin = Boolean(profile?.is_super_admin);

  const byStatus = (status: string) => assets.filter((asset) => asset.status === status);
  const readyAssets = assets.filter((asset) => ['ready', 'approved'].includes(asset.status));
  const scheduledAssets = byStatus('scheduled');
  const publishedAssets = byStatus('published');
  const draftAssets = byStatus('draft');
  const draftCampaign = campaigns.find((campaign) => campaign.status === 'draft') ?? campaigns[0];
  const creditBalance = (wallet?.balance as number | undefined) ?? 0;
  const creditUsed = (wallet?.lifetime_used as number | undefined) ?? 0;
  const creditTotal = creditBalance + creditUsed;

  const destinationHost = destination?.destination_url
    ? String(destination.destination_url).replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

  const audienceNameById = new Map(audiences.map((audience) => [audience.id as string, audience.name as string]));
  const draftBrief = (draftCampaign?.brief ?? {}) as {
    audiences?: string[];
    channels?: string[];
    tone?: string;
    note?: string;
  };

  const kpis = [
    {
      label: 'Campaigns',
      value: String(campaigns.length),
      delta: campaigns.length ? `${campaigns.filter((c) => c.status === 'draft').length} in draft` : 'None yet',
      tone: '',
      bars: dailyBars(campaigns),
    },
    {
      label: 'Assets ready',
      value: String(readyAssets.length),
      delta: assets.length ? `${assets.length} assets total` : 'Nothing generated yet',
      tone: 'violet',
      bars: dailyBars(assets),
    },
    {
      label: 'Scheduled',
      value: String(scheduledAssets.length),
      delta: scheduledAssets.length ? 'In this week’s plan' : 'Nothing scheduled',
      tone: 'cyan',
      bars: dailyBars(scheduledAssets as unknown as { created_at: string }[]),
    },
    {
      label: 'Funnel visits',
      value: String(funnelVisits),
      delta: destinationHost ? `Tracked to ${destinationHost}` : 'Set a destination to track',
      tone: 'lime',
      bars: Array.from({ length: 7 }, () => Math.min(100, 12 + funnelVisits)),
    },
  ];

  const boardColumns = [
    { title: 'Drafting', rows: draftAssets, empty: 'Draft assets appear here as campaigns are generated.' },
    { title: 'Needs approval', rows: readyAssets, empty: 'Assets waiting on your approval land here.' },
    { title: 'Scheduled', rows: scheduledAssets, empty: 'Approved assets get scheduled here.' },
    { title: 'Published', rows: publishedAssets, empty: 'Published assets and their results show here.' },
  ];

  // Current week (Mon–Sun) from scheduled assets.
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const chips = scheduledAssets
      .filter((asset) => asset.scheduled_for && new Date(asset.scheduled_for).toDateString() === date.toDateString())
      .map((asset) => ({ label: typeLabels[asset.type] ?? asset.type, tone: typeTones[asset.type] ?? 'blue' }));
    return { day, chips };
  });

  const checklist = [
    {
      done: true,
      title: 'Workspace created',
      detail: org?.name ? `${org.name} is live and this dashboard reads its real data.` : 'Your workspace is live.',
    },
    {
      done: Boolean(destination),
      title: 'Mission 1000 destination',
      detail: destination
        ? `Every CTA points to ${destinationHost}.`
        : 'Not set yet — add it in the destination panel below and every CTA will point home.',
    },
    {
      done: audiences.length > 0,
      title: 'Audiences defined',
      detail: audiences.length
        ? audiences.map((a) => a.name).join(', ')
        : 'No audiences yet. Campaigns start from an audience decision.',
    },
    {
      done: campaigns.length > 0,
      title: 'First campaign draft',
      detail: campaigns.length
        ? `“${draftCampaign?.title}” is saved as a draft, ready for the Campaign Brain.`
        : 'Your first campaign draft is created during setup.',
    },
    {
      done: false,
      title: 'Channels connected',
      detail: 'Social connections and publishing arrive with the Distribution phase. Assets stay export-ready until then.',
    },
    {
      done: creditBalance > 0,
      title: 'Media credits',
      detail:
        creditBalance > 0
          ? `${creditBalance} credits available for generation.`
          : 'Balance is 0. Credit packs arrive with the billing phase; nothing can charge you before then.',
    },
  ];
  const checklistDone = checklist.filter((item) => item.done).length;

  const nav: NavGroup[] = [
    {
      items: [
        { label: 'Home', icon: 'grid', href: '/dashboard', active: true },
        { label: 'Campaigns', icon: 'layers', href: '#' },
        { label: 'Create', icon: 'sparkles', href: '#', tag: 'AI' },
        { label: 'Content', icon: 'image', href: '#' },
        { label: 'Calendar', icon: 'calendar', href: '#' },
        { label: 'Prospects', icon: 'users', href: '#' },
        { label: 'Analytics', icon: 'chart', href: '#' },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { label: 'Brand', icon: 'wand', href: '#' },
        { label: 'Connections', icon: 'plug', href: '#' },
        { label: 'Credits', icon: 'credit', href: '#' },
        { label: 'Settings', icon: 'settings', href: '#' },
        ...(isSuperAdmin ? [{ label: 'Admin', icon: 'shield' as const, href: '/admin' }] : []),
      ],
    },
  ];

  return (
    <AppShell
      groups={nav}
      crumbs={['Workspace', 'Home']}
      user={{ name, email, role: isSuperAdmin ? 'Super Admin' : 'Ambassador' }}
      credits={creditTotal > 0 ? { used: creditUsed, total: creditTotal } : undefined}
      action={
        <a className="btn btn-primary" href="#">
          <Icon name="sparkles" />
          Create with AI
        </a>
      }
    >
      <div className="page-head">
        <div>
          <h1>Good to see you, {name.split(/[ .]/)[0]}.</h1>
          <p>
            {campaigns.length
              ? `You have ${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}, ${assets.length} assets and ${funnelVisits} tracked funnel visits in ${org?.name ?? 'your workspace'}.`
              : 'Your workspace is set up. Everything below is your real data — as campaigns are generated, this fills in.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {destinationHost ? (
            <span className="pill pill-live">
              <span className="dot" /> CTA → {destinationHost}
            </span>
          ) : (
            <span className="pill">No destination set</span>
          )}
          <span className="pill">{creditBalance} credits</span>
          {prospectsCount > 0 && <span className="pill">{prospectsCount} prospects</span>}
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
              <h2>Next best action</h2>
              <p>Based on your actual workspace, not a template.</p>
            </div>
            <span className="pill pill-accent">Recommended</span>
          </div>
          <div className="panel-body">
            {!destination ? (
              <>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', marginTop: 0 }}>
                  <b style={{ color: 'var(--text-1)' }}>Set your Mission 1000 destination.</b> Until it&apos;s set,
                  HubElites has nowhere to send the traffic your campaigns create. It takes ten seconds — the form is
                  in the destination panel below.
                </p>
                <a className="btn btn-primary" href="#destination">
                  <Icon name="link" />
                  Add my destination
                </a>
              </>
            ) : draftCampaign ? (
              <>
                <div className="onb-review" style={{ marginTop: 0 }}>
                  <div>
                    <span>Campaign</span>
                    <b>{draftCampaign.title}</b>
                  </div>
                  <div>
                    <span>Audience</span>
                    <b>
                      {draftCampaign.audience_id
                        ? audienceNameById.get(draftCampaign.audience_id as string) ?? '—'
                        : draftBrief.audiences?.join(', ') || '—'}
                    </b>
                  </div>
                  <div>
                    <span>Channels</span>
                    <b>{draftBrief.channels?.join(', ') || '—'}</b>
                  </div>
                  <div>
                    <span>Voice</span>
                    <b>{draftBrief.tone ?? (brand?.voice_style as string | undefined) ?? '—'}</b>
                  </div>
                  <div>
                    <span>Status</span>
                    <b>Draft — saved and ready</b>
                  </div>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)' }}>
                  This draft was created from your setup answers. Campaign generation — angle, calendar, posts,
                  emails and scripts — is the next build phase, and it starts from exactly this brief.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', marginTop: 0 }}>
                Your workspace and destination are set. Your first campaign draft will be created from your setup
                answers — if you&apos;re seeing this, finish setup and it appears here.
              </p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Setup checklist</h2>
              <p>
                {checklistDone} of {checklist.length} complete — this is your real workspace state.
              </p>
            </div>
          </div>
          <div className="rows">
            {checklist.map((item) => (
              <div className="row-item" key={item.title}>
                <span className={`ichip ichip-sm ${item.done ? 'ichip-emerald' : 'ichip-amber'}`}>
                  <Icon name={item.done ? 'check' : 'bolt'} />
                </span>
                <div>
                  <b>{item.title}</b>
                  <small>{item.detail}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel" id="destination">
        <div className="panel-head">
          <div>
            <h2>Your destination</h2>
            <p>The funnel every HubElites call to action points to. It stays yours — registration, checkout and attribution happen there.</p>
          </div>
          {destinationHost && <span className="pill pill-live"><span className="dot" /> Active</span>}
        </div>
        <div className="panel-body">
          <DestinationForm initialUrl={(destination?.destination_url as string | undefined) ?? ''} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Campaign pipeline</h2>
            <p>Your real assets, grouped by where they are in the workflow.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="board">
            {boardColumns.map((column) => (
              <div className="board-col" key={column.title}>
                <header>
                  {column.title}
                  <span>{column.rows.length}</span>
                </header>
                {column.rows.length === 0 ? (
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-3)', margin: '4px 2px' }}>{column.empty}</p>
                ) : (
                  column.rows.slice(0, 6).map((asset) => (
                    <article className="board-card" key={asset.id}>
                      <b>{asset.title ?? typeLabels[asset.type] ?? asset.type}</b>
                      <div className="meta">
                        <span>
                          {typeLabels[asset.type] ?? asset.type}
                          {asset.channel ? ` · ${asset.channel}` : ''}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>This week&apos;s calendar</h2>
            <p>Filled from assets that actually have a scheduled date.</p>
          </div>
          <span className="pill">
            {scheduledAssets.length} scheduled
          </span>
        </div>
        <div className="panel-body">
          <div className="week">
            {weekDays.map((day) => (
              <div className="week-day" key={day.day}>
                <span>{day.day}</span>
                {day.chips.map((chip, index) => (
                  <span className={`week-chip ${chip.tone}`} key={`${chip.label}-${index}`}>
                    {chip.label}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {scheduledAssets.length === 0 && (
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 14 }}>
              Nothing scheduled yet. When campaign assets are approved and dated, they appear here day by day.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
