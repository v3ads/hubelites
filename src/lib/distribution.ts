// Distribution helpers (Phase 5 Slice 2, 2026-11-07) — pure logic for
// the Distribute panel: which platforms an asset can go to, and how the
// published caption is composed (asset words + the tracked link last,
// so the CTA is always the final line).

export type PlatformId = 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'linkedin' | 'x' | 'threads';

export const PLATFORMS: { id: PlatformId; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'threads', label: 'Threads' },
];

const VIDEO_PLATFORMS: PlatformId[] = ['youtube', 'instagram', 'tiktok', 'facebook'];
const IMAGE_PLATFORMS: PlatformId[] = ['instagram', 'facebook', 'linkedin', 'x', 'threads'];
const TEXT_PLATFORMS: PlatformId[] = ['facebook', 'linkedin', 'x', 'threads'];

/**
 * Platforms an asset can be published to. Video/image assets fit the
 * visual channels; text-only assets fit the text channels (Instagram,
 * TikTok and YouTube require media, so they're excluded).
 */
export function platformsForAsset(assetType: string, hasMedia: boolean): PlatformId[] {
  if (assetType === 'video' || (assetType === 'script' && hasMedia)) return VIDEO_PLATFORMS;
  if (assetType === 'image' || assetType === 'carousel') return IMAGE_PLATFORMS;
  if (hasMedia) return IMAGE_PLATFORMS;
  return TEXT_PLATFORMS;
}

export function isPlatformId(value: string): value is PlatformId {
  return PLATFORMS.some((platform) => platform.id === value);
}

/** Asset words with the tracked link appended as the final line. */
export function composeCaption(body: string, trackedUrl: string): string {
  const text = (body ?? '').trim();
  if (!text) return trackedUrl;
  if (text.includes(trackedUrl)) return text;
  return `${text}\n\n${trackedUrl}`;
}
