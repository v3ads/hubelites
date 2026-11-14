// Server-only Campaign Brain generation.
//
// Provider routing (owner decision, 2026-10-25): Anthropic is a FIRST-SPEND
// layer in front of OpenRouter, never a replacement. When ANTHROPIC_API_KEY
// is configured and the hubelites-generation workload is under its $35
// per-cycle cap (ai-config.ts), generation calls Anthropic direct; at the
// cap, or on any Anthropic error / rate limit / timeout / malformed output,
// it falls back silently to the original OpenRouter call below — same
// prompts, same parsing, same outputs. When ANTHROPIC_API_KEY is absent the
// OpenRouter path runs exactly as it always has.
// Keys live in the platform environment and are never exposed to browsers.

import {
  AI_WORKLOADS,
  attemptAnthropicFirst,
  capUsdFor,
  estimateCostUsd,
} from '@/lib/ai-config';
import { callAnthropicMessages } from '@/lib/anthropic';
import { getAnthropicCycleSpendUsd, recordAiSpend } from '@/lib/ai-ledger';

export type CampaignPlanAsset = {
  type: 'social_post' | 'email' | 'script' | 'image';
  channel: string;
  title: string;
  body: string;
};

export type CampaignPlan = {
  angle: string;
  core_message: string;
  hooks: string[];
  objections: { objection: string; response: string }[];
  calendar: { day: string; items: string[] }[];
  assets: CampaignPlanAsset[];
};

export type CampaignContext = {
  brandName: string;
  personalName: string | null;
  website: string | null;
  voiceStyle: string | null;
  audienceName: string;
  destinationUrl: string | null;
  channels: string[];
  budgetMode: 'economy' | 'balanced' | 'video_heavy';
  missionBrain: { category: string; title: string; text: string }[];
  /** Phase 6 Slice C: the ambassador's own proven result signals, when
   * enough tracked data exists. Absent = no learnings yet. */
  learnings?: string[];
};

const ASSET_COUNTS: Record<CampaignContext['budgetMode'], { social_post: number; email: number; script: number; image: number }> = {
  economy: { social_post: 3, email: 1, script: 2, image: 1 },
  balanced: { social_post: 5, email: 2, script: 3, image: 2 },
  video_heavy: { social_post: 4, email: 2, script: 5, image: 2 },
};

function buildPrompts(context: CampaignContext) {
  const counts = ASSET_COUNTS[context.budgetMode];
  const brain = context.missionBrain
    .map((item) => `[${item.category}] ${item.title}: ${item.text}`)
    .join('\n');

  const system = [
    'You are the HubElites Campaign Brain. You turn ONE audience decision into a coordinated weekly marketing campaign for an eStage Ambassador.',
    'You work ONLY from the approved Mission Brain knowledge provided. Never invent positioning, offers, prices, dates, or program details that are not in the Mission Brain or the campaign context.',
    'Obey every restriction in the Mission Brain, especially: never call ESTAGE "all-in-one", never say "you own the platform", never claim "only", "first" or "nobody else", and never promise earnings, growth, income, results or guaranteed outcomes. Also never use the connected-hubs or syndication angle: do not describe hubs connecting to each other, going live once across multiple hubs, or publishing once to reach other hubs.',
    'Every call to action points to the Ambassador destination URL given in the context — their own domain, where registration, checkout and attribution happen.',
    'Write in the Ambassador voice style given. Output STRICT JSON only, matching the requested shape exactly. No markdown, no commentary outside the JSON.',
  ].join('\n');

  const user = [
    `BRAND: ${context.brandName}${context.personalName ? ` (${context.personalName})` : ''}`,
    context.website ? `WEBSITE: ${context.website}` : '',
    `VOICE STYLE: ${context.voiceStyle ?? 'Direct and practical'}`,
    `AUDIENCE: ${context.audienceName}`,
    `DESTINATION URL (every CTA points here): ${context.destinationUrl ?? 'not set — end assets with a clear invitation to visit the Ambassador domain'}`,
    `CHANNELS: ${context.channels.join(', ') || 'YouTube, Email'}`,
    '',
    'MISSION BRAIN (approved knowledge — the only positioning you may use):',
    brain,
    ...(context.learnings && context.learnings.length
      ? [
          '',
          'WHAT HAS WORKED FOR THIS AMBASSADOR (signals from their own tracked link results — lean into these patterns: favor the winning formats and angles; never quote these numbers inside the assets themselves):',
          ...context.learnings.map((line) => `- ${line}`),
        ]
      : []),
    '',
    `Create this week's campaign. Asset counts for budget mode "${context.budgetMode}": ${counts.social_post} social_post, ${counts.email} email, ${counts.script} script (vertical short-form video scripts), ${counts.image} image (graphic briefs).`,
    'Assign each asset a channel from the channel list where it fits (scripts → YouTube, TikTok or Instagram when Instagram is in the channel list; social_post → its platform; email → Email; image → Instagram or Facebook).',
    'For email assets, start the body with "Subject: <subject line>" on its own line.',
    'For script assets, write a complete spoken script for a 30–45 second vertical video: hook line first, then the beats, then the CTA to the destination.',
    'PLATFORM SCRIPT CTAs (exact rules): a script ends with the comment-keyword closing line for its channel, exactly as written, with nothing after it: Instagram → "Comment HUB and I\'ll send you the invite, or see the link in my bio." · TikTok → "Comment HUB and I\'ll send you the invite, or see the link in my bio." · YouTube → "Comment HUB and I\'ll send you the invite, or check the description for the link." Scripts for any other channel keep the destination CTA. Never use the word "free" in a CTA.',
    'For image assets, the body is a precise visual brief a designer or image model can execute (composition, text on graphic, brand feel).',
    'The calendar must cover Mon–Sun and reference asset titles exactly as they appear in the assets array.',
    '',
    'JSON shape:',
    '{"angle": string, "core_message": string, "hooks": string[5], "objections": [{"objection": string, "response": string}], "calendar": [{"day": "Mon", "items": string[]}], "assets": [{"type": "social_post"|"email"|"script"|"image", "channel": string, "title": string, "body": string}]}',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

/** Shared parse + validation for whichever provider produced the content. */
function parsePlan(content: string): CampaignPlan {
  let parsed: CampaignPlan;
  try {
    parsed = JSON.parse(content) as CampaignPlan;
  } catch {
    throw new Error('Campaign Brain returned malformed JSON. Nothing was saved — try generating again.');
  }

  const allowedTypes = new Set(['social_post', 'email', 'script', 'image']);
  parsed.assets = (parsed.assets ?? []).filter(
    (asset) => asset && allowedTypes.has(asset.type) && typeof asset.body === 'string' && asset.body.trim().length > 0,
  );
  if (!parsed.assets.length) throw new Error('Campaign Brain returned no usable assets. Nothing was saved — try generating again.');
  parsed.hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];
  parsed.objections = Array.isArray(parsed.objections) ? parsed.objections : [];
  parsed.calendar = Array.isArray(parsed.calendar) ? parsed.calendar : [];

  return parsed;
}

type RawGeneration = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  /** Provider-reported USD cost when the provider supplies one (OpenRouter does). */
  reportedCostUsd?: number | null;
  /** The provider's raw usage object, returned to callers on the original path. */
  usageRaw?: unknown;
};

/** The original OpenRouter call — unchanged request, headers and errors. */
async function callOpenRouterChat(system: string, user: string): Promise<RawGeneration> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured on the platform.');
  const model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-5-mini';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hubelites.com',
      'X-Title': 'HubElites Campaign Brain',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(110_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned an empty response.');

  return {
    content,
    model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    reportedCostUsd: typeof data.usage?.cost === 'number' ? data.usage.cost : null,
    usageRaw: data.usage ?? null,
  };
}

export async function generateCampaignPlan(context: CampaignContext): Promise<{ plan: CampaignPlan; model: string; usage: unknown }> {
  const { system, user } = buildPrompts(context);
  const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;

  if (!anthropicConfigured) {
    // Original path, byte-for-byte: no ledger, no routing, no behaviour change.
    const raw = await callOpenRouterChat(system, user);
    return { plan: parsePlan(raw.content), model: raw.model, usage: raw.usageRaw ?? null };
  }

  const workload = AI_WORKLOADS.hubelitesGeneration;
  const cycleSpendUsd = await getAnthropicCycleSpendUsd(workload);

  const { value, provider } = await attemptAnthropicFirst({
    anthropicConfigured,
    cycleSpendUsd,
    capUsd: capUsdFor(workload),
    tryAnthropic: async () => {
      const result = await callAnthropicMessages(system, user);
      // Parsing inside the attempt: malformed Anthropic output counts as an
      // Anthropic failure and falls back like any other.
      return { raw: { ...result, reportedCostUsd: null } as RawGeneration, plan: parsePlan(result.content) };
    },
    useFallback: async () => {
      const raw = await callOpenRouterChat(system, user);
      return { raw, plan: parsePlan(raw.content) };
    },
  });

  const { raw, plan } = value;
  const estCostUsd =
    raw.reportedCostUsd ??
    estimateCostUsd(raw.model, {
      inputTokens: raw.inputTokens,
      outputTokens: raw.outputTokens,
      cacheReadTokens: raw.cacheReadTokens,
      cacheWriteTokens: raw.cacheWriteTokens,
    });

  await recordAiSpend({
    workload,
    provider,
    model: raw.model,
    inputTokens: raw.inputTokens,
    outputTokens: raw.outputTokens,
    estCostUsd,
  });

  return {
    plan,
    model: raw.model,
    usage: {
      cost: estCostUsd,
      prompt_tokens: raw.inputTokens,
      completion_tokens: raw.outputTokens,
      provider,
    },
  };
}
