// Avatar + voice tier selection (src/lib/avatar-selection.ts — pure).
// Feeds FAKE raw catalog payloads through the same normalize + select
// path production uses (heygen.ts fetchLooks → selectAvatarVoicePair).
// Route A (2026-11-07): tier 1 portrait-capable (portrait-declared OR
// Avatar IV / photo avatar), tier 2 orientation-undeclared, tier 3
// all-landscape still stops before any spend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_PORTRAIT_AVATAR_MESSAGE,
  classifyLook,
  detectPhotoAvatar,
  normalizeLook,
  normalizeVoice,
  preferredEngine,
  selectAvatarVoicePair,
} from '../src/lib/avatar-selection.ts';

const looks = (raw) => raw.map(normalizeLook).filter(Boolean);
const voices = (raw) => raw.map(normalizeVoice).filter(Boolean);

test('tier 1: a portrait-declared look wins over a landscape look', () => {
  const catalog = looks([
    // Landscape look sorts first (avatar_iii + earlier id) and even has
    // its own default voice — it must still lose to the portrait look.
    { id: 'aaa-studio', supported_api_engines: ['avatar_iii'], preferred_orientation: 'landscape', default_voice_id: 'voice-land', gender: 'female' },
    { id: 'zzz-portrait', supported_api_engines: ['avatar_iii'], preferred_orientation: 'portrait', default_voice_id: 'voice-port', gender: 'male' },
  ]);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 1);
  assert.equal(result.look.id, 'zzz-portrait');
  assert.equal(result.voiceId, 'voice-port');
  assert.equal(result.pairing, 'look-default-voice:tier1-portrait');
});

test('tier 1: width < height also counts as portrait-declared', () => {
  const catalog = looks([
    { id: 'dims', supported_api_engines: ['avatar_iii'], width: 1080, height: 1920, default_voice_id: 'v1' },
  ]);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 1);
  assert.equal(result.pairing, 'look-default-voice:tier1-portrait');
});

test('tier 1: an Avatar IV photo look with no orientation is portrait-capable', () => {
  const catalog = looks([
    { id: 'aaa-studio', supported_api_engines: ['avatar_iii'], preferred_orientation: 'landscape', default_voice_id: 'voice-land' },
    // No orientation fields at all — eligible purely as a photo avatar.
    { id: 'photo-1', type: 'photo_avatar', supported_api_engines: ['avatar_iv'], default_voice_id: 'voice-photo', gender: 'female' },
  ]);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 1);
  assert.equal(result.look.id, 'photo-1');
  assert.equal(result.voiceId, 'voice-photo');
  assert.equal(result.pairing, 'look-default-voice:tier1-avatar-iv');
  assert.equal(preferredEngine(result.look), 'avatar_iv');
});

test('tier 1: avatar_iv engine support alone also marks a photo avatar', () => {
  const catalog = looks([
    { id: 'iv-only', supported_api_engines: ['avatar_iv'], default_voice_id: 'v-iv' },
  ]);
  assert.equal(classifyLook(catalog[0]), 1);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.pairing, 'look-default-voice:tier1-avatar-iv');
});

test('tier 2: no orientation declared anywhere → a pick, not a throw', () => {
  const catalog = looks([
    { id: 'plain-1', supported_api_engines: ['avatar_iii'], gender: 'female' },
    { id: 'plain-2', supported_api_engines: ['avatar_iii'], default_voice_id: 'voice-plain', gender: 'male' },
  ]);
  const result = selectAvatarVoicePair(catalog, null, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.tier, 2);
  assert.equal(result.look.id, 'plain-2');
  assert.equal(result.voiceId, 'voice-plain');
  assert.equal(result.pairing, 'look-default-voice:tier2-undeclared');
});

test('tier 3: every look landscape-declared → throws the existing error', () => {
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
  assert.equal(result.pairing, 'curated: vetted presenter:tier1-portrait');
});

test('tier 2 fallback: gender-matched English voice when no look has a default voice', () => {
  const catalog = looks([
    { id: 'plain-f', supported_api_engines: ['avatar_iii'], gender: 'female' },
  ]);
  // Without voices fetched, selection defers instead of guessing.
  const deferred = selectAvatarVoicePair(catalog, null, []);
  assert.equal(deferred.kind, 'needs-voices');
  assert.equal(deferred.tier, 2);
  const pool = voices([
    { voice_id: 'voice-male', locale: 'en-US', gender: 'male' },
    { voice_id: 'voice-female', locale: 'en-GB', gender: 'female' },
    { voice_id: 'voice-fr', locale: 'fr-FR', gender: 'female' },
  ]);
  const result = selectAvatarVoicePair(catalog, pool, []);
  assert.equal(result.kind, 'pair');
  assert.equal(result.voiceId, 'voice-female');
  assert.equal(result.pairing, 'gender-matched-voice:tier2-undeclared');
});

test('detectPhotoAvatar keys on type fields and avatar_iv engine only', () => {
  assert.equal(detectPhotoAvatar({ type: 'photo_avatar' }), true);
  assert.equal(detectPhotoAvatar({ look_type: 'Avatar IV' }), true);
  assert.equal(detectPhotoAvatar({ supported_api_engines: ['avatar_iv'] }), true);
  assert.equal(detectPhotoAvatar({ supported_api_engines: ['avatar_iii'] }), false);
  assert.equal(detectPhotoAvatar({}), false);
});
