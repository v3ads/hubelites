// Distribution helpers (src/lib/distribution.ts — pure).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeCaption, isPlatformId, platformsForAsset } from '../src/lib/distribution.ts';

test('video assets fit the video channels', () => {
  assert.deepEqual(platformsForAsset('video', true), ['youtube', 'instagram', 'tiktok', 'facebook']);
});

test('a script with rendered media counts as video; without media it is text', () => {
  assert.deepEqual(platformsForAsset('script', true), ['youtube', 'instagram', 'tiktok', 'facebook']);
  assert.deepEqual(platformsForAsset('script', false), ['facebook', 'linkedin', 'x', 'threads']);
});

test('image and carousel assets fit the image channels', () => {
  assert.deepEqual(platformsForAsset('image', true), ['instagram', 'facebook', 'linkedin', 'x', 'threads']);
  assert.deepEqual(platformsForAsset('carousel', true), ['instagram', 'facebook', 'linkedin', 'x', 'threads']);
});

test('text-only posts never offer media-required channels', () => {
  const fits = platformsForAsset('social_post', false);
  assert.ok(!fits.includes('instagram'));
  assert.ok(!fits.includes('tiktok'));
  assert.ok(!fits.includes('youtube'));
});

test('caption ends with the tracked link, exactly once', () => {
  const url = 'https://www.hubelites.com/r/abc234xyz';
  assert.equal(composeCaption('Hello world', url), `Hello world\n\n${url}`);
  assert.equal(composeCaption(`Hello\n\n${url}`, url), `Hello\n\n${url}`);
  assert.equal(composeCaption('', url), url);
  assert.equal(composeCaption('  spaced  ', url), `spaced\n\n${url}`);
});

test('platform id validation', () => {
  assert.equal(isPlatformId('youtube'), true);
  assert.equal(isPlatformId('myspace'), false);
});
