// Higgsfield API adapter — Soul V2 text-to-image (docs checked 2026-11-06:
// docs.higgsfield.ai/docs/models/soul-2/generate). Auth is a key PAIR:
// hf-api-key (key id) + hf-secret headers, billed to the API USD balance.
// Submit: POST /higgsfield-ai/soul/v2/standard → request handle with a
// status_url to poll until status=completed. Only successful generations
// are charged by the provider.

const BASE = 'https://api.higgsfield.ai';

export function higgsfieldConfigured(): boolean {
  return Boolean(process.env.HIGGSFIELD_API_KEY_ID && process.env.HIGGSFIELD_API_SECRET);
}

function headers() {
  return {
    'hf-api-key': process.env.HIGGSFIELD_API_KEY_ID ?? '',
    'hf-secret': process.env.HIGGSFIELD_API_SECRET ?? '',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

type Json = Record<string, unknown>;

function dig(value: unknown, path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (current && typeof current === 'object' && key in (current as Json)) {
      current = (current as Json)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function firstImageUrl(payload: unknown): string | null {
  const candidates: unknown[] = [
    dig(payload, ['images', '0', 'url']),
    dig(payload, ['data', 'images', '0', 'url']),
    dig(payload, ['output', 'images', '0', 'url']),
    dig(payload, ['result', 'images', '0', 'url']),
    dig(payload, ['images', '0']),
    dig(payload, ['data', 'image_url']),
    dig(payload, ['image_url']),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('http')) return candidate;
  }
  return null;
}

export async function submitSoulImage(input: { prompt: string }): Promise<{ requestId: string; statusUrl: string }> {
  const response = await fetch(`${BASE}/higgsfield-ai/soul/v2/standard`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      prompt: input.prompt,
      aspect_ratio: '3:4',
      resolution: '720p',
      batch_size: 1,
      enhance_prompt: false,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as Json;
  if (!response.ok) {
    throw new Error(
      (dig(payload, ['detail']) as string) ||
        (dig(payload, ['message']) as string) ||
        `Higgsfield submit failed (${response.status}).`,
    );
  }
  const requestId = String(dig(payload, ['request_id']) ?? dig(payload, ['id']) ?? dig(payload, ['data', 'request_id']) ?? '');
  const statusUrl = String(
    dig(payload, ['status_url']) ?? dig(payload, ['data', 'status_url']) ?? `${BASE}/requests/${requestId}/status`,
  );
  if (!requestId && !statusUrl) throw new Error('Higgsfield did not return a request handle.');
  return { requestId, statusUrl };
}

export type SoulImageStatus = {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  imageUrl: string | null;
  failureMessage: string | null;
};

export async function pollSoulImage(statusUrl: string): Promise<SoulImageStatus> {
  const response = await fetch(statusUrl, { headers: headers() });
  const payload = (await response.json().catch(() => ({}))) as Json;
  if (!response.ok) {
    throw new Error(`Higgsfield status check failed (${response.status}).`);
  }
  const raw = String(dig(payload, ['status']) ?? dig(payload, ['data', 'status']) ?? 'processing').toLowerCase();
  const status: SoulImageStatus['status'] =
    raw === 'completed' ? 'completed' : raw === 'failed' || raw === 'nsfw' ? 'failed' : raw === 'queued' ? 'queued' : 'processing';
  return {
    status,
    imageUrl: status === 'completed' ? firstImageUrl(payload) : null,
    failureMessage:
      (dig(payload, ['error']) as string) ?? (dig(payload, ['failure_message']) as string) ?? (status === 'failed' ? `Generation ended with status ${raw}.` : null),
  };
}

/** Lightweight key check for the admin health panel: the Soul styles list is authenticated and free. */
export async function higgsfieldPing(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE}/v1/text2image/soul-styles/v2`, { headers: headers() });
    return response.ok;
  } catch {
    return false;
  }
}
