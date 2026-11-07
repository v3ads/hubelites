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
// tiered on the look source's MEASURED shape (Route A round 2,
// 2026-11-07 — pure logic in avatar-selection.ts): every look's
// preview image is probed for its real dimensions below, because
// neither declared orientation nor the Avatar IV engine guarantees a
// full-frame portrait — HeyGen animates the source's own framing and
// pads the rest (the failed proof render measured 1080×1920 with the
// picture in the middle third only).
//   Tier 1: preview image measured portrait;
//   Tier 2: declared-portrait signals (orientation metadata, photo
//     avatar) with unmeasured shape;
//   Tier 3: no signal at all;
//   measured/declared landscape or square: never eligible, and if that
//     is the whole catalog, selection stops before any spend.
// Within a tier: a curated pair below, then the look's OWN default
// voice (HeyGen pairs them), then a gender-matched English voice.

import { parseMp4Dimensions, type Mp4Dimensions } from '@/lib/mp4';
import { parseImageDimensions } from '@/lib/image-size';
import {
  classifyLook,
  normalizeLook,
  normalizeVoice,
  preferredEngine,
  selectAvatarVoicePair,
  shapeBasis,
  withProbedDims,
  type AvatarLook,
  type AvatarVoice,
  type SelectionTier,
  type ShapeBasis,
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

let cachedPair: {
  look: AvatarLook;
  voiceId: string;
  pairing: string;
  tier: SelectionTier;
  basis: ShapeBasis;
  presenterKey: string;
} | null = null;
let cachedVoices: AvatarVoice[] | null = null;
let cachedLooks: AvatarLook[] | null = null;

// ---------------------------------------------------------------------------
// Preview-image probing: measure each look's source shape once per
// catalog fill. A probe downloads at most PROBE_MAX_BYTES (headers are
// parsed incrementally, so it usually stops after the first chunks),
// gives up after ~3s, and NEVER throws — a failed or absent probe just
// leaves the look's shape 'unknown' and selection falls back to its
// declared signals. Results are cached per URL for the process, so a
// catalog re-fill does not re-probe.
// ---------------------------------------------------------------------------

const PROBE_TIMEOUT_MS = 3000;
const PROBE_MAX_BYTES = 512 * 1024;
const PROBE_CONCURRENCY = 8;
const probedDimsByUrl = new Map<string, Mp4Dimensions | null>();

async function probeImageDimensions(url: string): Promise<Mp4Dimensions | null> {
  const cached = probedDimsByUrl.get(url);
  if (cached !== undefined) return cached;
  let dims: Mp4Dimensions | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (total < PROBE_MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          total += value.length;
          const merged = new Uint8Array(total);
          let at = 0;
          for (const chunk of chunks) {
            merged.set(chunk, at);
            at += chunk.length;
          }
          dims = parseImageDimensions(merged);
          if (dims) {
            await reader.cancel().catch(() => undefined);
            break;
          }
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    dims = null;
  }
  probedDimsByUrl.set(url, dims);
  return dims;
}

async function fetchLooks(): Promise<AvatarLook[]> {
  if (cachedLooks) return cachedLooks;
  // HeyGen caps this endpoint's page size at 50 (docs: limit 1–50).
  // Asking for 100 is rejected with "Input should be less than or equal
  // to 50" before any render starts — the regression that broke the
  // 2026-11-06 proof run. Do not raise this.
  // Both ownership lists are fetched: the public catalog AND the
  // account's own avatars (2026-11-07: the platform presenter is an
  // account-owned prompt avatar — invisible to the public list). A
  // failed private fetch degrades to the public catalog alone.
  const [publicData, privateData] = await Promise.all([
    heygenFetch('/v3/avatars/looks?ownership=public&limit=50'),
    heygenFetch('/v3/avatars/looks?ownership=private&limit=50').catch(() => null),
  ]);
  const rawLooks = (data: Record<string, unknown> | null): Array<Record<string, unknown>> => {
    if (!data) return [];
    const raw = (data.looks ?? data.items ?? data) as unknown;
    return (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
  };
  const seen = new Set<string>();
  const looks = [...rawLooks(publicData), ...rawLooks(privateData)].filter((look) => {
    const id = String(look.id ?? look.look_id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const normalized = looks
    .map((look) => normalizeLook(look))
    .filter((look): look is AvatarLook => look !== null);

  const enriched: AvatarLook[] = new Array(normalized.length);
  for (let i = 0; i < normalized.length; i += PROBE_CONCURRENCY) {
    const batch = normalized.slice(i, i + PROBE_CONCURRENCY);
    await Promise.all(
      batch.map(async (look, j) => {
        const dims = look.previewUrl ? await probeImageDimensions(look.previewUrl) : null;
        enriched[i + j] = withProbedDims(look, dims);
      }),
    );
  }
  cachedLooks = enriched;
  return cachedLooks;
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
 *
 * PRESENTER PIN (2026-11-07): when a platform presenter look id is
 * configured (media_provider_catalog config, set on /admin/presenter),
 * it wins over every automatic rule. The first unpinned proof proved
 * why: an unvetted PUBLIC look that probed portrait (720×1280) with
 * its own default voice out-ranked the platform's own presenter in
 * tier 1 and rendered a face-cropped close-up that passed the padding
 * gate. Automatic selection is a fallback for "no presenter yet", not
 * a peer of the pinned presenter. The presenter's voice is its own
 * default voice when it has one, else the gender-matched rule.
 */
async function pickAvatarVoicePair(presenterLookId?: string | null): Promise<{
  look: AvatarLook;
  voiceId: string;
  pairing: string;
  tier: SelectionTier;
  basis: ShapeBasis;
}> {
  const presenterKey = presenterLookId ?? '';
  if (cachedPair && cachedPair.presenterKey === presenterKey) return cachedPair;
  const looks = await fetchLooks();

  if (presenterLookId) {
    const presenter = looks.find((look) => look.id === presenterLookId);
    const tier = presenter ? classifyLook(presenter) : 0;
    if (presenter && tier !== 0) {
      const basis = shapeBasis(presenter, tier);
      let voiceId = presenter.defaultVoiceId;
      let pairing = `presenter:look-default-voice:${basis}`;
      if (!voiceId) {
        const voices = await fetchVoices();
        if (!voices.length) throw new Error('HeyGen returned no voices to render with.');
        const english = voices.filter((voice) => /en[-_]/i.test(voice.locale));
        const pool = english.length ? english : voices;
        // The presenter's persona is a woman (the vetted creation
        // prompt defines her), and her look payload carries no gender —
        // so when she has no default voice, match FEMALE voices rather
        // than taking the pool's first voice blind: the first unpinned
        // proof paired her with a male voice exactly that way
        // (2026-11-07, Ayman caught it by ear).
        const matchGender = presenter.gender ?? 'female';
        const genderMatch = pool.find((voice) => voice.gender === matchGender);
        const voice = genderMatch ?? pool[0];
        voiceId = voice.id;
        pairing = `presenter:${genderMatch ? 'gender-matched-voice' : 'first-english-voice'}:${basis}`;
      }
      cachedPair = { look: presenter, voiceId, pairing, tier, basis, presenterKey };
      return cachedPair;
    }
    // A configured presenter that is missing or measured non-portrait
    // falls through to automatic selection (which stops pre-spend when
    // nothing eligible exists) rather than rendering the wrong shape.
  }

  let selection = selectAvatarVoicePair(looks, null, CURATED_AVATAR_VOICE_PAIRS);
  if (selection.kind === 'needs-voices') {
    selection = selectAvatarVoicePair(looks, await fetchVoices(), CURATED_AVATAR_VOICE_PAIRS);
  }
  if (selection.kind !== 'pair') throw new Error('HeyGen returned no voices to render with.');
  cachedPair = {
    look: selection.look,
    voiceId: selection.voiceId,
    pairing: selection.pairing,
    tier: selection.tier,
    basis: selection.basis,
    presenterKey,
  };
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

export async function createAvatarVideo(input: { script: string; title: string; presenterLookId?: string | null }): Promise<{
  videoId: string;
  engine: string;
  avatarId: string;
  voiceId: string;
  pairing: string;
  /** Census of the chosen look's shape evidence, recorded on the job. */
  source: {
    probedWidth: number | null;
    probedHeight: number | null;
    sourceShape: AvatarLook['sourceShape'];
    tier: SelectionTier;
    basis: ShapeBasis;
  };
}> {
  const { look, voiceId, pairing, tier, basis } = await pickAvatarVoicePair(input.presenterLookId);
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
  return {
    videoId,
    engine,
    avatarId: look.id,
    voiceId,
    pairing,
    source: {
      probedWidth: look.probedDims?.width ?? null,
      probedHeight: look.probedDims?.height ?? null,
      sourceShape: look.sourceShape,
      tier,
      basis,
    },
  };
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

// ---------------------------------------------------------------------------
// Presenter creation (2026-11-07): the public catalog holds NO
// measured-portrait avatar (final census), so the platform presenter is
// an account-owned avatar generated from a text prompt — HeyGen's
// "prompt" type depicts no real person, needs no consent step, and
// accepts aspect_ratio 9:16 so the source itself is natively portrait.
// Creation is asynchronous: poll getAvatarLook until status completes.
// ---------------------------------------------------------------------------

export type AvatarLookDetail = {
  id: string;
  status: string;
  previewImageUrl: string | null;
  defaultVoiceId: string | null;
  gender: string | null;
  width: number | null;
  height: number | null;
  engines: string[];
};

function parseLookDetail(item: Record<string, unknown>): AvatarLookDetail {
  return {
    id: String(item.id ?? item.look_id ?? ''),
    status: String(item.status ?? 'processing'),
    previewImageUrl: typeof item.preview_image_url === 'string' ? item.preview_image_url : null,
    defaultVoiceId: typeof item.default_voice_id === 'string' ? item.default_voice_id : null,
    gender: typeof item.gender === 'string' ? item.gender : null,
    width: typeof item.image_width === 'number' ? item.image_width : null,
    height: typeof item.image_height === 'number' ? item.image_height : null,
    engines: Array.isArray(item.supported_api_engines) ? (item.supported_api_engines as string[]) : [],
  };
}

export async function createPromptAvatar(input: { name: string; prompt: string }): Promise<AvatarLookDetail> {
  const data = await heygenFetch('/v3/avatars', {
    method: 'POST',
    body: JSON.stringify({ type: 'prompt', name: input.name, prompt: input.prompt, aspect_ratio: '9:16' }),
  });
  const item = (data.avatar_item ?? data) as Record<string, unknown>;
  const detail = parseLookDetail(item);
  if (!detail.id) throw new Error('HeyGen did not return an avatar id for the new presenter.');
  return detail;
}

export async function getAvatarLook(lookId: string): Promise<AvatarLookDetail> {
  const data = await heygenFetch(`/v3/avatars/looks/${lookId}`);
  return parseLookDetail((data.avatar_item ?? data) as Record<string, unknown>);
}
