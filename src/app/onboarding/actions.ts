'use server';

import { createClient } from '@/lib/supabase-server';

export type OnboardingInput = {
  brand: string;
  fullName: string;
  website: string;
  missionUrl: string;
  audiences: string[];
  channels: string[];
  tone: string;
};

export type OnboardingResult = { ok: true; organizationId: string } | { ok: false; error: string };

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'ambassador';
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session expired. Sign in again and retry.' };

  const brand = input.brand.trim();
  const fullName = input.fullName.trim();
  const orgName = brand || fullName || (user.email?.split('@')[0] ?? 'My Hub');
  if (orgName.length < 2) return { ok: false, error: 'Add your brand or name so we can name your workspace.' };

  // If this user already owns a workspace, finish idempotently instead of creating a duplicate.
  const { data: existing } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();

  let organizationId = existing?.organization_id as string | undefined;

  if (!organizationId) {
    const baseSlug = slugify(orgName);
    let createdId: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < 4 && !createdId; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
      const { data, error } = await supabase.rpc('create_my_organization', {
        org_name: orgName,
        org_slug: slug,
      });
      if (!error && data) {
        createdId = data as string;
      } else {
        lastError = error?.message ?? 'Could not create your workspace.';
        if (!/duplicate|unique|already exists/i.test(lastError)) break;
      }
    }

    if (!createdId) return { ok: false, error: lastError ?? 'Could not create your workspace.' };
    organizationId = createdId;
  }

  const website = normalizeUrl(input.website);
  const missionUrl = normalizeUrl(input.missionUrl);
  const audienceNames = [...new Set(input.audiences.map((a) => a.trim()).filter(Boolean))].slice(0, 4);
  const channels = [...new Set(input.channels.map((c) => c.trim()).filter(Boolean))];

  // Brand profile (row was created by create_my_organization; update it with the real details).
  const { error: brandError } = await supabase
    .from('brand_profiles')
    .update({
      business_name: orgName,
      personal_name: fullName || null,
      website_url: website || null,
      voice_style: input.tone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId);
  if (brandError) return { ok: false, error: `Workspace created, but brand details failed to save: ${brandError.message}` };

  // Mission 1000 destination.
  let destinationId: string | null = null;
  if (missionUrl) {
    const { data: destination, error: destinationError } = await supabase
      .from('ambassador_destinations')
      .upsert(
        { organization_id: organizationId, campaign_key: 'mission-1000', destination_url: missionUrl, is_active: true },
        { onConflict: 'organization_id,campaign_key' },
      )
      .select('id')
      .single();
    if (destinationError) {
      return { ok: false, error: `Workspace created, but your destination failed to save: ${destinationError.message}` };
    }
    destinationId = destination.id as string;
  }

  // Audiences (skip ones that already exist for this workspace).
  const { data: existingAudiences } = await supabase
    .from('audiences')
    .select('id,name')
    .eq('organization_id', organizationId);
  const existingNames = new Set((existingAudiences ?? []).map((a) => (a.name as string).toLowerCase()));
  const audienceIds = new Map<string, string>(
    (existingAudiences ?? []).map((a) => [(a.name as string).toLowerCase(), a.id as string]),
  );

  const newAudiences = audienceNames.filter((name) => !existingNames.has(name.toLowerCase()));
  if (newAudiences.length) {
    const { data: inserted, error: audienceError } = await supabase
      .from('audiences')
      .insert(newAudiences.map((name) => ({ organization_id: organizationId, name })))
      .select('id,name');
    if (audienceError) {
      return { ok: false, error: `Workspace created, but your audiences failed to save: ${audienceError.message}` };
    }
    for (const row of inserted ?? []) audienceIds.set((row.name as string).toLowerCase(), row.id as string);
  }

  // First campaign draft — the honest starting point the Campaign Brain will build on in the next phase.
  const primaryAudience = audienceNames[0];
  const { data: existingDraft } = await supabase
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('status', 'draft')
    .limit(1)
    .maybeSingle();

  if (!existingDraft) {
    const { error: campaignError } = await supabase.from('campaigns').insert({
      organization_id: organizationId,
      audience_id: primaryAudience ? audienceIds.get(primaryAudience.toLowerCase()) ?? null : null,
      destination_id: destinationId,
      title: primaryAudience ? `First campaign — ${primaryAudience}` : 'First campaign',
      objective: 'webinar_registration',
      budget_mode: 'balanced',
      status: 'draft',
      brief: {
        source: 'onboarding',
        audiences: audienceNames,
        channels,
        tone: input.tone,
        destination_url: missionUrl || null,
        note: 'Created during onboarding. Campaign generation arrives with the Campaign Brain phase.',
      },
      created_by: user.id,
    });
    if (campaignError) {
      return { ok: false, error: `Workspace created, but your first campaign draft failed to save: ${campaignError.message}` };
    }
  }

  // Mark the profile as onboarded.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      display_name: fullName || undefined,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (profileError) return { ok: false, error: `Workspace is ready, but your profile failed to update: ${profileError.message}` };

  return { ok: true, organizationId };
}
