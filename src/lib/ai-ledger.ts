// Server-only spend ledger for AI provider calls (table: ai_spend_ledger,
// migration 002). Writes use the service role — the table has no user-level
// insert policy by design, mirroring generation_jobs / audit_log.
//
// Every function here is fail-safe: the ledger powers the Anthropic cap and
// admin visibility, but a ledger problem must never break generation. Reads
// return null on any error (callers treat null as "spend unknown"), writes
// are swallowed after a console warning.

import { createAdminClient } from '@/lib/supabase-admin';
import { cycleStartDate, type AiProvider } from '@/lib/ai-config';

export type AiSpendEntry = {
  workload: string;
  provider: AiProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estCostUsd: number;
};

/**
 * Cycle-to-date Anthropic spend in USD for a workload, or null when the
 * ledger cannot be read (table missing, service role unavailable, ...).
 * Null means "unknown" — the router will not spend Anthropic credits
 * against an unverifiable balance.
 */
export async function getAnthropicCycleSpendUsd(
  workload: string,
  now: Date = new Date(),
): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('ai_spend_ledger')
      .select('est_cost_usd')
      .eq('workload', workload)
      .eq('provider', 'anthropic')
      .eq('cycle_start', cycleStartDate(now));
    if (error) return null;
    return (data ?? []).reduce((sum, row) => sum + Number(row.est_cost_usd ?? 0), 0);
  } catch {
    return null;
  }
}

/** Record one generation call. Never throws. */
export async function recordAiSpend(entry: AiSpendEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('ai_spend_ledger').insert({
      cycle_start: cycleStartDate(),
      workload: entry.workload,
      provider: entry.provider,
      model: entry.model,
      input_tokens: Math.max(0, Math.round(entry.inputTokens)),
      output_tokens: Math.max(0, Math.round(entry.outputTokens)),
      est_cost_usd: entry.estCostUsd,
    });
    if (error) console.error('ai_spend_ledger insert failed:', error.message);
  } catch (error) {
    console.error('ai_spend_ledger unavailable:', error instanceof Error ? error.message : error);
  }
}

export type AiSpendSummary = {
  cycleStart: string;
  anthropicSpendUsd: number;
  lastProvider: AiProvider | null;
  lastModel: string | null;
  lastAt: string | null;
};

/** Admin readout: current-cycle Anthropic spend + most recent provider used. */
export async function getAiSpendSummary(workload: string): Promise<AiSpendSummary | null> {
  try {
    const admin = createAdminClient();
    const cycleStart = cycleStartDate();
    const [spendResult, lastResult] = await Promise.all([
      admin
        .from('ai_spend_ledger')
        .select('est_cost_usd')
        .eq('workload', workload)
        .eq('provider', 'anthropic')
        .eq('cycle_start', cycleStart),
      admin
        .from('ai_spend_ledger')
        .select('provider,model,created_at')
        .eq('workload', workload)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (spendResult.error) return null;
    const anthropicSpendUsd = (spendResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.est_cost_usd ?? 0),
      0,
    );
    const last = lastResult.data;
    return {
      cycleStart,
      anthropicSpendUsd,
      lastProvider: (last?.provider as AiProvider | undefined) ?? null,
      lastModel: (last?.model as string | undefined) ?? null,
      lastAt: (last?.created_at as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}
