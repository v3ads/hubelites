// Pure avatar + voice selection for HeyGen portrait Shorts (Route A
// round 2, 2026-11-07). Extracted from heygen.ts so the tier logic can
// be unit-tested over fake catalog payloads — no network, no imports.
// (Probing a look's preview image is network work and lives in
// heygen.ts; this module only consumes the probed result.)
//
// Why tiers, and why they changed: Route A's first picker trusted
// shape SIGNALS — a declared orientation, or the Avatar IV engine on
// the theory that photo avatars render to the requested dimensions.
// The 2026-11-07 proof disproved the theory in production: an Avatar
// IV photo look with its own default voice rendered a 1080×1920 file
// whose picture occupied only the middle ~third, padded with flat
// off-white bands. HeyGen animates the SOURCE's own framing (that
// source was landscape) and pads to the canvas. The only trustworthy
// pre-render signal is the source's measured shape, so heygen.ts now
// probes every look's preview image and this module tiers on the
// measurement first:
//
//   Tier 1 — probed-portrait: the preview image itself measured taller
//     than wide. The only tier backed by measurement.
//   Tier 2 — declared-portrait signals with unknown measured shape:
//     orientation metadata says portrait, or the look is an Avatar IV /
//     photo avatar. A claim, not a measurement — the rendered-output
//     gate in media-jobs.ts (file dimensions + a flat-band content
//     check on the render's thumbnail) remains the backstop, and a
//     wrong-shaped render fails the job at zero member cost.
//   Tier 3 — no signal at all: shape unknown, not a photo avatar.
//     Worth one gated attempt for the same reason.
//   Ineligible — measured landscape or square, or declared landscape
//     (when unmeasured). A known non-portrait source is a guaranteed
//     pad; if EVERY look is ineligible, selection throws the
//     plain-language stop below BEFORE any spend.
//
// The recorded pairing string carries the shape basis so one proof run
// shows which evidence the pick stood on, e.g.
// 'look-default-voice:probed-portrait', '…:declared-portrait',
// '…:photo-unprobed', '…:unprobed'.
//
// Within a tier the pairing rules are unchanged (the 2026-11-06 audit:
// avatar and voice are chosen as a PAIR, never independently):
//   1. a pinned curated pair whose avatar is in the tier;
//   2. a look's OWN default voice (HeyGen's own pairing for it);
//   3. a gender-matched English voice for the look's persona.
// Selection is deterministic: candidates are sorted (Avatar III engine
// preference, then id) before any rule runs, so catalog order never
// changes the result.

export type LookOrientation = 'portrait' | 'landscape' | null;

/** The measured shape of a look's source (preview) image. */
export type SourceShape = 'portrait' | 'landscape' | 'square' | 'unknown';

export type ImageDims = { width: number; height: number };

export type AvatarLook = {
  id: string;
  engines: string[];
  /** Orientation the catalog DECLARES (metadata — a claim, not a measurement). */
  orientation: LookOrientation;
  photoAvatar: boolean;
  defaultVoiceId: string | null;
  gender: string | null;
  /** First preview/thumbnail image URL found in the payload, if any. */
  previewUrl: string | null;
  /** Measured preview-image dimensions; null when the probe failed/absent. */
  probedDims: ImageDims | null;
  /** Shape derived from probedDims; 'unknown' until a probe succeeds. */
  sourceShape: SourceShape;
};

export type AvatarVoice = { id: string; locale: string; gender: string | null };

export type CuratedPair = { avatarId: string; voiceId: string; note: string };

export type SelectionTier = 1 | 2 | 3;

/** How the chosen look's shape is evidenced — recorded in the pairing tag. */
export type ShapeBasis = 'probed-portrait' | 'declared-portrait' | 'photo-unprobed' | 'unprobed';

export const NO_PORTRAIT_AVATAR_MESSAGE =
  'HeyGen has no portrait-shaped avatar available right now, so the video was not started. Nothing was charged.';

// ---------------------------------------------------------------------------
// Shape classification.
// ---------------------------------------------------------------------------

export function classifySourceShape(dims: ImageDims | null): SourceShape {
  if (!dims || !dims.width || !dims.height) return 'unknown';
  if (dims.height > dims.width) return 'portrait';
  if (dims.width > dims.height) return 'landscape';
  return 'square';
}

// ---------------------------------------------------------------------------
// Raw catalog payload parsing (defensive: field presence in the live
// payload is not guaranteed — every accessor degrades to "unknown").
// ---------------------------------------------------------------------------

export function parseLookOrientation(look: Record<string, unknown>): LookOrientation {
  const declared = String(look.preferred_orientation ?? look.orientation ?? '').toLowerCase();
  if (declared.includes('portrait') || declared.includes('vertical')) return 'portrait';
  if (declared.includes('landscape') || declared.includes('horizontal')) return 'landscape';
  const width = typeof look.width === 'number' ? look.width : null;
  const height = typeof look.height === 'number' ? look.height : null;
  if (width && height) return height > width ? 'portrait' : 'landscape';
  return null;
}

/**
 * Whether a look is an Avatar IV / photo avatar. Keys on, in the raw
 * payload:
 *   - a type-ish field (type / look_type / avatar_type / kind / category)
 *     whose value mentions "photo" or "avatar_iv" / "avatar iv";
 *   - supported_api_engines including "avatar_iv".
 * NOTE (round 2): this is only a tier-2 signal now. The failed proof
 * render came from a photo avatar whose landscape source was padded to
 * the portrait canvas — the label says nothing about source shape.
 */
export function detectPhotoAvatar(look: Record<string, unknown>): boolean {
  const typeFields = [look.type, look.look_type, look.avatar_type, look.kind, look.category]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase());
  if (typeFields.some((value) => value.includes('photo') || value.includes('avatar_iv') || value.includes('avatar iv'))) {
    return true;
  }
  const engines = Array.isArray(look.supported_api_engines) ? look.supported_api_engines : [];
  return engines.some((engine) => typeof engine === 'string' && engine.toLowerCase() === 'avatar_iv');
}

export function parseLookDefaultVoiceId(look: Record<string, unknown>): string | null {
  const direct = look.default_voice_id ?? look.voice_id;
  if (typeof direct === 'string' && direct) return direct;
  const nested = look.default_voice as { id?: unknown; voice_id?: unknown } | undefined;
  const nestedId = nested?.id ?? nested?.voice_id;
  return typeof nestedId === 'string' && nestedId ? nestedId : null;
}

const PREVIEW_URL_FIELDS = [
  'preview_image_url',
  'preview_url',
  'image_url',
  'thumbnail_url',
  'preview_image',
  'image',
  'thumbnail',
  'avatar_image_url',
  'cover_image_url',
  'cover_url',
] as const;

function httpUrl(value: unknown): string | null {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;
}

/**
 * The look's preview/thumbnail image URL — the probe target whose real
 * dimensions reveal the source's shape. Field naming varies across
 * HeyGen payload versions, so check the plausible names (flat string
 * fields first, then a nested object's url).
 */
export function parseLookPreviewUrl(look: Record<string, unknown>): string | null {
  for (const field of PREVIEW_URL_FIELDS) {
    const url = httpUrl(look[field]);
    if (url) return url;
    const nested = look[field] as { url?: unknown } | undefined;
    const nestedUrl = nested && typeof nested === 'object' ? httpUrl(nested.url) : null;
    if (nestedUrl) return nestedUrl;
  }
  return null;
}

/** Normalize one raw catalog look; null when it carries no usable id. */
export function normalizeLook(look: Record<string, unknown>): AvatarLook | null {
  const id = String(look.id ?? look.look_id ?? '');
  if (!id) return null;
  return {
    id,
    engines: Array.isArray(look.supported_api_engines) ? (look.supported_api_engines as string[]) : [],
    orientation: parseLookOrientation(look),
    photoAvatar: detectPhotoAvatar(look),
    defaultVoiceId: parseLookDefaultVoiceId(look),
    gender: typeof look.gender === 'string' ? look.gender.toLowerCase() : null,
    previewUrl: parseLookPreviewUrl(look),
    probedDims: null,
    sourceShape: 'unknown',
  };
}

/** Attach a preview-probe result (null = probe failed) to a look. */
export function withProbedDims(look: AvatarLook, dims: ImageDims | null): AvatarLook {
  return { ...look, probedDims: dims, sourceShape: classifySourceShape(dims) };
}

export function normalizeVoice(voice: Record<string, unknown>): AvatarVoice | null {
  const id = String(voice.voice_id ?? voice.id ?? '');
  if (!id) return null;
  return {
    id,
    locale: String(voice.locale ?? voice.language ?? ''),
    gender: typeof voice.gender === 'string' ? voice.gender.toLowerCase() : null,
  };
}

// ---------------------------------------------------------------------------
// Tier classification + selection.
// ---------------------------------------------------------------------------

/**
 * 1 = measured portrait, 2 = declared-portrait signal (unmeasured),
 * 3 = no signal, 0 = known non-portrait (measured landscape/square, or
 * declared landscape while unmeasured) — never eligible for a Short.
 * The measurement outranks metadata in both directions: a
 * portrait-declared look that MEASURES landscape is ineligible, and a
 * landscape-declared look that measures portrait is tier 1.
 */
export function classifyLook(look: AvatarLook): SelectionTier | 0 {
  if (look.sourceShape === 'portrait') return 1;
  if (look.sourceShape === 'landscape' || look.sourceShape === 'square') return 0;
  if (look.orientation === 'landscape') return 0;
  if (look.orientation === 'portrait' || look.photoAvatar) return 2;
  return 3;
}

export function shapeBasis(look: AvatarLook, tier: SelectionTier): ShapeBasis {
  if (tier === 1) return 'probed-portrait';
  if (tier === 3) return 'unprobed';
  return look.orientation === 'portrait' ? 'declared-portrait' : 'photo-unprobed';
}

/** Engine a render of this look should request. Photo avatars go
 *  through Avatar IV (their native pipeline); other looks keep the
 *  existing Avatar III preference. */
export function preferredEngine(look: AvatarLook): string {
  if (look.photoAvatar && look.engines.includes('avatar_iv')) return 'avatar_iv';
  return look.engines.includes('avatar_iii') ? 'avatar_iii' : 'avatar_iv';
}

export type PairSelection =
  | { kind: 'pair'; look: AvatarLook; voiceId: string; pairing: string; tier: SelectionTier; basis: ShapeBasis }
  | { kind: 'needs-voices'; look: AvatarLook; tier: SelectionTier; basis: ShapeBasis };

/**
 * Choose the avatar + voice pair for a portrait Short. Looks must
 * already carry their probe results (see withProbedDims). Pass
 * voices=null when the voice catalog has not been fetched yet: if (and
 * only if) the pairing falls through to the gender-matched rule, the
 * result is { kind: 'needs-voices' } and the caller fetches voices and
 * calls again — the function is pure, so the second call resolves
 * identically up to the voice choice. The recorded `pairing` string
 * carries the shape basis, e.g. 'look-default-voice:probed-portrait'.
 */
export function selectAvatarVoicePair(
  looks: AvatarLook[],
  voices: AvatarVoice[] | null,
  curatedPairs: CuratedPair[],
): PairSelection {
  if (!looks.length) throw new Error('HeyGen returned no public avatars to render with.');

  // Engine preference first (Avatar III pipeline), stable by id.
  const byPreference = [...looks].sort((a, b) => {
    const aScore = a.engines.includes('avatar_iii') ? 0 : 1;
    const bScore = b.engines.includes('avatar_iii') ? 0 : 1;
    return aScore - bScore || a.id.localeCompare(b.id);
  });

  const tiers = ([1, 2, 3] as const).map((tier) => ({
    tier,
    members: byPreference.filter((look) => classifyLook(look) === tier),
  }));
  const chosen = tiers.find(({ members }) => members.length > 0);
  if (!chosen) throw new Error(NO_PORTRAIT_AVATAR_MESSAGE);
  const { tier, members: eligible } = chosen;
  const tag = (look: AvatarLook) => shapeBasis(look, tier);

  // 1. A pinned curated pair whose avatar is live and in this tier.
  for (const pair of curatedPairs) {
    const look = eligible.find((candidate) => candidate.id === pair.avatarId);
    if (look) {
      return { kind: 'pair', look, voiceId: pair.voiceId, pairing: `curated: ${pair.note}:${tag(look)}`, tier, basis: tag(look) };
    }
  }

  // 2. The look's own default voice — HeyGen's own pairing for it.
  const withOwnVoice = eligible.find((look) => look.defaultVoiceId);
  if (withOwnVoice) {
    return {
      kind: 'pair',
      look: withOwnVoice,
      voiceId: withOwnVoice.defaultVoiceId as string,
      pairing: `look-default-voice:${tag(withOwnVoice)}`,
      tier,
      basis: tag(withOwnVoice),
    };
  }

  // 3. Gender-matched English voice for the look's persona.
  const look = eligible[0];
  if (!voices) return { kind: 'needs-voices', look, tier, basis: tag(look) };
  if (!voices.length) throw new Error('HeyGen returned no voices to render with.');
  const english = voices.filter((voice) => /en[-_]/i.test(voice.locale));
  const pool = english.length ? english : voices;
  const genderMatch = look.gender ? pool.find((voice) => voice.gender === look.gender) : undefined;
  const voice = genderMatch ?? pool[0];
  return {
    kind: 'pair',
    look,
    voiceId: voice.id,
    pairing: `${genderMatch ? 'gender-matched-voice' : 'first-english-voice'}:${tag(look)}`,
    tier,
    basis: tag(look),
  };
}
