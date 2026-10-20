import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/app/app-shell';
import { memberNav } from '@/components/app/member-nav';
import { AssetCard, GeneratePanel, type AssetView } from '@/components/app/campaign-studio';
import { Icon } from '@/components/icon';

export const metadata = { title: 'Campaign' };
// Campaign generation calls an AI model and can take up to ~a minute.
export const maxDuration = 120;

type Props = { params: Promise<{ id: string }> };

type Brief = {
  angle?: string;
  core_message?: string;
  hooks?: string[];
  objections?: { objection: string; response: string }[];
  calendar?: { day: string; items: string[] }[];
  channels?: string[];
  tone?: string;
  generated_at?: string;
  model?: string;
  source?: string;
};

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
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

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id,organization_id,title,status,brief,budget_mode,audience_id,destination_id,created_at')
    .eq('id', id)
    .maybeSingle();
  if (!campaign) notFound();
  const orgId = campaign.organization_id as string;

  const [{ data: assets }, { data: audience }, { data: destination }, { data: wallet }] = await Promise.all([
    supabase
      .from('campaign_assets')
      .select('id,type,title,body,channel,status,created_at')
      .eq('campaign_id', id)
      .order('created_at', { ascending: true }),
    campaign.audience_id
      ? supabase.from('audiences').select('name').eq('id', campaign.audience_id).maybeSingle()
      : Promise.resolve({ data: null }),
    campaign.destination_id
      ? supabase.from('ambassador_destinations').select('destination_url').eq('id', campaign.destination_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('credit_wallets').select('balance,lifetime_used').eq('organization_id', orgId).maybeSingle(),
  ]);

  const brief = (campaign.brief ?? {}) as Brief;
  const assetViews: AssetView[] = (assets ?? []).map((asset) => ({
    id: asset.id as string,
    type: asset.type as string,
    title: asset.title as string | null,
    body: asset.body as string | null,
    channel: asset.channel as string | null,
    status: asset.status as string,
  }));
  const needsReview = assetViews.filter((asset) => asset.status === 'ready');
  const approved = assetViews.filter((asset) => asset.status === 'approved');
  const otherAssets = assetViews.filter((asset) => !['ready', 'approved'].includes(asset.status));

  const email = user.email ?? '';
  const name = (profile?.display_name as string | undefined) ?? email.split('@')[0] ?? 'Ambassador';
  const creditTotal = ((wallet?.balance as number | undefined) ?? 0) + ((wallet?.lifetime_used as number | undefined) ?? 0);
  const calendarDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
    const entry = (brief.calendar ?? []).find((item) => item.day?.slice(0, 3).toLowerCase() === day.toLowerCase());
    return { day, items: entry?.items ?? [] };
  });
  const hasStrategy = Boolean(brief.angle);

  return (
    <AppShell
      groups={memberNav('Campaigns', Boolean(profile?.is_super_admin))}
      crumbs={['Workspace', 'Campaigns', campaign.title as string]}
      user={{ name, email, role: profile?.is_super_admin ? 'Super Admin' : 'Ambassador' }}
      credits={creditTotal > 0 ? { used: (wallet?.lifetime_used as number) ?? 0, total: creditTotal } : undefined}
      action={
        <a className="btn" href="/campaigns">
          <Icon name="layers" />
          All campaigns
        </a>
      }
    >
      <div className="page-head">
        <div>
          <h1>{campaign.title as string}</h1>
          <p>
            Audience: <b style={{ color: 'var(--text-1)' }}>{(audience?.name as string | undefined) ?? '—'}</b>
            {' · '}Mode: {(campaign.budget_mode as string).replace('_', ' ')}
            {destination?.destination_url && (
              <>
                {' · '}CTA → {(destination.destination_url as string).replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`pill ${campaign.status === 'ready' ? 'pill-live' : ''}`}>{campaign.status as string}</span>
          <span className="pill">
            {assetViews.length} assets · {approved.length} approved
          </span>
        </div>
      </div>

      <div className="cols">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Campaign Brain</h2>
              <p>The strategy this week is built from.</p>
            </div>
            <span className="pill pill-accent">
              <Icon name="brain" />
              Mission Brain powered
            </span>
          </div>
          <div className="panel-body">
            {hasStrategy ? (
              <>
                <div className="onb-review" style={{ marginTop: 0 }}>
                  <div>
                    <span>Angle</span>
                    <b>{brief.angle}</b>
                  </div>
                  <div>
                    <span>Core message</span>
                    <b>{brief.core_message}</b>
                  </div>
                </div>
                {brief.hooks && brief.hooks.length > 0 && (
                  <>
                    <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Hooks</h3>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)' }}>
                      {brief.hooks.map((hook, index) => (
                        <li key={index}>{hook}</li>
                      ))}
                    </ul>
                  </>
                )}
                {brief.objections && brief.objections.length > 0 && (
                  <>
                    <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Objections it answers</h3>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {brief.objections.map((item, index) => (
                        <div key={index} style={{ fontSize: 14, lineHeight: 1.6 }}>
                          <b style={{ color: 'var(--text-1)' }}>“{item.objection}”</b>
                          <div style={{ color: 'var(--text-2)' }}>{item.response}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {brief.generated_at && (
                  <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 16 }}>
                    Generated {new Date(brief.generated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {brief.model ? ` · ${brief.model}` : ''}
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)', margin: 0 }}>
                Not generated yet. This campaign is a brief waiting for its week: an angle, hooks, the objections to
                answer, a calendar, and the assets themselves — all written from the approved Mission Brain in your
                brand voice, pointing at your destination.
              </p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{assetViews.length ? 'Regenerate' : 'Generate'}</h2>
              <p>{assetViews.length ? 'Fresh week, same brief.' : 'Turn this brief into a full week.'}</p>
            </div>
          </div>
          <div className="panel-body">
            <GeneratePanel campaignId={id} hasAssets={assetViews.length > 0} />
          </div>
        </section>
      </div>

      {hasStrategy && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>This week&apos;s calendar</h2>
              <p>Planned by the Campaign Brain from the same brief — the assets below fill these slots.</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="week">
              {calendarDays.map((day) => (
                <div className="week-day" key={day.day}>
                  <span>{day.day}</span>
                  {day.items.map((item, index) => (
                    <span className="week-chip blue" key={`${item}-${index}`} style={{ whiteSpace: 'normal', textAlign: 'left' }}>
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {needsReview.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Needs your approval</h2>
              <p>{needsReview.length} assets waiting. Nothing publishes from HubElites without your approval.</p>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gap: 14 }}>
              {needsReview.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          </div>
        </section>
      )}

      {approved.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Approved</h2>
              <p>Locked in. Scheduling and publishing arrive with the Distribution phase.</p>
            </div>
            <span className="pill pill-live">
              <span className="dot" /> {approved.length} approved
            </span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gap: 14 }}>
              {approved.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          </div>
        </section>
      )}

      {otherAssets.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Other assets</h2>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gap: 14 }}>
              {otherAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          </div>
        </section>
      )}

      {assetViews.length === 0 && (
        <section className="panel">
          <div className="panel-body">
            <p style={{ fontSize: 14.5, color: 'var(--text-3)', margin: 0 }}>
              No assets yet — generate the campaign above and the full week appears here for your review.
            </p>
          </div>
        </section>
      )}
    </AppShell>
  );
}
