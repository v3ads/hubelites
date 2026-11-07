// Flat-band detection (src/lib/frame-check.ts — pure).
// Synthetic per-row luminance stats. The padded fixture mirrors the
// measured 2026-11-07 proof render's thumbnail: flat rows (mean ≈245,
// stdev 0) for the top and bottom ~36%, real content in between.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPaddingBands } from '../src/lib/frame-check.ts';

const flat = (mean) => ({ mean, stdev: 0 });
const content = (i) => ({ mean: 90 + (i % 9) * 11, stdev: 38 + (i % 5) * 9 });
const rows = (...parts) => parts.flatMap(([count, make]) => Array.from({ length: count }, (_, i) => make(i)));

test('padded: flat bands of one color above and below real content', () => {
  const verdict = detectPaddingBands(rows([46, () => flat(245)], [36, content], [46, () => flat(245)]));
  assert.equal(verdict.verdict, 'padded');
  assert.ok(Math.abs(verdict.topShare - 46 / 128) < 0.001);
  assert.ok(Math.abs(verdict.bottomShare - 46 / 128) < 0.001);
});

test('padded: black letterbox bands are detected too (color-agnostic)', () => {
  const verdict = detectPaddingBands(rows([40, () => flat(4)], [48, content], [40, () => flat(4)]));
  assert.equal(verdict.verdict, 'padded');
});

test('full: content rows from top to bottom are never flagged', () => {
  const verdict = detectPaddingBands(rows([128, content]));
  assert.equal(verdict.verdict, 'full');
});

test('full: a band on one side only is not letterboxing', () => {
  const verdict = detectPaddingBands(rows([50, () => flat(245)], [78, content]));
  assert.equal(verdict.verdict, 'full');
});

test('full: thin bands under the share thresholds are not flagged', () => {
  const verdict = detectPaddingBands(rows([10, () => flat(245)], [108, content], [10, () => flat(245)]));
  assert.equal(verdict.verdict, 'full');
});

test('full: bands of clearly different colors are not one pad color', () => {
  const verdict = detectPaddingBands(rows([46, () => flat(245)], [36, content], [46, () => flat(12)]));
  assert.equal(verdict.verdict, 'full');
});

test('unknown: a wholly flat frame cannot be judged', () => {
  const verdict = detectPaddingBands(rows([128, () => flat(245)]));
  assert.equal(verdict.verdict, 'unknown');
});

test('unknown: too few rows to judge', () => {
  const verdict = detectPaddingBands(rows([5, () => flat(245)], [5, content], [5, () => flat(245)]));
  assert.equal(verdict.verdict, 'unknown');
});
