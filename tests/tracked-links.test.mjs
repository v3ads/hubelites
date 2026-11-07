// Tracked links (src/lib/tracked-links.ts — pure).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrackedDestination, isLinkSlug, newLinkSlug } from '../src/lib/tracked-links.ts';

test('slugs are well-formed and unique enough', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const slug = newLinkSlug();
    assert.ok(isLinkSlug(slug), slug);
    seen.add(slug);
  }
  assert.equal(seen.size, 200);
});

test('destination gains UTM attribution', () => {
  const out = buildTrackedDestination('https://example.com/funnel', 'abc234xyz');
  const url = new URL(out);
  assert.equal(url.searchParams.get('utm_source'), 'hubelites');
  assert.equal(url.searchParams.get('utm_medium'), 'social');
  assert.equal(url.searchParams.get('utm_campaign'), 'abc234xyz');
});

test('existing params survive; our UTM keys win collisions', () => {
  const out = buildTrackedDestination('https://example.com/f?ref=coach&utm_source=other', 'slug99999');
  const url = new URL(out);
  assert.equal(url.searchParams.get('ref'), 'coach');
  assert.equal(url.searchParams.get('utm_source'), 'hubelites');
});

test('unparseable destination passes through untouched', () => {
  assert.equal(buildTrackedDestination('not a url', 'slug99999'), 'not a url');
});

test('slug validator rejects junk', () => {
  assert.equal(isLinkSlug(''), false);
  assert.equal(isLinkSlug('ABC-123'), false);
  assert.equal(isLinkSlug('a'.repeat(40)), false);
});
