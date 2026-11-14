// Central configuration for AI provider routing and Anthropic credit caps.
// ONE place for: workload names, per-workload cycle caps, model defaults and
// per-model pricing used to estimate spend for the ai_spend_ledger.
//
// Governing rule (owner, 2026-10-25): Anthropic is a FIRST-SPEND layer in
// front of the existing OpenRouter engine — never a replacement. A workload
// calls Anthropic direct until its per-cycle cap is reached; at the cap, or
// on any Anthropic error, it falls back to the original OpenRouter path.
// Credit cycles are anchored on the 4th of each month (credits replenish on
// the 4th): a cycle runs from the 4th to the 3rd of the next month.
//
// This module is intentionally import-free and side-effect-free so it can be
// unit-tested directly (tests/ai-provider.test.mjs).

export type AiProvider = 'anthropic' | 'openrouter';

export const AI_WORKLOADS = {
  hubelitesGeneration: 'hubelites-generation',
} as const;

export const AI_CREDIT_CYCLE = {
  /** Day of month on which Anthropic credits replenish and caps reset. */
  anchorDay: 4,
  /** Per-cycle Anthropic spend cap in USD, by workload. */
  capUsdByWorkload: {
    'hubelites-generation': 35,
  } as Record<string, number>,
};

export function capUsdFor(workload: string): number | null {
  return AI_CREDIT_CYCLE.capUsdByWorkload[workload] ?? null;
}

/** Current Sonnet on the Anthropic API (override with ANTHROPIC_MODEL). */
export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-5-5';
/** Per-call output budget so one runaway generation cannot eat the month. */
export const ANTHROPIC_MAX_TOKENS = 16_000;
/** Anthropic gets less than the full window so an OpenRouter fallback can still run. */
export const ANTHROPIC_TIMEOUT_MS = 90_000;

type ModelRate = {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
};

/** USD per 1M tokens. Anthropic rates verified against anthropic.com (Oct 2026). */
export const AI_PRICING_USD_PER_MILLION: Record<string, ModelRate> = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-sonnet-4-5': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'openai/gpt-5-mini': { input: 0.25, output: 2 },
};

/** Used only if ANTHROPIC_MODEL / OPENROUTER_MODEL points at an unlisted model. */
const FALLBACK_RATE: ModelRate = { input: 2, output: 10 };

export type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const rate = AI_PRICING_USD_PER_MILLION[model] ?? FALLBACK_RATE;
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const cacheRead = usage.cacheReadTokens ?? 0;
  const cacheWrite = usage.cacheWriteTokens ?? 0;
  const total =
    input * rate.input +
    output * rate.output +
    cacheRead * (rate.cacheRead ?? rate.input * 0.1) +
    cacheWrite * (rate.cacheWrite ?? rate.input * 1.25);
  return total / 1_000_000;
}

/** Start date (YYYY-MM-DD, UTC) of the credit cycle containing `now`. */
export function cycleStartDate(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const startMs =
    day >= AI_CREDIT_CYCLE.anchorDay
      ? Date.UTC(year, month, AI_CREDIT_CYCLE.anchorDay)
      : Date.UTC(year, month - 1, AI_CREDIT_CYCLE.anchorDay);
  return new Date(startMs).toISOString().slice(0, 10);
}

/** Human label for the current cycle, e.g. "Oct 4 – Nov 3". */
export function cycleLabel(now: Date = new Date()): string {
  const startIso = cycleStartDate(now);
  const [year, month, day] = startIso.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const nextStart = new Date(Date.UTC(year, month, AI_CREDIT_CYCLE.anchorDay));
  const end = new Date(nextStart.getTime() - 86_400_000);
  const format = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${format(start)} – ${format(end)}`;
}

/**
 * Anthropic-first routing with silent fallback.
 *
 * Anthropic is attempted only when ALL of these hold:
 * - an Anthropic key is configured,
 * - the cycle spend could be read from the ledger (null = unknown = do not
 *   spend against an unverifiable balance),
 * - cycle spend is under the workload cap.
 * Any Anthropic failure (HTTP error, rate limit, timeout, malformed output —
 * callers parse inside tryAnthropic so parse failures land here too) falls
 * back silently to the original provider path.
 */
export async function attemptAnthropicFirst<T>(opts: {
  anthropicConfigured: boolean;
  cycleSpendUsd: number | null;
  capUsd: number | null;
  tryAnthropic: () => Promise<T>;
  useFallback: () => Promise<T>;
}): Promise<{ value: T; provider: AiProvider }> {
  const underCap =
    opts.cycleSpendUsd !== null && (opts.capUsd === null || opts.cycleSpendUsd < opts.capUsd);
  if (opts.anthropicConfigured && underCap) {
    try {
      const value = await opts.tryAnthropic();
      return { value, provider: 'anthropic' };
    } catch {
      // Silent by design: the member sees the normal OpenRouter result.
    }
  }
  const value = await opts.useFallback();
  return { value, provider: 'openrouter' };
}
