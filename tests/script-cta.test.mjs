// Instagram closing-CTA rule (2026-11-08 — pure).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyClosingCta, applyInstagramClosingCta, INSTAGRAM_VIDEO_CTA } from '../src/lib/script-cta.ts';
import { toSpokenScript } from '../src/lib/spoken-script.ts';

const SCRIPT_WITH_CTA = `[HOOK, on camera] If your course is in one place, you're the glue.

[Beat 1] When your business is scattered, you are stuck holding it together.

[CTA] Build your hub. Register for Mission 1000 at hubactually.com.`;

test('an Instagram script closing section is replaced with the exact HUB line', () => {
  const out = applyInstagramClosingCta(SCRIPT_WITH_CTA);
  assert.ok(out.includes(`[CTA] ${INSTAGRAM_VIDEO_CTA}`));
  assert.ok(!out.includes('Register for Mission 1000'));
  // The rest of the script is untouched.
  assert.ok(out.includes('[Beat 1] When your business is scattered, you are stuck holding it together.'));
  // And the spoken rendering ends on the exact line.
  const spoken = toSpokenScript(out, 2000);
  assert.ok(spoken.endsWith(INSTAGRAM_VIDEO_CTA), spoken);
});

test('no CTA section: the line is appended and spoken last', () => {
  const body = '[HOOK] A hook line.\n\n[Beat 1] The body of the script.';
  const out = applyInstagramClosingCta(body);
  assert.ok(toSpokenScript(out, 2000).endsWith(INSTAGRAM_VIDEO_CTA));
});

test('already carrying the line: stays exactly that line, spoken last', () => {
  const body = `[HOOK] Hook.\n\n[CTA] ${INSTAGRAM_VIDEO_CTA}`;
  const out = applyInstagramClosingCta(body);
  assert.ok(out.includes(`[CTA] ${INSTAGRAM_VIDEO_CTA}`));
  assert.ok(toSpokenScript(out, 2000).endsWith(INSTAGRAM_VIDEO_CTA));
});

test('only Instagram script assets are rewritten', () => {
  assert.equal(applyClosingCta(SCRIPT_WITH_CTA, 'script', 'YouTube'), SCRIPT_WITH_CTA);
  assert.equal(applyClosingCta(SCRIPT_WITH_CTA, 'script', 'TikTok'), SCRIPT_WITH_CTA);
  assert.equal(applyClosingCta(SCRIPT_WITH_CTA, 'social_post', 'Instagram'), SCRIPT_WITH_CTA);
  assert.notEqual(applyClosingCta(SCRIPT_WITH_CTA, 'script', 'instagram'), SCRIPT_WITH_CTA);
  assert.notEqual(applyClosingCta(SCRIPT_WITH_CTA, 'script', ' Instagram '), SCRIPT_WITH_CTA);
});
