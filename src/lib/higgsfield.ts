// Higgsfield API adapter — Soul V2 text-to-image.
// Higgsfield credentials come in several shapes across its console
// generations (all verified against vendor material on 2026-11-06):
//  - a key-id + secret pair: `Authorization: Key <id>:<secret>` — the
//    current documented scheme; the legacy hf-api-key / hf-secret headers
//    are also accepted;
//  - the same pair issued as ONE combined "id:secret" string (the Python
//    client's "single key" form), pasted whole into HIGGSFIELD_API_KEY;
//  - a plain single key: `Authorization: Bearer <key>` (JS client form).
// The adapter splits a combined string when it sees one, then resolves
// whichever header shape a free authenticated endpoint accepts, and
// caches the winner.

const BASE = 'https://api.higgsfield.ai';

export function higgsfieldConfigured(): boolean {
  return Boolean(
    process.env.HIGGSFIELD_API_KEY ||
      (process.env.HIGGSFIELD_API_KEY_ID && process.env.HIGGSFIELD_API_SECRET),
  );
}

type HeaderSet = Record<string, string>;

function credentialPair(): { id: string; secret: string } | null {
  if (process.env.HIGGSFIELD_API_KEY_ID && process.env.HIGGSFIELD_API_SECRET) {
    return { id: process.env.HIGGSFIELD_API_KEY_ID, secret: process.env.HIGGSFIELD_API_SECRET };
  }
  const combined = process.env.HIGGSFIELD_API_KEY ?? '';
  const colon = combined.indexOf(':');
  if (colon > 0) {
    return { id: combined.slice(0, colon), secret: combined.slice(colon + 1) };
  }
  return null;
}

function authCandidates(): HeaderSet[] {
  const candidates: HeaderSet[] = [];
  const pair = credentialPair();
  if (pair) {
    candidates.push({ Authorization: `Key ${pair.id}:${pair.secret}` });
    candidates.push({ 'hf-api-key': pair.id, 'hf-secret': pair.secret });
  }
  if (process.env.HIGGSFIELD_API_KEY && !process.env.HIGGSFIELD_API_KEY.includes(':')) {
    candidates.push({ Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}` });
    candidates.push({ Authorization: `Key ${process.env.HIGGSFIELD_API_KEY}` });
  }
  return candidates;
}

let verifiedAuth: HeaderSet | null | undefined;

/** First candidate the free styles endpoint accepts; null when none verify. */
async function resolveVerifiedAuth(): Promise<HeaderSet | null> {
  if (verifiedAuth !== undefined) return verifiedAuth;
  for (const candidate of authCandidates()) {
    if (await verifyAuth(candidate)) {
      verifiedAuth = candidate;
      return candidate;
    }
  }
  verifiedAuth = null;
  return null;
}

async function authHeaders(): Promise<HeaderSet> {
  const verified = await resolveVerifiedAuth();
  if (verified) return verified;
  // Styles endpoint unverified (it may have moved) — still attempt the
  // first configured shape so the submit call can surface the real error.
  return authCandidates()[0] ?? {};
}

async function headers(): Promise<HeaderSet> {
  return { ...(await authHeaders()), 'Content-Type': 'application/json', Accept: 'application/json' };
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
    headers: await headers(),
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
  const response = await fetch(statusUrl, { headers: await headers() });
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

const VERIFY_PATHS = ['/v1/text2image/soul-styles/v2', '/models/higgsfield/genjutsu/restyle/v1.0/presets'];

async function verifyAuth(auth: HeaderSet): Promise<boolean> {
  for (const path of VERIFY_PATHS) {
    try {
      const response = await fetch(`${BASE}${path}`, {
        headers: { ...auth, Accept: 'application/json' },
      });
      if (response.ok) return true;
    } catch {
      // try the next probe
    }
  }
  return false;
}

/** Health = the configured credential answers a free authenticated call. */
export async function higgsfieldPing(): Promise<boolean> {
  if (!higgsfieldConfigured()) return false;
  return (await resolveVerifiedAuth()) !== null;
}
