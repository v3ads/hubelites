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

test('a URL at the very end leaves no dangling preposition fragment', () => {
  const out = toSpokenScript('Build your hub. Register at example.com.');
  assert.equal(out, 'Build your hub.');
  assert.ok(!out.includes('Register'));
});

test('a scheme URL at the very end leaves no stub sentence either', () => {
  const out = toSpokenScript('Build your hub. Register at https://example.com/join');
  assert.equal(out, 'Build your hub.');
});

test('a URL mid-sentence is removed with its preposition, sentence survives', () => {
  const out = toSpokenScript('Register at example.com to save your seat, then check your inbox.');
  assert.equal(out, 'Register to save your seat, then check your inbox.');
  const out2 = toSpokenScript('Watch the walkthrough at https://example.com/demo and tell us what you think.');
  assert.equal(out2, 'Watch the walkthrough and tell us what you think.');
});

test('a dangling sentence with a real remainder keeps the remainder', () => {
  // "with" is not in the at/on/via prevention list, so this exercises
  // the dangling-word strip itself: the domain goes, "with" must not
  // be left trailing, and the real sentence survives.
  const out = toSpokenScript('You can sign up with example.com.');
  assert.equal(out, 'You can sign up.');
});

test('a dangling fragment with no real remainder is dropped entirely', () => {
  const out = toSpokenScript('Everything is ready. Download from example.com.');
  assert.equal(out, 'Everything is ready.');
});

test('the exact Course walkthrough script ends cleanly on "Build your hub."', () => {
  const body = [
    '[HOOK, on camera] Let me show you one student going through one hub.',
    '',
    '[BEAT 1] They land on your branded destination. They buy your course right there.',
    '',
    '[BEAT 2] They start learning. Then they join your community, in the same place, under your brand.',
    '',
    '[BEAT 3] They need help, so they ask, in the same place. They never had to hunt for a second login.',
    '',
    "[BEAT 4] That's a hub. Selling, delivery, participation and service, connected around your customer.",
    '',
    '[CTA] Build your hub. Register at hubactually.com.',
  ].join('\n');
  const out = toSpokenScript(body);
  assert.equal(
    out,
    "Let me show you one student going through one hub. They land on your branded destination. They buy your course right there. They start learning. Then they join your community, in the same place, under your brand. They need help, so they ask, in the same place. They never had to hunt for a second login. That's a hub. Selling, delivery, participation and service, connected around your customer. Build your hub.",
  );
  assert.ok(!out.includes('Register'));
  assert.ok(!out.includes('hubactually.com'));
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
