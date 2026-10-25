// Focused checks for the Anthropic first-spend routing layer.
// Pure logic only (src/lib/ai-config.ts has no imports) — all provider calls
// are stubs, no network, no real API keys. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attemptAnthropicFirst,
  capUsdFor,
  cycleLabel,
  cycleStartDate,
  estimateCostUsd,
  AI_WORKLOADS,
} from '../src/lib/ai-config.ts';

const CAP = capUsdFor(AI_WORKLOADS.hubelitesGeneration);

test('cap for hubelites-generation is $35/cycle', () => {
  assert.equal(CAP, 35);
});

test('no Anthropic key configured -> OpenRouter path only, Anthropic never attempted', async () => {
  let anthropicCalls = 0;
  const { value, provider } = await attemptAnthropicFirst({
    anthropicConfigured: false,
    cycleSpendUsd: 0,
    capUsd: CAP,
    tryAnthropic: async () => {
      anthropicCalls += 1;
      return 'anthropic';
    },
    useFallback: async () => 'openrouter',
  });
  assert.equal(provider, 'openrouter');
  assert.equal(value, 'openrouter');
  assert.equal(anthropicCalls, 0);
});

test('key present + under cap -> Anthropic serves, fallback untouched', async () => {
  let fallbackCalls = 0;
  const { value, provider } = await attemptAnthropicFirst({
    anthropicConfigured: true,
    cycleSpendUsd: 12.5,
    capUsd: CAP,
    tryAnthropic: async () => 'anthropic',
    useFallback: async () => {
      fallbackCalls += 1;
      return 'openrouter';
    },
  });
  assert.equal(provider, 'anthropic');
  assert.equal(value, 'anthropic');
  assert.equal(fallbackCalls, 0);
});

test('cap reached -> Anthropic skipped, OpenRouter serves', async () => {
  let anthropicCalls = 0;
  const { provider } = await attemptAnthropicFirst({
    anthropicConfigured: true,
    cycleSpendUsd: CAP,
    capUsd: CAP,
    tryAnthropic: async () => {
      anthropicCalls += 1;
      return 'anthropic';
    },
    useFallback: async () => 'openrouter',
  });
  assert.equal(provider, 'openrouter');
  assert.equal(anthropicCalls, 0);
});

test('spend unknown (ledger unreadable) -> Anthropic not attempted', async () => {
  let anthropicCalls = 0;
  const { provider } = await attemptAnthropicFirst({
    anthropicConfigured: true,
    cycleSpendUsd: null,
    capUsd: CAP,
    tryAnthropic: async () => {
      anthropicCalls += 1;
      return 'anthropic';
    },
    useFallback: async () => 'openrouter',
  });
  assert.equal(provider, 'openrouter');
  assert.equal(anthropicCalls, 0);
});

test('Anthropic failure (error / rate limit / timeout / malformed) -> silent OpenRouter fallback', async () => {
  const { value, provider } = await attemptAnthropicFirst({
    anthropicConfigured: true,
    cycleSpendUsd: 0,
    capUsd: CAP,
    tryAnthropic: async () => {
      throw new Error('Anthropic request failed (429): rate limited');
    },
    useFallback: async () => 'openrouter',
  });
  assert.equal(provider, 'openrouter');
  assert.equal(value, 'openrouter');
});

test('credit cycle is anchored on the 4th', () => {
  assert.equal(cycleStartDate(new Date('2026-10-03T23:59:00Z')), '2026-09-04');
  assert.equal(cycleStartDate(new Date('2026-10-04T00:00:00Z')), '2026-10-04');
  assert.equal(cycleStartDate(new Date('2026-10-25T12:00:00Z')), '2026-10-04');
  assert.equal(cycleStartDate(new Date('2026-11-03T12:00:00Z')), '2026-10-04');
  assert.equal(cycleStartDate(new Date('2026-11-04T12:00:00Z')), '2026-11-04');
  assert.equal(cycleStartDate(new Date('2027-01-02T12:00:00Z')), '2026-12-04');
});

test('cycle label spans 4th to 3rd', () => {
  assert.equal(cycleLabel(new Date('2026-10-25T12:00:00Z')), 'Oct 4 – Nov 3');
  assert.equal(cycleLabel(new Date('2026-12-25T12:00:00Z')), 'Dec 4 – Jan 3');
});

test('cost estimate uses per-model rates (Sonnet 5.5: $2 in / $10 out per 1M)', () => {
  assert.equal(
    estimateCostUsd('claude-sonnet-5-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 }),
    12,
  );
  assert.equal(
    estimateCostUsd('claude-sonnet-5-5', { inputTokens: 10_000, outputTokens: 2_000 }),
    0.04,
  );
});
