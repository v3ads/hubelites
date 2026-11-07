// Tracked links (Phase 5 Slice 1, 2026-11-07) — pure helpers for the
// /r/<slug> redirector. Every publication owns one slug; the route logs
// the click (Phase 6's raw material) and redirects to the ambassador's
// own Mission 1000 destination with UTM attribution appended.

import { randomBytes } from 'node:crypto';

const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes

export function newLinkSlug(): string {
  const bytes = randomBytes(9);
  let slug = '';
  for (let i = 0; i < 9; i += 1) slug += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return slug;
}

export function isLinkSlug(value: string): boolean {
  return /^[a-z2-9]{6,24}$/.test(value);
}

/**
 * The destination with HubElites attribution appended. Existing query
 * parameters survive; our UTM keys win on collision so a shared link
 * can't be re-attributed. Unparseable destinations pass through as-is —
 * a redirect must never fail because the target was odd.
 */
export function buildTrackedDestination(destinationUrl: string, slug: string): string {
  try {
    const url = new URL(destinationUrl);
    url.searchParams.set('utm_source', 'hubelites');
    url.searchParams.set('utm_medium', 'social');
    url.searchParams.set('utm_campaign', slug);
    return url.toString();
  } catch {
    return destinationUrl;
  }
}
