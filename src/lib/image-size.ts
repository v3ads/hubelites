// Minimal image dimension parser (pure — no imports, unit-tested).
//
// Used to probe the REAL shape of a HeyGen look's preview image before a
// render is requested: the 2026-11-07 proof showed that neither catalog
// orientation metadata nor the Avatar IV engine guarantees a full-frame
// portrait — HeyGen animates the source's own framing and pads the rest,
// so the only trustworthy pre-render shape signal is the source image's
// actual dimensions. Headers only: PNG IHDR, GIF logical screen, JPEG
// SOF segment scan, WebP VP8 / VP8L / VP8X canvas fields. Returns null
// for anything unrecognized or truncated — callers treat null as
// "unknown shape", never as a crash.

export type ImageDimensions = {
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'gif' | 'webp';
};

function u16be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u24le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function u32be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += String.fromCharCode(bytes[offset + i]);
  return out;
}

function parsePng(bytes: Uint8Array): ImageDimensions | null {
  // Signature (8) + IHDR chunk header (8): width/height are the first
  // two big-endian uint32 of the IHDR payload, at offsets 16 and 20.
  if (bytes.length < 24) return null;
  if (ascii(bytes, 12, 4) !== 'IHDR') return null;
  const width = u32be(bytes, 16);
  const height = u32be(bytes, 20);
  if (!width || !height) return null;
  return { width, height, format: 'png' };
}

function parseGif(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 10) return null;
  const width = u16le(bytes, 6);
  const height = u16le(bytes, 8);
  if (!width || !height) return null;
  return { width, height, format: 'gif' };
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function parseJpeg(bytes: Uint8Array): ImageDimensions | null {
  // Walk segments from SOI: each is 0xFF, marker, then (usually) a
  // big-endian length that includes its own two bytes. The first SOF
  // segment carries precision(1) + height(2) + width(2).
  let offset = 2; // skip SOI (FF D8)
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    let markerAt = offset + 1;
    while (markerAt < bytes.length && bytes[markerAt] === 0xff) markerAt++; // padding
    if (markerAt >= bytes.length) return null;
    const marker = bytes[markerAt];
    if (marker === 0xd9 || marker === 0xda) return null; // EOI / SOS: no SOF found
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset = markerAt + 1; // standalone markers carry no length
      continue;
    }
    const length = u16be(bytes, markerAt + 1);
    if (length < 2) return null;
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (markerAt + 8 > bytes.length) return null;
      const height = u16be(bytes, markerAt + 4);
      const width = u16be(bytes, markerAt + 6);
      if (!width || !height) return null;
      return { width, height, format: 'jpeg' };
    }
    offset = markerAt + 1 + length;
  }
  return null;
}

function parseWebp(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 21) return null;
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return null;
  const chunk = ascii(bytes, 12, 4);
  if (chunk === 'VP8X') {
    if (bytes.length < 30) return null;
    // Extended: 1 flag byte + 3 reserved, then canvas (width-1, height-1)
    // as little-endian uint24 at offsets 24 and 27.
    return { width: u24le(bytes, 24) + 1, height: u24le(bytes, 27) + 1, format: 'webp' };
  }
  if (chunk === 'VP8L') {
    // Lossless: 0x2F signature at 20, then width-1 and height-1 as two
    // 14-bit little-endian fields packed across bytes 21–24.
    if (bytes.length < 25 || bytes[20] !== 0x2f) return null;
    const packed = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    const width = (packed & 0x3fff) + 1;
    const height = ((packed >>> 14) & 0x3fff) + 1;
    return { width, height, format: 'webp' };
  }
  if (chunk === 'VP8 ') {
    // Lossy: 3-byte frame tag at 20, start code 9D 01 2A at 23–25, then
    // width/height as uint16 with two scale bits in the high positions.
    if (bytes.length < 30) return null;
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    const width = u16le(bytes, 26) & 0x3fff;
    const height = u16le(bytes, 28) & 0x3fff;
    if (!width || !height) return null;
    return { width, height, format: 'webp' };
  }
  return null;
}

/** Parse an image's dimensions from its leading bytes; null if unknown. */
export function parseImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (!bytes || bytes.length < 10) return null;
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return parsePng(bytes);
  }
  if (ascii(bytes, 0, 4) === 'GIF8') return parseGif(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return parseJpeg(bytes);
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return parseWebp(bytes);
  return null;
}
