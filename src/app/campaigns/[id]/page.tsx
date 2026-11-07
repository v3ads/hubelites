import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { AppShell } from '@/components/app/app-shell';
import { memberNav } from '@/components/app/member-nav';
import { AssetCard, GeneratePanel, type AssetView, type MediaOptions } from '@/components/app/campaign-studio';
import { DistributionPanel, type PublicationView } from '@/components/app/distribute-panel';
import { syncPublications } from '@/lib/distribution-sync';
import { Icon } from '@/components/icon';
import { estimateGenerationCredits } from '@/lib/credits';
import { heygenConfigured } from '@/lib/heygen';
import { higgsfieldConfigured } from '@/lib/higgsfield';
import { syncMediaAsset, type MediaState } from '@/lib/media-jobs';
import { toSpokenScript } from '@/lib/spoken-script';

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

  const assetSelect = 'id,type,title,body,channel,status,created_at,media_url,thumbnail_url,metadata';
  const [{ data: assetsInitial }, { data: audience }, { data: destination }, { data: wallet }] = await Promise.all([
    supabase.from('campaign_assets').select(assetSelect).eq('campaign_id', id).order('created_at', { ascending: true }),
    campaign.audience_id
      ? supabase.from('audiences').select('name').eq('id', campaign.audience_id).maybeSingle()
      : Promise.resolve({ data: null }),
    campaign.destination_id
      ? supabase.from('ambassador_destinations').select('destination_url').eq('id', campaign.destination_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('credit_wallets').select('balance,lifetime_used').eq('organization_id', orgId).maybeSingle(),
  ]);

  // Media sync on view: poll providers for any asset still processing and
  // finalize (charge + preview) whatever has finished. Best-effort — a
  // provider hiccup never breaks the page.
  let assets = assetsInitial;
  const processing = (assetsInitial ?? []).filter(
    (asset) => (asset.metadata as { media?: MediaState })?.media?.state === 'processing',
  );
  if (processing.length) {
    try {
      const admin = createAdminClient();
      for (const asset of processing.slice(0, 4)) {
        await syncMediaAsset(admin, {
          id: asset.id as string,
          organization_id: orgId,
          campaign_id: id,
          type: asset.type as string,
          title: asset.title as string | null,
          media_url: asset.media_url as string | null,
          thumbnail_url: asset.thumbnail_url as string | null,
          metadata: (asset.metadata ?? {}) as Record<string, unknown>,
        });
      }
      const { data: refreshed } = await supabase
        .from('campaign_assets')
        .select(assetSelect)
        .eq('campaign_id', id)
        .order('created_at', { ascending: true });
      if (refreshed) assets = refreshed;
    } catch (error) {
      console.error('campaign media sync failed:', error);
    }
  }

  const brief = (campaign.brief ?? {}) as Brief;
  const mediaOptions: MediaOptions = {
    imageCost: estimateGenerationCredits('media_image'),
    videoCost: estimateGenerationCredits('media_video'),
    imageConfigured: higgsfieldConfigured(),
    videoConfigured: heygenConfigured(),
    balance: (wallet?.balance as number | undefined) ?? 0,
    unlimited: Boolean(profile?.is_super_admin),
  };
  const assetViews: AssetView[] = (assets ?? []).map((asset) => {
    const media = (asset.metadata as { media?: MediaState })?.media;
    return {
      id: asset.id as string,
      type: asset.type as string,
      title: asset.title as string | null,
      body: asset.body as string | null,
      channel: asset.channel as string | null,
      status: asset.status as string,
      mediaUrl: asset.media_url as string | null,
      thumbnailUrl: asset.thumbnail_url as string | null,
      mediaState: media?.state,
      mediaError: media?.error,
      mediaCost: media?.cost,
      // The exact words the avatar will say (labels/directions stripped)
      // — computed with the same sanitizer the generate action uses.
      spokenPreview: asset.type === 'script' ? toSpokenScript((asset.body as string | null) ?? '') : undefined,
    };
  });
  const needsReview = assetViews.filter((asset) => asset.status === 'ready');
  const approved = assetViews.filter((asset) => asset.status === 'approved');
  const otherAssets = assetViews.filter((asset) => !['ready', 'approved'].includes(asset.status));

  // Distribution (Phase 5): sync with HubRipple first (push due
  // publications, pull statuses — best-effort, never breaks the page),
  // then read this campaign's publications + click counts.
  try {
    await syncPublications(orgId, id);
  } catch (error) {
    console.error('distribution sync failed:', error);
  }
  const [{ data: publicationRows }, { data: distributionConnection }] = await Promise.all([
    supabase
      .from('publications')
      .select('id, asset_id, platforms, link_slug, status, scheduled_at, created_at, error, published_urls')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('distribution_connections')
      .select('status')
      .eq('organization_id', orgId)
      .eq('provider', 'hubripple')
      .maybeSingle(),
  ]);
  const publicationViews: PublicationView[] = [];
  for (const row of publicationRows ?? []) {
    const { count } = await supabase
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .eq('publication_id', row.id as string);
    const asset = assetViews.find((view) => view.id === (row.asset_id as string | null));
    publicationViews.push({
      id: row.id as string,
      assetTitle: asset?.title ?? null,
      platforms: (row.platforms as string[] | null) ?? [],
      linkSlug: row.link_slug as string,
      status: row.status as string,
      scheduledAt: (row.scheduled_at as string | null) ?? null,
      clicks: count ?? 0,
      error: (row.error as string | null) ?? null,
      publishedUrls: (row.published_urls as Record<string, string> | null) ?? {},
    });
  }
  const hubRippleConnected = distributionConnection?.status === 'connected';

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
                <AssetCard key={asset.id} asset={asset} mediaOptions={mediaOptions} />
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
              <p>Locked in. Distribute them below — every post carries your tracked Mission 1000 link.</p>
            </div>
            <span className="pill pill-live">
              <span className="dot" /> {approved.length} approved
            </span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gap: 14 }}>
              {approved.map((asset) => (
                <AssetCard key={asset.id} asset={asset} mediaOptions={mediaOptions} />
              ))}
            </div>
          </div>
        </section>
      )}

      {approved.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Distribute</h2>
              <p>
                Queue approved assets for publishing through HubRipple. The tracked link is live the moment you
                queue — clicks are counted whether the post has sent or not.
              </p>
            </div>
            <span className={`pill ${hubRippleConnected ? 'pill-live' : ''}`}>
              {hubRippleConnected ? 'HubRipple connected' : 'HubRipple not connected'}
            </span>
          </div>
          <div className="panel-body">
            <DistributionPanel
              campaignId={id}
              assets={approved.map((asset) => ({
                id: asset.id,
                title: asset.title,
                type: asset.type,
                body: asset.body,
                hasMedia: Boolean(asset.mediaUrl),
              }))}
              publications={publicationViews}
              connected={hubRippleConnected}
              hasDestination={Boolean(destination?.destination_url)}
            />
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
                <AssetCard key={asset.id} asset={asset} mediaOptions={mediaOptions} />
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
