// MP4 dimension probe checks (src/lib/mp4.ts — pure, no imports).
// Builds synthetic MP4 box structures: moov > trak > tkhd, whose payload
// always ends with width/height as 16.16 fixed-point values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMp4Dimensions, isPortraitShort } from '../src/lib/mp4.ts';

function box(type, payload) {
  const out = new Uint8Array(8 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 8 + payload.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  return out;
}

function tkhd(width, height) {
  const payload = new Uint8Array(84); // version/flags + fields, zeroed
  const view = new DataView(payload.buffer);
  view.setUint32(84 - 8, width * 65536);
  view.setUint32(84 - 4, height * 65536);
  return box('tkhd', payload);
}

function mp4(width, height) {
  const trak = box('trak', tkhd(width, height));
  const moov = box('moov', trak);
  const ftyp = box('ftyp', new Uint8Array(16));
  const all = new Uint8Array(ftyp.length + moov.length);
  all.set(ftyp, 0);
  all.set(moov, ftyp.length);
  return all;
}

test('portrait MP4 dimensions are read from tkhd', () => {
  const dims = parseMp4Dimensions(mp4(1080, 1920));
  assert.deepEqual(dims, { width: 1080, height: 1920 });
  assert.equal(isPortraitShort(dims), true);
});

test('landscape MP4 is not a portrait Short', () => {
  const dims = parseMp4Dimensions(mp4(1920, 1080));
  assert.deepEqual(dims, { width: 1920, height: 1080 });
  assert.equal(isPortraitShort(dims), false);
});

test('garbage and empty buffers yield null, never a guess', () => {
  assert.equal(parseMp4Dimensions(new Uint8Array(0)), null);
  assert.equal(parseMp4Dimensions(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])), null);
});
