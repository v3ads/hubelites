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
// arbitrary English voice and the result did not match). Preference:
//   1. a curated pair below whose avatar is live and portrait-native;
//   2. a portrait-native look's OWN default voice (HeyGen pairs them);
//   3. a gender-matched English voice for the look's persona.
// Only portrait-native looks are eligible for 9:16 Shorts: a landscape
// look gets padded into the portrait canvas by HeyGen (the letterbox
// the audit caught), so when the catalog says which looks are portrait
// we never pick a landscape one. The rendered output is verified again
// in media-jobs.ts before the job can succeed or charge.

import { parseMp4Dimensions, type Mp4Dimensions } from '@/lib/mp4';

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
 * is not live (or not portrait-native) are ignored.
 */
export const CURATED_AVATAR_VOICE_PAIRS: Array<{ avatarId: string; voiceId: string; note: string }> = [
  // No hand-vetted presenter pinned yet — automatic pairing below uses
  // each look's own default voice first, which is HeyGen's own pairing.
];

type Look = {
  id: string;
  engines: string[];
  orientation: 'portrait' | 'landscape' | null;
  defaultVoiceId: string | null;
  gender: string | null;
};

type Voice = { id: string; locale: string; gender: string | null };

function parseOrientation(look: Record<string, unknown>): Look['orientation'] {
  const declared = String(look.preferred_orientation ?? look.orientation ?? '').toLowerCase();
  if (declared.includes('portrait') || declared.includes('vertical')) return 'portrait';
  if (declared.includes('landscape') || declared.includes('horizontal')) return 'landscape';
  const width = typeof look.width === 'number' ? look.width : null;
  const height = typeof look.height === 'number' ? look.height : null;
  if (width && height) return height > width ? 'portrait' : 'landscape';
  return null;
}

function parseDefaultVoiceId(look: Record<string, unknown>): string | null {
  const direct = look.default_voice_id ?? look.voice_id;
  if (typeof direct === 'string' && direct) return direct;
  const nested = look.default_voice as { id?: unknown; voice_id?: unknown } | undefined;
  const nestedId = nested?.id ?? nested?.voice_id;
  return typeof nestedId === 'string' && nestedId ? nestedId : null;
}

let cachedPair: { look: Look; voiceId: string; pairing: string } | null = null;
let cachedVoices: Voice[] | null = null;

async function fetchLooks(): Promise<Look[]> {
  const data = await heygenFetch('/v3/avatars/looks?ownership=public&limit=100');
  const raw = (data.looks ?? data.items ?? data) as unknown;
  const looks = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
  return looks
    .map((look) => ({
      id: String(look.id ?? look.look_id ?? ''),
      engines: Array.isArray(look.supported_api_engines) ? (look.supported_api_engines as string[]) : [],
      orientation: parseOrientation(look),
      defaultVoiceId: parseDefaultVoiceId(look),
      gender: typeof look.gender === 'string' ? look.gender.toLowerCase() : null,
    }))
    .filter((look) => look.id);
}

async function fetchVoices(): Promise<Voice[]> {
  if (cachedVoices) return cachedVoices;
  const data = await heygenFetch('/v3/models/audio/voices?limit=100');
  const raw = (data.voices ?? data.items ?? data) as unknown;
  const voices = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
  cachedVoices = voices
    .map((voice) => ({
      id: String(voice.voice_id ?? voice.id ?? ''),
      locale: String(voice.locale ?? voice.language ?? ''),
      gender: typeof voice.gender === 'string' ? voice.gender.toLowerCase() : null,
    }))
    .filter((voice) => voice.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  return cachedVoices;
}

/**
 * Choose the avatar + voice pair for a portrait Short. Deterministic:
 * catalog order never changes the result (candidates are sorted).
 */
async function pickAvatarVoicePair(): Promise<{ look: Look; voiceId: string; pairing: string }> {
  if (cachedPair) return cachedPair;
  const looks = await fetchLooks();
  if (!looks.length) throw new Error('HeyGen returned no public avatars to render with.');

  // Engine preference first (Avatar III pipeline), stable by id.
  const byPreference = [...looks].sort((a, b) => {
    const aScore = a.engines.includes('avatar_iii') ? 0 : 1;
    const bScore = b.engines.includes('avatar_iii') ? 0 : 1;
    return aScore - bScore || a.id.localeCompare(b.id);
  });

  // Portrait integrity: when the catalog declares orientation, only
  // portrait-native looks are eligible — a landscape look is letterboxed
  // into the 9:16 canvas. If every declared look is landscape, fail
  // BEFORE any spend rather than render another padded video.
  const declared = byPreference.filter((look) => look.orientation !== null);
  let eligible = byPreference;
  if (declared.length) {
    eligible = byPreference.filter((look) => look.orientation === 'portrait');
    if (!eligible.length) {
      throw new Error('HeyGen has no portrait-shaped avatar available right now, so the video was not started. Nothing was charged.');
    }
  }

  // 1. A pinned curated pair whose avatar is live and eligible.
  for (const pair of CURATED_AVATAR_VOICE_PAIRS) {
    const look = eligible.find((candidate) => candidate.id === pair.avatarId);
    if (look) {
      cachedPair = { look, voiceId: pair.voiceId, pairing: `curated: ${pair.note}` };
      return cachedPair;
    }
  }

  // 2. The look's own default voice — HeyGen's own pairing for it.
  const withOwnVoice = eligible.find((look) => look.defaultVoiceId);
  if (withOwnVoice) {
    cachedPair = { look: withOwnVoice, voiceId: withOwnVoice.defaultVoiceId as string, pairing: 'avatar default voice' };
    return cachedPair;
  }

  // 3. Gender-matched English voice for the look's persona.
  const look = eligible[0];
  const voices = await fetchVoices();
  if (!voices.length) throw new Error('HeyGen returned no voices to render with.');
  const english = voices.filter((voice) => /en[-_]/i.test(voice.locale));
  const pool = english.length ? english : voices;
  const genderMatch = look.gender ? pool.find((voice) => voice.gender === look.gender) : undefined;
  const voice = genderMatch ?? pool[0];
  cachedPair = { look, voiceId: voice.id, pairing: genderMatch ? 'gender-matched voice' : 'first English voice' };
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
  const engine = look.engines.includes('avatar_iii') ? 'avatar_iii' : 'avatar_iv';
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
