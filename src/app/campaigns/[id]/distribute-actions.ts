'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { composeCaption, isPlatformId } from '@/lib/distribution';
import { newLinkSlug } from '@/lib/tracked-links';
import { getHubRippleConnection } from '@/lib/hubripple';
import { pushPublication } from '@/lib/distribution-sync';
import { toSpokenScript } from '@/lib/spoken-script';

export type PublicationResult = { ok: true; slug?: string } | { ok: false; error: string };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hubelites.com';

export async function createPublication(input: {
  campaignId: string;
  assetId: string;
  platforms: string[];
  caption: string;
  scheduledAt: string | null;
}): Promise<PublicationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session expired. Sign in again.' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  const organizationId = membership?.organization_id as string | undefined;
  if (!organizationId) return { ok: false, error: 'No workspace found for your account yet.' };

  const platforms = [...new Set(input.platforms.filter(isPlatformId))];
  if (platforms.length === 0) return { ok: false, error: 'Choose at least one platform.' };

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', input.campaignId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: 'Campaign not found in your workspace.' };

  const { data: asset } = await supabase
    .from('campaign_assets')
    .select('id, status, type')
    .eq('id', input.assetId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!asset) return { ok: false, error: 'Asset not found in your workspace.' };
  if (asset.status !== 'approved') return { ok: false, error: 'Only approved assets can be queued for publishing.' };

  const { data: destination } = await supabase
    .from('ambassador_destinations')
    .select('destination_url')
    .eq('organization_id', organizationId)
    .eq('campaign_key', 'mission-1000')
    .eq('is_active', true)
    .maybeSingle();
  const destinationUrl = destination?.destination_url as string | undefined;
  if (!destinationUrl) {
    return { ok: false, error: 'Set your Mission 1000 destination on the dashboard first — every post points there.' };
  }

  const { data: connection } = await supabase
    .from('distribution_connections')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('provider', 'hubripple')
    .maybeSingle();

  const slug = newLinkSlug();
  const trackedUrl = `${APP_URL.replace(/\/$/, '')}/r/${slug}`;
  // Script assets store a labeled production document ([HOOK, on camera],
  // [Beat 1], [CTA]…) — those labels must never reach a public caption
  // (the first E2E publish carried them onto YouTube/TikTok/Instagram).
  // The spoken-script cleaner produces exactly the public text.
  const captionSource = asset.type === 'script' ? toSpokenScript(input.caption, 2000) : input.caption;
  const caption = composeCaption(captionSource, trackedUrl);

  let scheduledAt: string | null = null;
  if (input.scheduledAt) {
    const parsed = new Date(input.scheduledAt);
    if (!Number.isNaN(parsed.getTime())) scheduledAt = parsed.toISOString();
  }

  const { error } = await supabase.from('publications').insert({
    organization_id: organizationId,
    campaign_id: input.campaignId,
    asset_id: input.assetId,
    connection_id: connection?.status === 'connected' ? connection.id : null,
    platforms,
    caption,
    link_slug: slug,
    destination_url: destinationUrl,
    scheduled_at: scheduledAt,
    status: 'queued',
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/campaigns/${input.campaignId}`);
  return { ok: true, slug };
}

/**
 * Send a queued publication to HubRipple right now, ignoring its
 * schedule. Used by the "Send now" button; the scheduled sync remains
 * the default path.
 */
export async function sendPublicationNow(campaignId: string, publicationId: string): Promise<PublicationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session expired. Sign in again.' };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  const organizationId = membership?.organization_id as string | undefined;
  if (!organizationId) return { ok: false, error: 'No workspace found for your account yet.' };

  const connection = await getHubRippleConnection(organizationId);
  if (!connection) return { ok: false, error: 'Connect HubRipple on the dashboard first — there is no saved workspace key yet.' };

  const admin = createAdminClient();
  const { data: publication } = await admin
    .from('publications')
    .select('id, organization_id, asset_id, platforms, caption, scheduled_at, status, external_post_id')
    .eq('id', publicationId)
    .eq('organization_id', organizationId)
    .eq('status', 'queued')
    .maybeSingle();
  if (!publication) return { ok: false, error: 'That publication is no longer queued.' };

  try {
    await pushPublication(admin, connection, publication, true);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Push to HubRipple failed.' };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

export async function cancelPublication(campaignId: string, publicationId: string): Promise<PublicationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session expired. Sign in again.' };

  const { error } = await supabase
    .from('publications')
    .delete()
    .eq('id', publicationId)
    .eq('campaign_id', campaignId)
    .eq('status', 'queued');
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}
