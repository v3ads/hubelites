'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { estimateGenerationCredits } from '@/lib/credits';
import { createAvatarVideo, heygenConfigured } from '@/lib/heygen';
import { higgsfieldConfigured, submitSoulImage } from '@/lib/higgsfield';
import { syncMediaAsset, type MediaState } from '@/lib/media-jobs';
import { toSpokenScript } from '@/lib/spoken-script';

type ActionResult = { ok: boolean; error?: string };

export async function generateAssetMedia(assetId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };

  const { data: asset } = await supabase
    .from('campaign_assets')
    .select('id, organization_id, campaign_id, type, title, body, media_url, thumbnail_url, metadata, status')
    .eq('id', assetId)
    .maybeSingle();
  if (!asset) return { ok: false, error: 'Asset not found.' };

  const kind = asset.type === 'image' ? 'media_image' : asset.type === 'script' ? 'media_video' : null;
  if (!kind) return { ok: false, error: 'Media generation is available on image briefs and scripts.' };
  const provider = kind === 'media_image' ? 'higgsfield' : 'heygen';
  const configured = provider === 'heygen' ? heygenConfigured() : higgsfieldConfigured();
  if (!configured) {
    return { ok: false, error: 'Media generation is not switched on yet — the provider connection is still being set up.' };
  }

  // Super admins generate without credits (Ayman's directive 2026-11-07:
  // the admin account is unlimited and never pays). The job still records
  // the nominal rate and the provider cost; it just reserves/charges 0,
  // flagged admin_unlimited so the Media Jobs ledger stays truthful.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  const adminUnlimited = profile?.is_super_admin === true;

  const existing = (asset.metadata as { media?: MediaState })?.media;
  if (existing?.state === 'processing') return { ok: false, error: 'This asset is already generating — give it a moment, then refresh.' };
  // Regeneration of a ready asset is allowed (added 2026-11-07 — the
  // studio previously offered no way to re-take a completed video, which
  // stranded the pre-fix male-voice render of Proof-Nov 7 Short 1). The
  // new job replaces the media when it finalizes; an APPROVED asset
  // returns to review below, because the approval was for the old take.

  const cost = estimateGenerationCredits(kind);
  const billableCost = adminUnlimited ? 0 : cost;
  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('balance')
    .eq('organization_id', asset.organization_id)
    .maybeSingle();
  if ((wallet?.balance ?? 0) < billableCost) {
    return {
      ok: false,
      error: `This ${kind === 'media_image' ? 'image' : 'video'} costs ${cost} credits and your balance is ${wallet?.balance ?? 0}. Add a pack on the Credits page first — nothing was charged.`,
    };
  }

  // Job row first (member session, migration 003 policies): the reservation
  // is on record before any provider spend happens.
  const { data: job, error: jobError } = await supabase
    .from('generation_jobs')
    .insert({
      organization_id: asset.organization_id,
      campaign_id: asset.campaign_id,
      asset_id: asset.id,
      status: 'running',
      credits_reserved: billableCost,
      request: { kind, asset_id: asset.id, provider, ...(adminUnlimited ? { admin_unlimited: true, nominal_credits: cost } : {}) },
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (jobError || !job) {
    return { ok: false, error: 'Media generation could not start — the job could not be recorded. Nothing was charged.' };
  }

  try {
    let media: MediaState;
    if (provider === 'heygen') {
      // ONLY the sanitized spoken text reaches HeyGen — the stored script
      // is a labeled production document (Hook:/CTA:/B-roll:/directions)
      // and the avatar would read every label aloud. The exact text sent
      // is recorded on the job and previewed in the AssetCard.
      const script = toSpokenScript(asset.body ?? '');
      if (script.length < 20) throw new Error('The script is too short to render as a video.');
      // The platform presenter (set on /admin/presenter) is read through
      // the service-role client: the catalog is super-admin-only at the
      // RLS level, but every member's render must use the same presenter.
      const admin = createAdminClient();
      const { data: catalogRow } = await admin
        .from('media_provider_catalog')
        .select('config')
        .eq('provider', 'heygen')
        .maybeSingle();
      const presenterLookId =
        typeof (catalogRow?.config as Record<string, unknown> | null)?.presenter_look_id === 'string'
          ? ((catalogRow?.config as Record<string, unknown>).presenter_look_id as string)
          : null;
      const created = await createAvatarVideo({
        script,
        title: asset.title ?? 'HubElites campaign video',
        presenterLookId,
      });
      media = { state: 'processing', job_id: job.id, provider, provider_job_id: created.videoId, cost };
      await supabase
        .from('generation_jobs')
        .update({
          request: {
            kind,
            asset_id: asset.id,
            provider,
            ...(adminUnlimited ? { admin_unlimited: true, nominal_credits: cost } : {}),
            engine: created.engine,
            avatar_id: created.avatarId,
            voice_id: created.voiceId,
            pairing: created.pairing,
            // Census of the chosen look's shape evidence (round 2): the
            // probed preview dimensions + classified shape + tier, so a
            // single generation shows what the catalog actually offered.
            avatar_source: {
              probed_width: created.source.probedWidth,
              probed_height: created.source.probedHeight,
              source_shape: created.source.sourceShape,
              tier: created.source.tier,
              basis: created.source.basis,
            },
            spoken_script: script,
          },
          response: { provider_job_id: created.videoId },
        })
        .eq('id', job.id);
    } else {
      const prompt = (asset.body ?? '').trim().slice(0, 1500);
      if (prompt.length < 20) throw new Error('The image brief is too short to generate from.');
      const submitted = await submitSoulImage({ prompt });
      media = { state: 'processing', job_id: job.id, provider, provider_job_id: submitted.requestId, status_url: submitted.statusUrl, cost };
      await supabase
        .from('generation_jobs')
        .update({ response: { provider_job_id: submitted.requestId, status_url: submitted.statusUrl } })
        .eq('id', job.id);
    }
    await supabase
      .from('campaign_assets')
      .update({
        metadata: { ...(asset.metadata as object), media },
        // A regenerated take is a NEW artifact: an approved asset goes
        // back to review so it is re-approved before it can be shared.
        ...(asset.status === 'approved' ? { status: 'ready' } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', asset.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The provider could not start this generation.';
    await supabase
      .from('generation_jobs')
      .update({ status: 'failed', error_message: message.slice(0, 500), completed_at: new Date().toISOString() })
      .eq('id', job.id);
    return { ok: false, error: `Generation did not start: ${message} Nothing was charged.` };
  }

  revalidatePath(`/campaigns/${asset.campaign_id}`);
  return { ok: true };
}

export async function refreshAssetMedia(assetId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };

  // Ownership proven through the member session (RLS) before the
  // service-role sync touches wallets or assets.
  const { data: asset } = await supabase
    .from('campaign_assets')
    .select('id, organization_id, campaign_id, type, title, media_url, thumbnail_url, metadata')
    .eq('id', assetId)
    .maybeSingle();
  if (!asset) return { ok: false, error: 'Asset not found.' };

  const admin = createAdminClient();
  await syncMediaAsset(admin, asset as Parameters<typeof syncMediaAsset>[1]);
  revalidatePath(`/campaigns/${asset.campaign_id}`);
  return { ok: true };
}
