// HubRipple client (Phase 5 Slice 3, 2026-11-07) — server-only.
// Talks to the workspace's HubRipple external API with the member's
// workspace key, read from distribution_secrets through the service
// role (that table has no member-readable policies by design). The key
// never leaves the server.

import { createAdminClient } from '@/lib/supabase-admin';

const HUBRIPPLE_BASE = (process.env.HUBRIPPLE_API_BASE || 'https://app.hubripple.com').replace(/\/$/, '');

export type HubRippleConnection = { connectionId: string; apiKey: string };

export async function getHubRippleConnection(organizationId: string): Promise<HubRippleConnection | null> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from('distribution_connections')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'hubripple')
    .eq('status', 'connected')
    .maybeSingle();
  if (!connection) return null;
  const { data: secret } = await admin
    .from('distribution_secrets')
    .select('api_key')
    .eq('connection_id', connection.id)
    .maybeSingle();
  if (!secret?.api_key) return null;
  return { connectionId: connection.id as string, apiKey: secret.api_key as string };
}

export type HubRippleTarget = { platform: string; status: string; post_url: string | null; error: string | null };
export type HubRipplePost = {
  id: string;
  status: string;
  scheduled_at: string | null;
  external_ref: string | null;
  targets: HubRippleTarget[];
};

async function hubRippleFetch(apiKey: string, path: string, init?: RequestInit): Promise<HubRipplePost> {
  const res = await fetch(`${HUBRIPPLE_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(60_000),
  });
  const data = (await res.json().catch(() => ({}))) as { post?: HubRipplePost; error?: string };
  if (!res.ok || !data.post) {
    throw new Error(data.error ? `hubripple_${data.error}` : `hubripple_http_${res.status}`);
  }
  return data.post;
}

export async function createHubRipplePost(
  apiKey: string,
  input: { caption: string; platforms: string[]; mediaUrl?: string | null; scheduledAt?: string | null; externalRef: string },
): Promise<HubRipplePost> {
  return hubRippleFetch(apiKey, '/api/v1/posts', {
    method: 'POST',
    body: JSON.stringify({
      caption: input.caption,
      platforms: input.platforms,
      media_url: input.mediaUrl ?? undefined,
      mode: input.scheduledAt ? 'schedule' : 'now',
      scheduled_at: input.scheduledAt ?? undefined,
      external_ref: input.externalRef,
    }),
  });
}

export async function getHubRipplePost(apiKey: string, postId: string): Promise<HubRipplePost> {
  return hubRippleFetch(apiKey, `/api/v1/posts/${encodeURIComponent(postId)}`);
}

export type HubRippleAccountAnalytics = {
  platform: string;
  handle: string | null;
  available: boolean;
  metrics: Record<'followers' | 'views' | 'likes' | 'comments' | 'shares' | 'reach' | 'impressions', number | null>;
};

// Account-level native stats (Phase 6 Slice B). These are per-ACCOUNT
// aggregates from the platforms via HubRipple — deliberately kept apart
// from the per-publication click truth. Cached in-process for 3 hours:
// platform stats move slowly and the Analytics page is read often.
const analyticsCache = new Map<string, { at: number; data: HubRippleAccountAnalytics[] }>();
const ANALYTICS_TTL_MS = 3 * 60 * 60 * 1000;

export async function getHubRippleAnalytics(
  connection: HubRippleConnection,
  days: 7 | 30,
): Promise<HubRippleAccountAnalytics[] | null> {
  const cacheKey = `${connection.connectionId}:${days}`;
  const cached = analyticsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < ANALYTICS_TTL_MS) return cached.data;
  try {
    // Own fetch, not hubRippleFetch: that helper is post-shaped (it
    // requires a `post` field in the response) — the analytics payload
    // is { days, accounts } and would be thrown away. (Bug found live
    // 2026-11-08: endpoint returned 200s, the panel stayed hidden.)
    const res = await fetch(`${HUBRIPPLE_BASE}/api/v1/analytics?days=${days}`, {
      headers: { Authorization: `Bearer ${connection.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const result = (await res.json().catch(() => null)) as { accounts?: HubRippleAccountAnalytics[] } | null;
    const accounts = result?.accounts ?? [];
    analyticsCache.set(cacheKey, { at: Date.now(), data: accounts });
    return accounts;
  } catch {
    return null;
  }
}
