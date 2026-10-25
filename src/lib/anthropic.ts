// Server-only Anthropic Messages API client — the first-spend provider for
// workloads governed by ai-config.ts. The API key lives in the platform
// environment (ANTHROPIC_API_KEY) and is never exposed to browsers. Model
// can be overridden with ANTHROPIC_MODEL.
//
// Callers own routing/fallback (see attemptAnthropicFirst in ai-config.ts):
// this client simply throws on any failure — HTTP error, rate limit,
// timeout, empty response — and the router falls back to OpenRouter.

import {
  ANTHROPIC_DEFAULT_MODEL,
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_TIMEOUT_MS,
} from '@/lib/ai-config';

export type AnthropicResult = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

// Current Sonnet models occasionally wrap JSON in a markdown fence despite a
// "strict JSON" system prompt. Strip one fence layer here, at the provider
// boundary, so the shared plan parser sees the same shape OpenRouter returns.
function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function callAnthropicMessages(system: string, user: string): Promise<AnthropicResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.');
  const model = process.env.ANTHROPIC_MODEL ?? ANTHROPIC_DEFAULT_MODEL;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
      // No temperature: current Sonnet models manage reasoning effort
      // server-side and can reject sampling parameters; the default keeps
      // output behaviour closest to the OpenRouter path's intent.
    }),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Anthropic request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    content?: { type?: string; text?: string }[];
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
  const text = (data.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
  if (!text) throw new Error('Anthropic returned an empty response.');

  return {
    content: stripJsonFences(text),
    model,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    cacheReadTokens: data.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: data.usage?.cache_creation_input_tokens ?? 0,
  };
}
