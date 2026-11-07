// Image dimension parsing (src/lib/image-size.ts — pure).
// Synthetic headers for PNG / JPEG / GIF / WebP (VP8, VP8L, VP8X) — the
// parser reads headers only, which is all the HeyGen preview-shape
// probe needs. The WebP VP8 case mirrors a real HeyGen thumbnail
// (720×1280, served with a .jpeg file name — sniffing beats extensions).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImageDimensions } from '../src/lib/image-size.ts';

const u8 = (...arrays) => Uint8Array.from(arrays.flat());

function pngHeader(width, height) {
  return u8(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    [0x00, 0x00, 0x00, 0x0d],
    [...'IHDR'].map((c) => c.charCodeAt(0)),
    [(width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff],
    [(height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff],
    [0x08, 0x06, 0x00, 0x00, 0x00],
  );
}

function jpegHeader(width, height) {
  return u8(
    [0xff, 0xd8], // SOI
    [0xff, 0xe0, 0x00, 0x10], // APP0, length 16
    new Array(14).fill(0x00),
    [0xff, 0xc0, 0x00, 0x11, 0x08], // SOF0, length 17, precision 8
    [(height >> 8) & 0xff, height & 0xff],
    [(width >> 8) & 0xff, width & 0xff],
    [0x03, 0x01, 0x22, 0x00],
  );
}

function gifHeader(width, height) {
  return u8(
    [...'GIF89a'].map((c) => c.charCodeAt(0)),
    [width & 0xff, (width >> 8) & 0xff],
    [height & 0xff, (height >> 8) & 0xff],
    [0x00, 0x00, 0x00],
  );
}

function webpVp8x(width, height) {
  const w = width - 1;
  const h = height - 1;
  return u8(
    [...'RIFF'].map((c) => c.charCodeAt(0)),
    [0x24, 0x00, 0x00, 0x00],
    [...'WEBP'].map((c) => c.charCodeAt(0)),
    [...'VP8X'].map((c) => c.charCodeAt(0)),
    [0x0a, 0x00, 0x00, 0x00],
    [0x00, 0x00, 0x00, 0x00],
    [w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff],
    [h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff],
  );
}

function webpVp8l(width, height) {
  const packed = (width - 1) | ((height - 1) << 14);
  return u8(
    [...'RIFF'].map((c) => c.charCodeAt(0)),
    [0x15, 0x00, 0x00, 0x00],
    [...'WEBP'].map((c) => c.charCodeAt(0)),
    [...'VP8L'].map((c) => c.charCodeAt(0)),
    [0x05, 0x00, 0x00, 0x00],
    [0x2f],
    [packed & 0xff, (packed >> 8) & 0xff, (packed >> 16) & 0xff, (packed >> 24) & 0xff],
    [0x00],
  );
}

function webpVp8(width, height) {
  return u8(
    [...'RIFF'].map((c) => c.charCodeAt(0)),
    [0x1e, 0x00, 0x00, 0x00],
    [...'WEBP'].map((c) => c.charCodeAt(0)),
    [...'VP8 '].map((c) => c.charCodeAt(0)),
    [0x0a, 0x00, 0x00, 0x00],
    [0x00, 0x00, 0x00], // frame tag
    [0x9d, 0x01, 0x2a], // start code
    [width & 0xff, (width >> 8) & 0x3f],
    [height & 0xff, (height >> 8) & 0x3f],
  );
}

test('PNG: dimensions from IHDR', () => {
  assert.deepEqual(parseImageDimensions(pngHeader(1080, 1920)), { width: 1080, height: 1920, format: 'png' });
});

test('JPEG: dimensions from the SOF segment after APP segments', () => {
  assert.deepEqual(parseImageDimensions(jpegHeader(720, 1280)), { width: 720, height: 1280, format: 'jpeg' });
});

test('GIF: dimensions from the logical screen descriptor', () => {
  assert.deepEqual(parseImageDimensions(gifHeader(480, 640)), { width: 480, height: 640, format: 'gif' });
});

test('WebP VP8X: canvas dimensions (+1 encoding)', () => {
  assert.deepEqual(parseImageDimensions(webpVp8x(1920, 1080)), { width: 1920, height: 1080, format: 'webp' });
});

test('WebP VP8L: packed 14-bit dimensions', () => {
  assert.deepEqual(parseImageDimensions(webpVp8l(100, 200)), { width: 100, height: 200, format: 'webp' });
});

test('WebP VP8 (lossy): dimensions after the start code', () => {
  assert.deepEqual(parseImageDimensions(webpVp8(720, 1280)), { width: 720, height: 1280, format: 'webp' });
});

test('truncated or foreign bytes parse to null, never a crash', () => {
  assert.equal(parseImageDimensions(pngHeader(10, 10).slice(0, 10)), null);
  assert.equal(parseImageDimensions(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9, 0, 0, 0, 0, 0, 0])), null); // JPEG, no SOF
  assert.equal(parseImageDimensions(new TextEncoder().encode('{"not":"an image at all"}')), null);
  assert.equal(parseImageDimensions(new Uint8Array(0)), null);
});
