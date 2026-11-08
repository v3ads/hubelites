// Click analytics aggregation (Phase 6, Slice A) — pure functions over
// already-fetched rows, so they unit-test without a database.
//
// The unit of truth is the tracked-link click: a person (or a crawler)
// arriving at the ambassador's Mission 1000 destination. Publications
// carry the campaign and asset; campaigns carry the audience. Native
// platform stats (views/likes) are account-level only — see Slice B —
// and never enter these per-publication numbers.
import { countClicks, type ClickCounts } from './click-filter.ts';

export type ClickRow = { publication_id: string; user_agent: string | null; clicked_at: string };
export type PublicationRow = {
  id: string;
  campaign_id: string;
  asset_id: string | null;
  status: string;
  created_at: string;
};
export type CampaignRow = { id: string; title: string; audience_id: string | null };
export type AudienceRow = { id: string; name: string };
export type AssetRow = { id: string; type: string; title: string | null };

export type PublicationStat = { publicationId: string } & ClickCounts;
export type GroupStat = { key: string; label: string; publications: number } & ClickCounts;

function inWindow(clickedAt: string, since: Date | null): boolean {
  if (!since) return true;
  return new Date(clickedAt).getTime() >= since.getTime();
}

export function windowStart(window: '7d' | '30d' | 'all', now = new Date()): Date | null {
  if (window === 'all') return null;
  const days = window === '7d' ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function summarizeAnalytics(input: {
  clicks: ClickRow[];
  publications: PublicationRow[];
  campaigns: CampaignRow[];
  audiences: AudienceRow[];
  assets: AssetRow[];
  window: '7d' | '30d' | 'all';
  now?: Date;
}): {
  totals: ClickCounts & { publications: number; livePublications: number };
  perPublication: Map<string, ClickCounts>;
  perCampaign: GroupStat[];
  perAudience: GroupStat[];
  perAssetType: GroupStat[];
  bestPublication: { publicationId: string; assetTitle: string | null; campaignTitle: string | null } & ClickCounts | null;
} {
  const since = windowStart(input.window, input.now);
  const clicksByPublication = new Map<string, Array<string | null>>();
  for (const click of input.clicks) {
    if (!inWindow(click.clicked_at, since)) continue;
    const list = clicksByPublication.get(click.publication_id) ?? [];
    list.push(click.user_agent);
    clicksByPublication.set(click.publication_id, list);
  }

  const perPublication = new Map<string, ClickCounts>();
  for (const publication of input.publications) {
    perPublication.set(publication.id, countClicks(clicksByPublication.get(publication.id) ?? []));
  }

  const campaignById = new Map(input.campaigns.map((c) => [c.id, c]));
  const audienceById = new Map(input.audiences.map((a) => [a.id, a]));
  const assetById = new Map(input.assets.map((a) => [a.id, a]));

  const group = (
    keyOf: (publication: PublicationRow) => { key: string; label: string } | null,
  ): GroupStat[] => {
    const groups = new Map<string, GroupStat & { uas: Array<string | null> }>();
    for (const publication of input.publications) {
      const groupKey = keyOf(publication);
      if (!groupKey) continue;
      const entry = groups.get(groupKey.key) ?? {
        key: groupKey.key,
        label: groupKey.label,
        publications: 0,
        human: 0,
        crawler: 0,
        total: 0,
        uas: [],
      };
      entry.publications += 1;
      entry.uas.push(...(clicksByPublication.get(publication.id) ?? []));
      groups.set(groupKey.key, entry);
    }
    return [...groups.values()]
      .map(({ uas, ...rest }) => ({ ...rest, ...countClicks(uas) }))
      .sort((a, b) => b.human - a.human || b.total - a.total);
  };

  const perCampaign = group((p) => {
    const campaign = campaignById.get(p.campaign_id);
    return campaign ? { key: campaign.id, label: campaign.title } : null;
  });
  const perAudience = group((p) => {
    const campaign = campaignById.get(p.campaign_id);
    const audience = campaign?.audience_id ? audienceById.get(campaign.audience_id) : undefined;
    return audience ? { key: audience.id, label: audience.name } : null;
  });
  const perAssetType = group((p) => {
    const asset = p.asset_id ? assetById.get(p.asset_id) : undefined;
    return asset ? { key: asset.type, label: asset.type } : null;
  });

  const totalsCounts = countClicks(input.clicks.filter((c) => inWindow(c.clicked_at, since)).map((c) => c.user_agent));
  const totals = {
    ...totalsCounts,
    publications: input.publications.length,
    livePublications: input.publications.filter((p) => p.status === 'published' || p.status === 'partial').length,
  };

  let bestPublication: (typeof input.publications)[number] | null = null;
  let bestCounts: ClickCounts = { human: 0, crawler: 0, total: 0 };
  for (const publication of input.publications) {
    const counts = perPublication.get(publication.id) ?? { human: 0, crawler: 0, total: 0 };
    if (counts.human > bestCounts.human) {
      bestPublication = publication;
      bestCounts = counts;
    }
  }

  return {
    totals,
    perPublication,
    perCampaign,
    perAudience,
    perAssetType,
    bestPublication:
      bestPublication && bestCounts.human > 0
        ? {
            publicationId: bestPublication.id,
            assetTitle: bestPublication.asset_id ? (assetById.get(bestPublication.asset_id)?.title ?? null) : null,
            campaignTitle: campaignById.get(bestPublication.campaign_id)?.title ?? null,
            ...bestCounts,
          }
        : null,
  };
}
