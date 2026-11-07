// Pure avatar + voice selection for HeyGen portrait Shorts (Route A,
// approved 2026-11-07). Extracted from heygen.ts so the tier logic can be
// unit-tested over fake catalog payloads — no network, no imports.
//
// Why tiers: the first picker only accepted looks whose catalog payload
// DECLARED a portrait orientation, and this account's catalog declares
// none — generation dead-ended before any render ("HeyGen has no
// portrait-shaped avatar available right now"). But a declared
// orientation is not the only shape signal in the payload:
//
//   Tier 1 — portrait-capable looks:
//     (a) looks declaring a portrait orientation (preferred_orientation
//         or width < height), and
//     (b) Avatar IV / photo-avatar looks, which are generated to the
//         requested render dimensions instead of carrying a fixed scene,
//         so they fill a 9:16 canvas rather than letterboxing into it.
//   Tier 2 — looks declaring NO orientation at all. Unknown shape: worth
//     one attempt, because the rendered-output gate in media-jobs.ts
//     still verifies the finished video's dimensions before anything is
//     charged — a wrong-shaped render fails the job at zero member cost.
//   Tier 3 — every look declares landscape (and none is a photo avatar):
//     still a hard stop BEFORE any spend, with the plain-language error
//     below. A known-landscape scene is a guaranteed letterbox; there is
//     no reason to burn provider money confirming it.
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

export type AvatarLook = {
  id: string;
  engines: string[];
  orientation: LookOrientation;
  photoAvatar: boolean;
  defaultVoiceId: string | null;
  gender: string | null;
};

export type AvatarVoice = { id: string; locale: string; gender: string | null };

export type CuratedPair = { avatarId: string; voiceId: string; note: string };

export type SelectionTier = 1 | 2;

export const NO_PORTRAIT_AVATAR_MESSAGE =
  'HeyGen has no portrait-shaped avatar available right now, so the video was not started. Nothing was charged.';

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
 * Whether a look is an Avatar IV / photo avatar. Photo avatars render to
 * the requested dimensions rather than carrying a fixed scene framing.
 * Keys on, in the raw payload:
 *   - a type-ish field (type / look_type / avatar_type / kind / category)
 *     whose value mentions "photo" or "avatar_iv" / "avatar iv";
 *   - supported_api_engines including "avatar_iv".
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
  };
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

/** 1 = portrait-capable, 2 = orientation undeclared, 3 = known landscape. */
export function classifyLook(look: AvatarLook): SelectionTier | 3 {
  if (look.orientation === 'portrait' || look.photoAvatar) return 1;
  if (look.orientation === null) return 2;
  return 3;
}

function tierTag(look: AvatarLook, tier: SelectionTier): string {
  if (tier === 2) return 'tier2-undeclared';
  return look.orientation === 'portrait' ? 'tier1-portrait' : 'tier1-avatar-iv';
}

/** Engine a render of this look should request. Photo avatars must go
 *  through Avatar IV — that is the pipeline that honors the requested
 *  dimensions; other looks keep the existing Avatar III preference. */
export function preferredEngine(look: AvatarLook): string {
  if (look.photoAvatar && look.engines.includes('avatar_iv')) return 'avatar_iv';
  return look.engines.includes('avatar_iii') ? 'avatar_iii' : 'avatar_iv';
}

export type PairSelection =
  | { kind: 'pair'; look: AvatarLook; voiceId: string; pairing: string; tier: SelectionTier }
  | { kind: 'needs-voices'; look: AvatarLook; tier: SelectionTier };

/**
 * Choose the avatar + voice pair for a portrait Short. Pass voices=null
 * when the voice catalog has not been fetched yet: if (and only if) the
 * pairing falls through to the gender-matched rule, the result is
 * { kind: 'needs-voices' } and the caller fetches voices and calls again
 * — the function is pure, so the second call resolves identically up to
 * the voice choice. The recorded `pairing` string carries the tier path,
 * e.g. 'look-default-voice:tier2-undeclared'.
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

  const tier1 = byPreference.filter((look) => classifyLook(look) === 1);
  const tier2 = byPreference.filter((look) => classifyLook(look) === 2);
  const tier: SelectionTier | null = tier1.length ? 1 : tier2.length ? 2 : null;
  if (tier === null) throw new Error(NO_PORTRAIT_AVATAR_MESSAGE);
  const eligible = tier === 1 ? tier1 : tier2;
  const tag = (look: AvatarLook) => tierTag(look, tier);

  // 1. A pinned curated pair whose avatar is live and in this tier.
  for (const pair of curatedPairs) {
    const look = eligible.find((candidate) => candidate.id === pair.avatarId);
    if (look) {
      return { kind: 'pair', look, voiceId: pair.voiceId, pairing: `curated: ${pair.note}:${tag(look)}`, tier };
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
    };
  }

  // 3. Gender-matched English voice for the look's persona.
  const look = eligible[0];
  if (!voices) return { kind: 'needs-voices', look, tier };
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
  };
}
