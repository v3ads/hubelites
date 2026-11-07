// Distribution sync (Phase 5 Slice 3, 2026-11-07) — pushes queued
// publications to HubRipple and pulls statuses back, on page view (the
// same sync-on-view pattern Media Studio uses; no cron exists in this
// app). All writes go through the service role; callers pass the org.
//
// Push rules:
// - Only when a live HubRipple connection (with a saved key) exists.
// - A scheduled publication pushes when its time has arrived; pushing
//   early would hand HubRipple a 'schedule' post — which is fine too,
//   but V1 keeps HubElites the source of truth for timing, so we wait.
// - Pushes are idempotent end to end: HubRipple dedupes on
//   external_ref = the publication id.
// Status mapping (HubRipple → HubElites): published → published,
// partial → partial, failed → failed, anything in-flight → sent.

import { createAdminClient } from '@/lib/supabase-admin';
import { createHubRipplePost, getHubRippleConnection, getHubRipplePost, type HubRipplePost } from '@/lib/hubripple';

type PublicationRow = {
  id: string;
  organization_id: string;
  asset_id: string | null;
  platforms: string[];
  caption: string;
  scheduled_at: string | null;
  status: string;
  external_post_id: string | null;
};

const MAX_PER_SYNC = 4;

function mapRemoteStatus(post: HubRipplePost): { status: string; publishedUrls: Record<string, string>; error: string | null } {
  const publishedUrls: Record<string, string> = {};
  for (const target of post.targets) {
    if (target.post_url) publishedUrls[target.platform] = target.post_url;
  }
  const firstError = post.targets.find((t) => t.error)?.error ?? null;
  if (post.status === 'published') return { status: 'published', publishedUrls, error: null };
  if (post.status === 'partial') return { status: 'partial', publishedUrls, error: firstError };
  if (post.status === 'failed') return { status: 'failed', publishedUrls, error: firstError ?? 'Publishing failed in HubRipple.' };
  return { status: 'sent', publishedUrls, error: null };
}

export async function pushPublication(
  admin: ReturnType<typeof createAdminClient>,
  connection: { connectionId: string; apiKey: string },
  publication: PublicationRow,
  forceNow: boolean,
): Promise<void> {
  let mediaUrl: string | null = null;
  if (publication.asset_id) {
    const { data: asset } = await admin
      .from('campaign_assets')
      .select('media_url')
      .eq('id', publication.asset_id)
      .maybeSingle();
    mediaUrl = (asset?.media_url as string | null) ?? null;
  }
  const post = await createHubRipplePost(connection.apiKey, {
    caption: publication.caption,
    platforms: publication.platforms,
    mediaUrl,
    scheduledAt: forceNow ? null : publication.scheduled_at,
    externalRef: publication.id,
  });
  const mapped = mapRemoteStatus(post);
  await admin
    .from('publications')
    .update({
      status: mapped.status,
      connection_id: connection.connectionId,
      external_post_id: post.id,
      published_urls: mapped.publishedUrls,
      error: mapped.error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', publication.id);
}

export async function syncPublications(organizationId: string, campaignId?: string): Promise<void> {
  const connection = await getHubRippleConnection(organizationId);
  if (!connection) return;
  const admin = createAdminClient();

  let query = admin
    .from('publications')
    .select('id, organization_id, asset_id, platforms, caption, scheduled_at, status, external_post_id')
    .eq('organization_id', organizationId)
    .in('status', ['queued', 'sent'])
    .order('created_at', { ascending: true })
    .limit(MAX_PER_SYNC);
  if (campaignId) query = query.eq('campaign_id', campaignId);
  const { data: rows } = await query;
  const publications = (rows ?? []) as PublicationRow[];

  for (const publication of publications) {
    try {
      if (publication.status === 'queued') {
        const due = !publication.scheduled_at || new Date(publication.scheduled_at).getTime() <= Date.now();
        if (!due) continue;
        await pushPublication(admin, connection, publication, false);
      } else if (publication.status === 'sent' && publication.external_post_id) {
        const post = await getHubRipplePost(connection.apiKey, publication.external_post_id);
        const mapped = mapRemoteStatus(post);
        if (mapped.status !== 'sent') {
          await admin
            .from('publications')
            .update({
              status: mapped.status,
              published_urls: mapped.publishedUrls,
              error: mapped.error,
              updated_at: new Date().toISOString(),
            })
            .eq('id', publication.id);
        }
      }
    } catch (error) {
      // A failed push stays queued (the error is surfaced on the row);
      // a failed status read simply retries on the next view.
      if (publication.status === 'queued') {
        await admin
          .from('publications')
          .update({ error: error instanceof Error ? error.message : 'Push to HubRipple failed.', updated_at: new Date().toISOString() })
          .eq('id', publication.id);
      }
      console.error('distribution sync failed for publication', publication.id, error);
    }
  }
}
