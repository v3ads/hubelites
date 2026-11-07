// Server-only media job lifecycle: provider polling, asset finalization and
// the credit charge. Money movement (wallet + ledger) runs through the
// service-role client because wallets/ledger have no member write policies —
// callers must first prove org ownership of the asset through the member
// session (the actions and page sync do exactly that).

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAvatarVideo } from '@/lib/heygen';
import { pollSoulImage } from '@/lib/higgsfield';

export type MediaState = {
  state: 'processing' | 'ready' | 'failed';
  job_id: string;
  provider: 'heygen' | 'higgsfield';
  provider_job_id?: string;
  status_url?: string;
  cost: number;
  error?: string;
  duration_seconds?: number;
};

type AssetRow = {
  id: string;
  organization_id: string;
  campaign_id: string;
  type: string;
  title: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
};

function mediaOf(asset: AssetRow): MediaState | null {
  const media = (asset.metadata as { media?: MediaState })?.media;
  return media && typeof media === 'object' ? media : null;
}

async function chargeJob(
  admin: SupabaseClient,
  jobId: string,
  providerCostMicros: number | null,
): Promise<void> {
  const { data: job } = await admin
    .from('generation_jobs')
    .select('id, organization_id, campaign_id, credits_reserved, request')
    .eq('id', jobId)
    .maybeSingle();
  if (!job) return;

  // Conditional transition: only the first finalizer (status still running)
  // charges — a replayed sync can never double-charge.
  const { data: updated, error: updateError } = await admin
    .from('generation_jobs')
    .update({
      status: 'succeeded',
      credits_charged: job.credits_reserved ?? 0,
      provider_cost_micros: providerCostMicros,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'running')
    .select('id');
  if (updateError) {
    // Never fail silently here: a schema/RLS surprise must be loud in logs,
    // because the asset may already show as ready (2026-11-06 lesson: the
    // missing credits_charged column hid behind an unchecked update).
    console.error('media charge job update failed:', updateError);
    return;
  }
  if (!updated?.length) return;

  const cost = job.credits_reserved ?? 0;
  if (cost <= 0) return;
  const { data: wallet } = await admin
    .from('credit_wallets')
    .select('balance, lifetime_used')
    .eq('organization_id', job.organization_id)
    .maybeSingle();
  const balanceAfter = Math.max(0, (wallet?.balance ?? 0) - cost);
  await admin.from('credit_wallets').upsert(
    {
      organization_id: job.organization_id,
      balance: balanceAfter,
      lifetime_used: (wallet?.lifetime_used ?? 0) + cost,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' },
  );
  const assetId = (job.request as { asset_id?: string })?.asset_id ?? null;
  await admin.from('credit_ledger').insert({
    organization_id: job.organization_id,
    entry_type: 'usage',
    credits: -cost,
    balance_after: balanceAfter,
    description: job.request?.kind === 'media_video' ? 'Avatar video generation' : 'Image generation',
    metadata: { job_id: jobId, asset_id: assetId, kind: job.request?.kind ?? 'media' },
  });
}

async function failJob(admin: SupabaseClient, jobId: string, message: string): Promise<void> {
  await admin
    .from('generation_jobs')
    .update({ status: 'failed', error_message: message.slice(0, 500), completed_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'running');
}

async function setAssetMedia(
  admin: SupabaseClient,
  asset: AssetRow,
  media: MediaState,
  mediaUrl?: string,
  thumbnailUrl?: string,
): Promise<void> {
  await admin
    .from('campaign_assets')
    .update({
      metadata: { ...asset.metadata, media },
      ...(mediaUrl !== undefined ? { media_url: mediaUrl } : {}),
      ...(thumbnailUrl !== undefined ? { thumbnail_url: thumbnailUrl } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', asset.id);
}

/** Poll the provider for one processing asset and finalize it. Safe to call repeatedly. */
export async function syncMediaAsset(
  admin: SupabaseClient,
  asset: AssetRow,
): Promise<'ready' | 'failed' | 'processing' | 'noop'> {
  const media = mediaOf(asset);
  if (!media || media.state !== 'processing') return 'noop';

  try {
    if (media.provider === 'heygen' && media.provider_job_id) {
      const video = await getAvatarVideo(media.provider_job_id);
      if (video.status === 'completed' && video.videoUrl) {
        // Internal cost tracking at the Avatar III worst case, $0.99/min.
        const costMicros = video.durationSeconds ? Math.round(video.durationSeconds * 16_500) : null;
        await setAssetMedia(
          admin,
          asset,
          { ...media, state: 'ready', duration_seconds: video.durationSeconds ?? undefined },
          video.videoUrl,
          video.thumbnailUrl ?? undefined,
        );
        await chargeJob(admin, media.job_id, costMicros);
        return 'ready';
      }
      if (video.status === 'failed') {
        await setAssetMedia(admin, asset, { ...media, state: 'failed', error: video.failureMessage ?? 'HeyGen rendering failed.' });
        await failJob(admin, media.job_id, video.failureMessage ?? 'HeyGen rendering failed.');
        return 'failed';
      }
      return 'processing';
    }

    if (media.provider === 'higgsfield' && media.status_url) {
      const image = await pollSoulImage(media.status_url);
      if (image.status === 'completed' && image.imageUrl) {
        await setAssetMedia(admin, asset, { ...media, state: 'ready' }, image.imageUrl);
        await chargeJob(admin, media.job_id, 90_000);
        return 'ready';
      }
      if (image.status === 'failed') {
        await setAssetMedia(admin, asset, { ...media, state: 'failed', error: image.failureMessage ?? 'Image generation failed.' });
        await failJob(admin, media.job_id, image.failureMessage ?? 'Image generation failed.');
        return 'failed';
      }
      return 'processing';
    }
    return 'noop';
  } catch (error) {
    // A provider hiccup during sync must never break the page — the job
    // stays processing and the next view tries again.
    console.error('media sync failed:', error);
    return 'processing';
  }
}
