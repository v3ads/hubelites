// HeyGen v3 adapter — scripted avatar videos (docs checked 2026-11-06:
// developers.heygen.com — v1/v2 sunset Oct 31 2026, v3 only).
// Auth: X-Api-Key header, key billed to the standalone API wallet.
// Create: POST /v3/videos {type:"avatar", avatar_id, script, voice_id} →
// data.video_id. Poll: GET /v3/videos/{id} → status pending|processing|
// completed|failed with video_url / thumbnail_url / duration on completion.
// NOTE: result URLs are presigned and expire — always re-fetch for display.

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

type Look = { id: string; engines: string[] };
let cachedLook: Look | null = null;
let cachedVoiceId: string | null = null;

/** First public avatar look that supports Avatar III; else the first look. */
async function pickLook(): Promise<Look> {
  if (cachedLook) return cachedLook;
  const data = await heygenFetch('/v3/avatars/looks?ownership=public&limit=50');
  const raw = (data.looks ?? data.items ?? data) as unknown;
  const looks = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
  const parsed: Look[] = looks
    .map((look) => ({
      id: String(look.id ?? look.look_id ?? ''),
      engines: Array.isArray(look.supported_api_engines) ? (look.supported_api_engines as string[]) : [],
    }))
    .filter((look) => look.id);
  if (!parsed.length) throw new Error('HeyGen returned no public avatars to render with.');
  cachedLook = parsed.find((look) => look.engines.includes('avatar_iii')) ?? parsed[0];
  return cachedLook;
}

/** First English voice from the HeyGen voice catalog. */
async function pickVoice(): Promise<string> {
  if (cachedVoiceId) return cachedVoiceId;
  const data = await heygenFetch('/v3/models/audio/voices?limit=100');
  const raw = (data.voices ?? data.items ?? data) as unknown;
  const voices = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
  const parsed = voices
    .map((voice) => ({
      id: String(voice.voice_id ?? voice.id ?? ''),
      locale: String(voice.locale ?? voice.language ?? ''),
    }))
    .filter((voice) => voice.id);
  if (!parsed.length) throw new Error('HeyGen returned no voices to render with.');
  cachedVoiceId = (parsed.find((voice) => /en[-_]/i.test(voice.locale)) ?? parsed[0]).id;
  return cachedVoiceId;
}

export type HeygenVideo = {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  failureMessage: string | null;
};

export async function createAvatarVideo(input: { script: string; title: string }): Promise<{ videoId: string; engine: string }> {
  const [look, voiceId] = await Promise.all([pickLook(), pickVoice()]);
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
  return { videoId, engine };
}

export async function getAvatarVideo(videoId: string): Promise<HeygenVideo> {
  const data = await heygenFetch(`/v3/videos/${videoId}`);
  const status = String(data.status ?? 'processing') as HeygenVideo['status'];
  return {
    status,
    videoUrl: (data.video_url as string) ?? null,
    thumbnailUrl: (data.thumbnail_url as string) ?? null,
    durationSeconds: typeof data.duration === 'number' ? data.duration : null,
    failureMessage: (data.failure_message as string) ?? null,
  };
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
