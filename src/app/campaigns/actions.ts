'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { generateCampaignPlan, type CampaignContext } from '@/lib/openrouter';

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createCampaign(input: {
  title: string;
  audienceId: string;
  budgetMode: 'economy' | 'balanced' | 'video_heavy';
  channels: string[];
}): Promise<ActionResult> {
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
  if (!membership) return { ok: false, error: 'No workspace found for your account.' };
  const organizationId = membership.organization_id as string;

  const { data: audience } = await supabase
    .from('audiences')
    .select('id,name')
    .eq('id', input.audienceId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!audience) return { ok: false, error: 'Choose one of your audiences first.' };

  const { data: destination } = await supabase
    .from('ambassador_destinations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const title = input.title.trim() || `Campaign — ${audience.name as string}`;
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      organization_id: organizationId,
      audience_id: audience.id,
      destination_id: destination?.id ?? null,
      title,
      objective: 'webinar_registration',
      budget_mode: input.budgetMode,
      status: 'draft',
      brief: { source: 'manual', channels: input.channels, audiences: [audience.name as string] },
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/campaigns');
  revalidatePath('/dashboard');
  redirect(`/campaigns/${campaign.id}`);
}

export async function generateCampaign(campaignId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session expired. Sign in again.' };

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id,organization_id,title,status,brief,budget_mode,audience_id,destination_id')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: 'Campaign not found in your workspace.' };

  const organizationId = campaign.organization_id as string;
  const previousStatus = (campaign.status as string) ?? 'draft';
  const brief = (campaign.brief ?? {}) as Record<string, unknown>;

  const [brandResult, destinationResult, audienceResult, brainResult] = await Promise.all([
    supabase.from('brand_profiles').select('*').eq('organization_id', organizationId).maybeSingle(),
    campaign.destination_id
      ? supabase.from('ambassador_destinations').select('*').eq('id', campaign.destination_id).maybeSingle()
      : supabase
          .from('ambassador_destinations')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
    campaign.audience_id
      ? supabase.from('audiences').select('*').eq('id', campaign.audience_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('mission_brain_items').select('category,title,content').eq('status', 'active'),
  ]);

  const brainItems = (brainResult.data ?? []).map((item) => {
    const content = (item.content ?? {}) as { text?: string };
    return { category: item.category as string, title: item.title as string, text: content.text ?? '' };
  }).filter((item) => item.text.trim().length > 0);
  if (!brainItems.length) {
    return { ok: false, error: 'Mission Brain has no active items. A Super Admin needs to approve positioning before generation.' };
  }

  const audienceName =
    (audienceResult.data?.name as string | undefined) ??
    ((brief.audiences as string[] | undefined)?.[0] ?? 'Coaches');
  const channels = ((brief.channels as string[] | undefined) ?? []).filter(Boolean);

  const context: CampaignContext = {
    brandName: (brandResult.data?.business_name as string | undefined) ?? 'Your brand',
    personalName: (brandResult.data?.personal_name as string | undefined) ?? null,
    website: (brandResult.data?.website_url as string | undefined) ?? null,
    voiceStyle: (brandResult.data?.voice_style as string | undefined) ?? null,
    audienceName,
    destinationUrl: (destinationResult.data?.destination_url as string | undefined) ?? null,
    channels: channels.length ? channels : ['YouTube', 'Email'],
    budgetMode: ((campaign.budget_mode as string) ?? 'balanced') as CampaignContext['budgetMode'],
    missionBrain: brainItems,
  };

  // Bookkeeping rows are written through the member's own session — migration 003
  // grants tenant-scoped insert/update on generation_jobs and audit_log, so the
  // engine does not depend on a service-role key in the app environment.
  // This setup must never throw unhandled: any failure returns a visible error.
  let job: { id: string } | null = null;
  try {
    const { data: jobRow, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        organization_id: organizationId,
        campaign_id: campaign.id,
        status: 'running',
        request: { kind: 'campaign_plan', budget_mode: context.budgetMode, audience: audienceName },
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (jobError) throw new Error(jobError.message);
    job = jobRow;
  } catch (setupError) {
    const detail = setupError instanceof Error ? setupError.message : 'unknown setup failure';
    return {
      ok: false,
      error: `Generation could not start — platform bookkeeping failed (${detail}). Nothing was generated or charged. This is a platform bookkeeping issue, not a problem with your campaign.`,
    };
  }

  await supabase.from('campaigns').update({ status: 'generating' }).eq('id', campaign.id);

  try {
    const { plan, model, usage } = await generateCampaignPlan(context);

    // Regeneration replaces only un-approved generated assets; approved/scheduled/published work is kept.
    await supabase
      .from('campaign_assets')
      .delete()
      .eq('campaign_id', campaign.id)
      .in('status', ['draft', 'ready']);

    const assetRows = plan.assets.map((asset) => ({
      campaign_id: campaign.id as string,
      organization_id: organizationId,
      type: asset.type,
      title: asset.title,
      body: asset.body,
      channel: asset.channel,
      status: 'ready',
      metadata: { source: 'campaign_brain', model },
    }));
    const { error: assetError } = await supabase.from('campaign_assets').insert(assetRows);
    if (assetError) throw new Error(`Generated, but saving assets failed: ${assetError.message}`);

    const { error: campaignError } = await supabase
      .from('campaigns')
      .update({
        status: 'ready',
        brief: {
          ...brief,
          angle: plan.angle,
          core_message: plan.core_message,
          hooks: plan.hooks,
          objections: plan.objections,
          calendar: plan.calendar,
          generated_at: new Date().toISOString(),
          model,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);
    if (campaignError) throw new Error(`Generated, but saving the campaign failed: ${campaignError.message}`);

    const usageCost = (usage as { cost?: number } | null)?.cost;
    if (job) {
      await supabase
        .from('generation_jobs')
        .update({
          status: 'succeeded',
          provider_cost_micros: typeof usageCost === 'number' ? Math.round(usageCost * 1_000_000) : null,
          response: { assets: assetRows.length, model },
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }
    await supabase.from('audit_log').insert({
      actor_user_id: user.id,
      organization_id: organizationId,
      action: 'campaign.generated',
      entity_type: 'campaign',
      entity_id: campaign.id as string,
      metadata: { assets: assetRows.length, model },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed unexpectedly.';
    await supabase.from('campaigns').update({ status: previousStatus === 'generating' ? 'draft' : previousStatus }).eq('id', campaign.id);
    if (job) {
      await supabase
        .from('generation_jobs')
        .update({ status: 'failed', error_message: message.slice(0, 500), completed_at: new Date().toISOString() })
        .eq('id', job.id);
    }
    revalidatePath(`/campaigns/${campaign.id}`);
    return { ok: false, error: message };
  }

  revalidatePath(`/campaigns/${campaign.id}`);
  revalidatePath('/campaigns');
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  return { ok: true };
}

export async function setAssetStatus(assetId: string, status: 'approved' | 'ready'): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session expired. Sign in again.' };

  const { data: asset } = await supabase.from('campaign_assets').select('id,campaign_id').eq('id', assetId).maybeSingle();
  if (!asset) return { ok: false, error: 'Asset not found in your workspace.' };

  const { error } = await supabase.from('campaign_assets').update({ status, updated_at: new Date().toISOString() }).eq('id', assetId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/campaigns/${asset.campaign_id}`);
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function deleteAsset(assetId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session expired. Sign in again.' };

  const { data: asset } = await supabase.from('campaign_assets').select('id,campaign_id').eq('id', assetId).maybeSingle();
  if (!asset) return { ok: false, error: 'Asset not found in your workspace.' };

  const { error } = await supabase.from('campaign_assets').delete().eq('id', assetId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/campaigns/${asset.campaign_id}`);
  revalidatePath('/dashboard');
  return { ok: true };
}
