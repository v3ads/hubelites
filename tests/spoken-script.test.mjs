// Spoken-script sanitizer checks (src/lib/spoken-script.ts — pure, no
// imports). The stored campaign script is a labeled production document;
// the avatar must receive only what it should say. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSpokenScript } from '../src/lib/spoken-script.ts';

test('section labels are removed but their sentences are kept', () => {
  const out = toSpokenScript(
    ['Hook: Your course stack is scattered across five different platforms.', 'CTA: Bring it all into one hub today.'].join('\n'),
  );
  assert.equal(out, 'Your course stack is scattered across five different platforms. Bring it all into one hub today.');
  assert.ok(!/\bCTA\b/.test(out));
  assert.ok(!/\bHook\b/.test(out));
});

test('a bare label heading line is dropped entirely', () => {
  const out = toSpokenScript('The scattered stack\n\nCTA\n\nJoin us this week.');
  assert.equal(out, 'The scattered stack Join us this week.');
});

test('direction labels lose their whole line — B-roll is never spoken', () => {
  const out = toSpokenScript(
    ['Your courses live in too many places.', 'B-roll: close-up of the dashboard, mouse clicking around.', 'Visual: show the login screen.', 'One hub fixes that.'].join('\n'),
  );
  assert.equal(out, 'Your courses live in too many places. One hub fixes that.');
});

test('bracketed and parenthesized stage directions are removed', () => {
  const out = toSpokenScript('Tired of the chaos? [Cut to the dashboard] Your whole business (gesture at screen) runs from one place.');
  assert.equal(out, 'Tired of the chaos? Your whole business runs from one place.');
});

test('markdown is stripped: headings, bold and bullets', () => {
  const out = toSpokenScript(['## The Problem', '', '**Your course stack** is scattered.', '- Courses in one tool', '- Community in another'].join('\n'));
  assert.ok(!out.includes('#'));
  assert.ok(!out.includes('*'));
  assert.ok(!out.includes('-'));
  assert.ok(out.includes('Your course stack is scattered.'));
  assert.ok(out.includes('Courses in one tool'));
  assert.ok(out.includes('Community in another'));
});

test('raw URLs are dropped, never spelled out', () => {
  const out = toSpokenScript('Start today at https://hubelites.com/join and see how it works. Details at www.example.com/page too.');
  assert.ok(!/https?/.test(out));
  assert.ok(!out.includes('hubelites.com'));
  assert.ok(!out.includes('example.com'));
  assert.ok(out.includes('Start today and see how it works.'));
});

test('ordinary sentences pass through preserved verbatim', () => {
  const plain =
    'Tired of juggling multiple platforms for your courses and coaching? When your business is scattered, you are stuck holding it together. One hub changes that.';
  assert.equal(toSpokenScript(plain), plain);
});

test('output is capped near 900 chars on a sentence boundary', () => {
  const sentence = 'Your online business runs better from one connected hub. ';
  const out = toSpokenScript(sentence.repeat(40));
  assert.ok(out.length <= 900, `expected <= 900 chars, got ${out.length}`);
  assert.ok(out.endsWith('.'));
});
