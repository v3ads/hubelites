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
