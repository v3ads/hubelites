// Per-platform closing-CTA rules (2026-11-08 — pure).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyClosingCta,
  closingCtaForChannel,
  INSTAGRAM_VIDEO_CTA,
  TIKTOK_VIDEO_CTA,
  YOUTUBE_VIDEO_CTA,
} from '../src/lib/script-cta.ts';
import { toSpokenScript } from '../src/lib/spoken-script.ts';

const SCRIPT_WITH_CTA = `[HOOK, on camera] If your course is in one place, you're the glue.

[Beat 1] When your business is scattered, you are stuck holding it together.

[CTA] Build your hub. Register for Mission 1000 at hubactually.com.`;

test('the settled lines: Instagram and TikTok share the bio line, YouTube gets the description line', () => {
  assert.equal(closingCtaForChannel('Instagram'), INSTAGRAM_VIDEO_CTA);
  assert.equal(closingCtaForChannel('tiktok'), TIKTOK_VIDEO_CTA);
  assert.equal(TIKTOK_VIDEO_CTA, INSTAGRAM_VIDEO_CTA);
  assert.equal(closingCtaForChannel('YouTube'), YOUTUBE_VIDEO_CTA);
  assert.match(YOUTUBE_VIDEO_CTA, /check the description for the link/);
  assert.equal(closingCtaForChannel('Facebook'), null);
  assert.equal(closingCtaForChannel('LinkedIn'), null);
  assert.equal(closingCtaForChannel(null), null);
  for (const line of [INSTAGRAM_VIDEO_CTA, YOUTUBE_VIDEO_CTA]) {
    assert.ok(!/\bfree\b/i.test(line), line);
  }
});

test('each platform script closing is replaced with its exact line, spoken last', () => {
  for (const [channel, line] of [
    ['Instagram', INSTAGRAM_VIDEO_CTA],
    ['TikTok', TIKTOK_VIDEO_CTA],
    ['YouTube', YOUTUBE_VIDEO_CTA],
  ]) {
    const out = applyClosingCta(SCRIPT_WITH_CTA, 'script', channel);
    assert.ok(out.includes(`[CTA] ${line}`), channel);
    assert.ok(!out.includes('Register for Mission 1000'), channel);
    // The rest of the script is untouched.
    assert.ok(out.includes('[Beat 1] When your business is scattered, you are stuck holding it together.'));
    assert.ok(toSpokenScript(out, 2000).endsWith(line), channel);
  }
});

test('no CTA section: the platform line is appended and spoken last', () => {
  const body = '[HOOK] A hook line.\n\n[Beat 1] The body of the script.';
  const out = applyClosingCta(body, 'script', 'YouTube');
  assert.ok(toSpokenScript(out, 2000).endsWith(YOUTUBE_VIDEO_CTA));
});

test('channels without a settled line keep the engine ending; non-scripts untouched', () => {
  assert.equal(applyClosingCta(SCRIPT_WITH_CTA, 'script', 'Facebook'), SCRIPT_WITH_CTA);
  assert.equal(applyClosingCta(SCRIPT_WITH_CTA, 'script', 'Email'), SCRIPT_WITH_CTA);
  assert.equal(applyClosingCta(SCRIPT_WITH_CTA, 'social_post', 'Instagram'), SCRIPT_WITH_CTA);
});
