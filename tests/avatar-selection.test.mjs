// Avatar + voice tier selection (src/lib/avatar-selection.ts — pure).
// Feeds FAKE raw catalog payloads through the same normalize (+ probe)
// + select path production uses (heygen.ts fetchLooks → select →
// selectAvatarVoicePair).
// Round 2 (2026-11-07): tiers stand on the look source's MEASURED
// shape — tier 1 probed-portrait, tier 2 declared-portrait signals
// with unmeasured shape, tier 3 no signal; known non-portrait sources
// are ineligible and an all-ineligible catalog stops before any spend.
// (Round 1 trusted declared orientation / the Avatar IV label as
// tier 1; the proof render falsified that — see avatar-selection.ts.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_PORTRAIT_AVATAR_MESSAGE,
  classifyLook,
  classifySourceShape,
  detectPhotoAvatar,
  normalizeLook,
  normalizeVoice,
  parseLookPreviewUrl,
  preferredEngine,
  selectAvatarVoicePair,
  withProbedDims,
} from '../src/lib/avatar-selection.ts';

const looks = (raw) => raw.map(normalizeLook).filter(Boolean);
const voices = (raw) => raw.map(normalizeVoice).filter(Boolean);
/** Normalize one raw look and attach a fake preview-probe result. */
const probed = (raw, dims) => withProbedDims(normalizeLook(raw), dims);

test('tier 2: a portrait-declared look wins over a landscape look', () => {
  const catalog = looks([
    // Landscape look sorts first (avatar_iii + earlier id) and even has
    // its own default voice — it must still lose to the portrait look.
    { id: 'aaa-studio', supported_api_engines: ['avatar_iii'], preferred_orientation: 'landscape', default_voice_id: 'voice-land', gender: 'female' },
    { id: 'zzz-portrait', supported_api_engines: ['avatar_iii'], preferred_orientation: 'portrait', default_voice_id: 'voice-port', gender: 'male' },
  ]);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 2);
  assert.equal(result.look.id, 'zzz-portrait');
  assert.equal(result.voiceId, 'voice-port');
  assert.equal(result.pairing, 'look-default-voice:declared-portrait');
  assert.equal(result.basis, 'declared-portrait');
});

test('tier 2: width < height payload fields count as portrait-declared (metadata, not measurement)', () => {
  const catalog = looks([
    { id: 'dims', supported_api_engines: ['avatar_iii'], width: 1080, height: 1920, default_voice_id: 'v1' },
  ]);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 2);
  assert.equal(result.pairing, 'look-default-voice:declared-portrait');
});

test('tier 2: an Avatar IV photo look with no orientation is a declared-signal pick', () => {
  const catalog = looks([
    { id: 'aaa-studio', supported_api_engines: ['avatar_iii'], preferred_orientation: 'landscape', default_voice_id: 'voice-land' },
    // No orientation fields at all — eligible as a photo avatar, but
    // round 2 no longer treats the label as proof of portrait shape.
    { id: 'photo-1', type: 'photo_avatar', supported_api_engines: ['avatar_iv'], default_voice_id: 'voice-photo', gender: 'female' },
  ]);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 2);
  assert.equal(result.look.id, 'photo-1');
  assert.equal(result.voiceId, 'voice-photo');
  assert.equal(result.pairing, 'look-default-voice:photo-unprobed');
  assert.equal(preferredEngine(result.look), 'avatar_iv');
});

test('tier 2: avatar_iv engine support alone also marks a photo avatar', () => {
  const catalog = looks([
    { id: 'iv-only', supported_api_engines: ['avatar_iv'], default_voice_id: 'v-iv' },
  ]);
  assert.equal(classifyLook(catalog[0]), 2);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.pairing, 'look-default-voice:photo-unprobed');
});

test('tier 3: no signal anywhere → a pick, not a throw', () => {
  const catalog = looks([
    { id: 'plain-1', supported_api_engines: ['avatar_iii'], gender: 'female' },
    { id: 'plain-2', supported_api_engines: ['avatar_iii'], default_voice_id: 'voice-plain', gender: 'male' },
  ]);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 3);
  assert.equal(result.look.id, 'plain-2');
  assert.equal(result.voiceId, 'voice-plain');
  assert.equal(result.pairing, 'look-default-voice:unprobed');
});

test('stop: every look landscape-declared → throws the existing error', () => {
  const catalog = looks([
    { id: 'land-1', supported_api_engines: ['avatar_iii'], preferred_orientation: 'landscape', default_voice_id: 'v1' },
    { id: 'land-2', supported_api_engines: ['avatar_iii'], width: 1920, height: 1080, default_voice_id: 'v2' },
  ]);
  assert.throws(() => selectAvatarVoicePair(catalog, null, []), { message: NO_PORTRAIT_AVATAR_MESSAGE });
});

test('pairing preference inside a tier: own default voice beats first-in-tier', () => {
  const catalog = looks([
    // Both portrait; the preference-first look has NO default voice, the
    // second does — rule 2 (own default voice) must win within the tier.
    { id: 'aaa-portrait', supported_api_engines: ['avatar_iii'], preferred_orientation: 'portrait', gender: 'female' },
    { id: 'bbb-portrait', supported_api_engines: ['avatar_iii'], preferred_orientation: 'portrait', default_voice_id: 'voice-b', gender: 'male' },
  ]);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.look.id, 'bbb-portrait');
  assert.equal(result.voiceId, 'voice-b');
});

test('pairing preference inside a tier: a curated pair beats default voices', () => {
  const catalog = looks([
    { id: 'aaa-portrait', supported_api_engines: ['avatar_iii'], preferred_orientation: 'portrait', default_voice_id: 'voice-a' },
    { id: 'bbb-portrait', supported_api_engines: ['avatar_iii'], preferred_orientation: 'portrait', default_voice_id: 'voice-b' },
  ]);
  const curated = [{ avatarId: 'bbb-portrait', voiceId: 'voice-curated', note: 'vetted presenter' }];
  const result = selectAvatarVoicePair(catalog, null, curated);
  assert.equal(result.kind, 'pair');
  assert.equal(result.look.id, 'bbb-portrait');
  assert.equal(result.voiceId, 'voice-curated');
  assert.equal(result.pairing, 'curated: vetted presenter:declared-portrait');
});

test('tier 3 fallback: gender-matched English voice when no look has a default voice', () => {
  const catalog = looks([
    { id: 'plain-f', supported_api_engines: ['avatar_iii'], gender: 'female' },
  ]);
  // Without voices fetched, selection defers instead of guessing.
  const deferred = selectAvatarVoicePair(catalog, null, []);
  assert.equal(deferred.kind, 'needs-voices');
  assert.equal(deferred.tier, 3);
  const pool = voices([
    { voice_id: 'voice-male', locale: 'en-US', gender: 'male' },
    { voice_id: 'voice-female', locale: 'en-GB', gender: 'female' },
    { voice_id: 'voice-fr', locale: 'fr-FR', gender: 'female' },
  ]);
  const result = selectAvatarVoicePair(catalog, pool, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.voiceId, 'voice-female');
  assert.equal(result.pairing, 'gender-matched-voice:unprobed');
});

test('detectPhotoAvatar keys on type fields and avatar_iv engine only', () => {
  assert.equal(detectPhotoAvatar({ type: 'photo_avatar' }), true);
  assert.equal(detectPhotoAvatar({ look_type: 'Avatar IV' }), true);
  assert.equal(detectPhotoAvatar({ supported_api_engines: ['avatar_iv'] }), true);
  assert.equal(detectPhotoAvatar({ supported_api_engines: ['avatar_iii'] }), false);
  assert.equal(detectPhotoAvatar({}), false);
});

// ---------------------------------------------------------------------------
// Round 2: probed source shape. Production composition is normalizeLook
// → probe (heygen.ts) → withProbedDims → selectAvatarVoicePair.
// ---------------------------------------------------------------------------

test('classifySourceShape: portrait / landscape / square / unknown', () => {
  assert.equal(classifySourceShape({ width: 720, height: 1280 }), 'portrait');
  assert.equal(classifySourceShape({ width: 1280, height: 720 }), 'landscape');
  assert.equal(classifySourceShape({ width: 1000, height: 1000 }), 'square');
  assert.equal(classifySourceShape(null), 'unknown');
  assert.equal(classifySourceShape({ width: 0, height: 10 }), 'unknown');
});

test('tier 1: a probed-portrait look beats a portrait-declared look', () => {
  const catalog = [
    // Declared portrait (tier 2) — sorts first and has its own voice.
    normalizeLook({ id: 'aaa-declared', supported_api_engines: ['avatar_iii'], preferred_orientation: 'portrait', default_voice_id: 'voice-declared' }),
    // Plain payload, but its preview MEASURED portrait (tier 1).
    probed({ id: 'zzz-plain', supported_api_engines: ['avatar_iii'], default_voice_id: 'voice-probed' }, { width: 720, height: 1280 }),
  ];
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 1);
  assert.equal(result.look.id, 'zzz-plain');
  assert.equal(result.voiceId, 'voice-probed');
  assert.equal(result.pairing, 'look-default-voice:probed-portrait');
  // Census: the chosen look carries its measurement into the job record.
  assert.deepEqual(result.look.probedDims, { width: 720, height: 1280 });
  assert.equal(result.look.sourceShape, 'portrait');
});

test('tier 1: a landscape-declared look that MEASURES portrait is eligible (measurement outranks metadata)', () => {
  const catalog = [
    probed({ id: 'mislabeled', supported_api_engines: ['avatar_iii'], preferred_orientation: 'landscape', default_voice_id: 'v1' }, { width: 900, height: 1600 }),
  ];
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 1);
  assert.equal(result.pairing, 'look-default-voice:probed-portrait');
});

test('ineligible: a portrait-declared look that MEASURES landscape falls out (the failed-proof shape)', () => {
  const catalog = [
    // Exactly the proof failure: photo avatar, declared nothing wrong,
    // but its source measured landscape — it must not be picked.
    probed({ id: 'photo-land', type: 'photo_avatar', supported_api_engines: ['avatar_iv'], default_voice_id: 'voice-photo' }, { width: 1280, height: 720 }),
    normalizeLook({ id: 'plain', supported_api_engines: ['avatar_iii'], default_voice_id: 'voice-plain' }),
  ];
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 3);
  assert.equal(result.look.id, 'plain');
  assert.equal(result.pairing, 'look-default-voice:unprobed');
});

test('stop: every look probed landscape or square → throws before any spend', () => {
  const landOnly = [
    probed({ id: 'p1', type: 'photo_avatar', supported_api_engines: ['avatar_iv'], default_voice_id: 'v1' }, { width: 1920, height: 1080 }),
    probed({ id: 'p2', supported_api_engines: ['avatar_iii'], default_voice_id: 'v2' }, { width: 1080, height: 1080 }),
  ];
  assert.equal(classifyLook(landOnly[0]), 0);
  assert.equal(classifyLook(landOnly[1]), 0);
  assert.throws(() => selectAvatarVoicePair(landOnly, null, []), { message: NO_PORTRAIT_AVATAR_MESSAGE });
});

test('parseLookPreviewUrl: plausible field names, nested url, http only', () => {
  assert.equal(parseLookPreviewUrl({ preview_image_url: 'https://cdn.example/a.jpg' }), 'https://cdn.example/a.jpg');
  assert.equal(parseLookPreviewUrl({ thumbnail_url: 'https://cdn.example/b.jpg' }), 'https://cdn.example/b.jpg');
  assert.equal(parseLookPreviewUrl({ image: { url: 'https://cdn.example/c.jpg' } }), 'https://cdn.example/c.jpg');
  assert.equal(parseLookPreviewUrl({ preview_image_url: 'not-a-url', image_url: 'https://cdn.example/d.jpg' }), 'https://cdn.example/d.jpg');
  assert.equal(parseLookPreviewUrl({}), null);
});
