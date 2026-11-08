import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/app/app-shell';
import { memberNav } from '@/components/app/member-nav';
import { summarizeAnalytics, type GroupStat } from '@/lib/analytics';

export const metadata = { title: 'Analytics' };

type Props = { searchParams: Promise<{ window?: string }> };

const typeLabels: Record<string, string> = {
  social_post: 'Social post',
  email: 'Email',
  image: 'Graphic',
  video: 'Video',
  carousel: 'Carousel',
  script: 'Avatar video (script)',
  landing_copy: 'Landing copy',
};

function GroupTable({ title, groups, emptyText }: { title: string; groups: GroupStat[]; emptyText: string }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="panel-body">
        {groups.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>{emptyText}</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {groups.map((group) => (
              <div
                key={group.key}
                style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--line)', paddingBottom: 8 }}
              >
                <b style={{ fontSize: 14.5 }}>{group.label}</b>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {group.publications} publication{group.publications === 1 ? '' : 's'}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="pill">{group.human} clicks</span>
                  {group.crawler > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-4)' }}>+{group.crawler} previews &amp; bots</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const { window: windowParam } = await searchParams;
  const window = windowParam === '7d' || windowParam === 'all' ? windowParam : '30d';

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

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect('/onboarding');
  const orgId = membership.organization_id as string;

  const [{ data: publications }, { data: campaigns }, { data: audiences }] = await Promise.all([
    supabase
      .from('publications')
      .select('id, campaign_id, asset_id, status, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase.from('campaigns').select('id, title, audience_id').eq('organization_id', orgId),
    supabase.from('audiences').select('id, name').eq('organization_id', orgId),
  ]);

  const publicationRows = publications ?? [];
  const assetIds = [...new Set(publicationRows.map((p) => p.asset_id as string | null).filter(Boolean))] as string[];
  const [{ data: assets }, { data: clicks }] = await Promise.all([
    assetIds.length
      ? supabase.from('campaign_assets').select('id, type, title').in('id', assetIds)
      : Promise.resolve({ data: [] as Array<{ id: string; type: string; title: string | null }> }),
    publicationRows.length
      ? supabase
          .from('link_clicks')
          .select('publication_id, user_agent, clicked_at')
          .in(
            'publication_id',
            publicationRows.map((p) => p.id as string),
          )
      : Promise.resolve({ data: [] as Array<{ publication_id: string; user_agent: string | null; clicked_at: string }> }),
  ]);

  const summary = summarizeAnalytics({
    clicks: (clicks ?? []) as Array<{ publication_id: string; user_agent: string | null; clicked_at: string }>,
    publications: publicationRows as Array<{ id: string; campaign_id: string; asset_id: string | null; status: string; created_at: string }>,
    campaigns: (campaigns ?? []) as Array<{ id: string; title: string; audience_id: string | null }>,
    audiences: (audiences ?? []) as Array<{ id: string; name: string }>,
    assets: (assets ?? []) as Array<{ id: string; type: string; title: string | null }>,
    window,
  });

  const perAssetType = summary.perAssetType.map((group) => ({
    ...group,
    label: typeLabels[group.key] ?? group.key,
  }));

  const windows = [
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: 'all', label: 'All time' },
  ] as const;

  const email = user.email ?? '';
  const name = (profile?.display_name as string | undefined) ?? email.split('@')[0] ?? 'Ambassador';
  const isSuperAdmin = profile?.is_super_admin === true;

  return (
    <AppShell
      groups={memberNav('Analytics', isSuperAdmin)}
      crumbs={['Workspace', 'Analytics']}
      user={{ name, email, role: isSuperAdmin ? 'Super Admin' : 'Ambassador' }}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {windows.map((item) => (
            <Link
              key={item.key}
              href={`/analytics?window=${item.key}`}
              className={`pill ${window === item.key ? 'pill-live' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              {item.label}
            </Link>
          ))}
          <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>
            A click is a person arriving at your Mission 1000 page through a tracked link. The platforms fetch
            every link themselves to build preview cards — those fetches are counted separately, never as people.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <section className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Human clicks
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>{summary.totals.human}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              +{summary.totals.crawler} previews &amp; bots filtered out
            </div>
          </section>
          <section className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Publications live
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>{summary.totals.livePublications}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{summary.totals.publications} total publications</div>
          </section>
          <section className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Best performer
            </div>
            {summary.bestPublication ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 8, lineHeight: 1.35 }}>
                  {summary.bestPublication.assetTitle ?? 'Untitled asset'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {summary.bestPublication.campaignTitle} · {summary.bestPublication.human} human clicks
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>
                No human clicks yet in this window. When a post starts pulling people in, it will show up here.
              </div>
            )}
          </section>
        </div>

        {summary.totals.publications === 0 ? (
          <section className="panel">
            <div className="panel-body">
              <p style={{ color: 'var(--text-3)', fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
                Nothing published yet. Approve a campaign asset and share it through HubRipple — every post carries
                your tracked link, and the clicks it earns land here, split into people and platform previews.
              </p>
            </div>
          </section>
        ) : (
          <>
            <GroupTable title="By campaign" groups={summary.perCampaign} emptyText="No campaigns with publications yet." />
            <GroupTable title="By audience" groups={summary.perAudience} emptyText="No audience data yet." />
            <GroupTable title="By content type" groups={perAssetType} emptyText="No content data yet." />
          </>
        )}

        <p style={{ fontSize: 12.5, color: 'var(--text-4)', margin: 0 }}>
          Views, likes and comments live on the platforms themselves; HubElites tracks the step that matters —
          people clicking through to your hub.
        </p>
      </div>
    </AppShell>
  );
}
