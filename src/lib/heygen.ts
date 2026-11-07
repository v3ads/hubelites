// HeyGen v3 adapter — scripted avatar videos (docs checked 2026-11-06:
// developers.heygen.com — v1/v2 sunset Oct 31 2026, v3 only).
// Auth: X-Api-Key header, key billed to the standalone API wallet.
// Create: POST /v3/videos {type:"avatar", avatar_id, script, voice_id} →
// data.video_id. Poll: GET /v3/videos/{id} → status pending|processing|
// completed|failed with video_url / thumbnail_url / duration — and, on
// completion, the rendered width/height (used by the format check in
// media-jobs.ts before anything is charged).
// NOTE: result URLs are presigned and expire — always re-fetch for display.
//
// Avatar + voice are chosen as a PAIR, never independently (2026-11-06
// audit: the first test video paired an arbitrary avatar with an
// arbitrary English voice and the result did not match). Selection is
// tiered (Route A, 2026-11-07 — pure logic in avatar-selection.ts):
//   Tier 1: portrait-capable looks — portrait-declared looks, plus
//     Avatar IV / photo-avatar looks (they render to the requested
//     dimensions instead of carrying a fixed landscape scene);
//   Tier 2: looks declaring no orientation at all — one attempt is safe
//     because media-jobs.ts verifies the rendered shape before charging;
//   Tier 3: every look declares landscape → stop before any spend.
// Within a tier: a curated pair below, then the look's OWN default
// voice (HeyGen pairs them), then a gender-matched English voice.

import { parseMp4Dimensions, type Mp4Dimensions } from '@/lib/mp4';
import {
  normalizeLook,
  normalizeVoice,
  preferredEngine,
  selectAvatarVoicePair,
  type AvatarLook,
  type AvatarVoice,
} from '@/lib/avatar-selection';

const BASE = 'https://api.heygen.com';

export function heygenConfigured(): boolean {
  return Boolean(process.env.HEYGEN_API_KEY);
}

function headers() {
  return {
    'X-Api-Key': process.env.HEYGEN_API_KEY ?? '',
    'Content-Type': 'application/json',
  };
}

async function heygenFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      (data as { error?: { message?: string } }).error?.message ||
      (data as { message?: string }).message ||
      `HeyGen request failed (${response.status}).`;
    throw new Error(message);
  }
  return (data.data ?? data) as Record<string, unknown>;
}

/**
 * Pinned avatar+voice pairs, checked before any automatic pairing.
 * Add an entry when a specific presenter is vetted by hand: the avatar
 * id is a look id from GET /v3/avatars/looks and the voice id its
 * matched voice from GET /v3/models/audio/voices. Entries whose avatar
 * is not live (or not in the selected portrait tier) are ignored.
 */
export const CURATED_AVATAR_VOICE_PAIRS: Array<{ avatarId: string; voiceId: string; note: string }> = [
  // No hand-vetted presenter pinned yet — automatic pairing below uses
  // each look's own default voice first, which is HeyGen's own pairing.
];

let cachedPair: { look: AvatarLook; voiceId: string; pairing: string } | null = null;
let cachedVoices: AvatarVoice[] | null = null;

async function fetchLooks(): Promise<AvatarLook[]> {
  // HeyGen caps this endpoint's page size at 50 (docs: limit 1–50).
  // Asking for 100 is rejected with "Input should be less than or equal
  // to 50" before any render starts — the regression that broke the
  // 2026-11-06 proof run. Do not raise this.
  const data = await heygenFetch('/v3/avatars/looks?ownership=public&limit=50');
  const raw = (data.looks ?? data.items ?? data) as unknown;
  const looks = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
  return looks
    .map((look) => normalizeLook(look))
    .filter((look): look is AvatarLook => look !== null);
}

async function fetchVoices(): Promise<AvatarVoice[]> {
  if (cachedVoices) return cachedVoices;
  const data = await heygenFetch('/v3/models/audio/voices?limit=100');
  const raw = (data.voices ?? data.items ?? data) as unknown;
  const voices = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
  cachedVoices = voices
    .map((voice) => normalizeVoice(voice))
    .filter((voice): voice is AvatarVoice => voice !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
  return cachedVoices;
}

/**
 * Choose the avatar + voice pair for a portrait Short. The tier and
 * pairing rules live in avatar-selection.ts (pure, unit-tested); this
 * wrapper only fetches the catalogs — voices lazily, only when the
 * selection falls through to the gender-matched rule.
 */
async function pickAvatarVoicePair(): Promise<{ look: AvatarLook; voiceId: string; pairing: string }> {
  if (cachedPair) return cachedPair;
  const looks = await fetchLooks();
  let selection = selectAvatarVoicePair(looks, null, CURATED_AVATAR_VOICE_PAIRS);
  if (selection.kind === 'needs-voices') {
    selection = selectAvatarVoicePair(looks, await fetchVoices(), CURATED_AVATAR_VOICE_PAIRS);
  }
  if (selection.kind !== 'pair') throw new Error('HeyGen returned no voices to render with.');
  cachedPair = { look: selection.look, voiceId: selection.voiceId, pairing: selection.pairing };
  return cachedPair;
}

export type HeygenVideo = {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  failureMessage: string | null;
};

export async function createAvatarVideo(input: { script: string; title: string }): Promise<{
  videoId: string;
  engine: string;
  avatarId: string;
  voiceId: string;
  pairing: string;
}> {
  const { look, voiceId, pairing } = await pickAvatarVoicePair();
  const engine = preferredEngine(look);
  const data = await heygenFetch('/v3/videos', {
    method: 'POST',
    body: JSON.stringify({
      type: 'avatar',
      avatar_id: look.id,
      script: input.script,
      voice_id: voiceId,
      title: input.title.slice(0, 100),
      resolution: '1080p',
      aspect_ratio: '9:16',
      engine: { type: engine },
    }),
  });
  const videoId = String(data.video_id ?? data.id ?? '');
  if (!videoId) throw new Error('HeyGen did not return a video id.');
  return { videoId, engine, avatarId: look.id, voiceId, pairing };
}

function parseDimension(data: Record<string, unknown>, key: 'width' | 'height'): number | null {
  const direct = data[key];
  if (typeof direct === 'number' && direct > 0) return direct;
  const dimension = data.dimension as Record<string, unknown> | undefined;
  const nested = dimension?.[key];
  return typeof nested === 'number' && nested > 0 ? nested : null;
}

export async function getAvatarVideo(videoId: string): Promise<HeygenVideo> {
  const data = await heygenFetch(`/v3/videos/${videoId}`);
  const status = String(data.status ?? 'processing') as HeygenVideo['status'];
  return {
    status,
    videoUrl: (data.video_url as string) ?? null,
    thumbnailUrl: (data.thumbnail_url as string) ?? null,
    durationSeconds: typeof data.duration === 'number' ? data.duration : null,
    width: parseDimension(data, 'width'),
    height: parseDimension(data, 'height'),
    failureMessage: (data.failure_message as string) ?? null,
  };
}

/**
 * Fallback dimension probe for when the video detail omits width/height:
 * download the MP4 and read its track header. Returns null when the file
 * cannot be read or parsed — callers must treat null as "unconfirmed",
 * never as success.
 */
export async function fetchVideoDimensions(videoUrl: string): Promise<Mp4Dimensions | null> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    return parseMp4Dimensions(buffer);
  } catch {
    return null;
  }
}

/** Lightweight key check for the admin health panel: GET /v3/users/me. */
export async function heygenPing(): Promise<boolean> {
  try {
    await heygenFetch('/v3/users/me');
    return true;
  } catch {
    return false;
  }
}
