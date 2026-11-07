// Minimal MP4 dimension probe (pure — no imports, unit-tested).
//
// Used as the fallback when HeyGen's video detail does not report the
// rendered dimensions: download the MP4 and read the video track's
// tkhd box, whose payload always ends with width and height as
// 16.16 fixed-point values.

export type Mp4Dimensions = { width: number; height: number };

function readU32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function boxType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

/** Parse one tkhd payload (starting after the box header) into dimensions. */
function parseTkhd(bytes: Uint8Array, payloadStart: number, payloadEnd: number): Mp4Dimensions | null {
  // width/height are the payload's final 8 bytes in every tkhd version.
  if (payloadEnd - payloadStart < 8) return null;
  const width = readU32(bytes, payloadEnd - 8) / 65536;
  const height = readU32(bytes, payloadEnd - 4) / 65536;
  if (!width || !height) return null;
  return { width: Math.round(width), height: Math.round(height) };
}

export function parseMp4Dimensions(bytes: Uint8Array): Mp4Dimensions | null {
  if (!bytes || bytes.length < 16) return null;
  let best: Mp4Dimensions | null = null;

  const consider = (dims: Mp4Dimensions | null) => {
    if (dims && (!best || dims.width * dims.height > best.width * best.height)) best = dims;
  };

  // Walk top-level / nested boxes generically: any 'tkhd' box found at a
  // plausible boundary counts; the largest track is the video track.
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    let size = readU32(bytes, offset);
    const type = boxType(bytes, offset + 4);
    let header = 8;
    if (size === 1) {
      // 64-bit largesize — rare; treat the rest conservatively.
      const hi = readU32(bytes, offset + 8);
      const lo = readU32(bytes, offset + 12);
      size = hi * 2 ** 32 + lo;
      header = 16;
    } else if (size === 0) {
      size = bytes.length - offset;
    }
    if (size < header || offset + size > bytes.length) break;
    if (type === 'tkhd') {
      consider(parseTkhd(bytes, offset + header, offset + size));
      offset += size;
      continue;
    }
    if (type === 'moov' || type === 'trak' || type === 'mdia') {
      offset += header; // descend into container boxes
      continue;
    }
    offset += size;
  }

  if (!best) {
    // Fallback: raw scan for a tkhd signature (covers unusual layouts).
    for (let i = 4; i + 8 < bytes.length; i++) {
      if (boxType(bytes, i) === 'tkhd') {
        const size = readU32(bytes, i - 4);
        if (size >= 16 && i + 4 + size - 8 <= bytes.length) {
          consider(parseTkhd(bytes, i + 4, i - 4 + size));
        }
      }
    }
  }
  return best;
}

/** True when the render is portrait in a Short-friendly ratio (9:16 ≈ 0.5625, 4:5 = 0.8). */
export function isPortraitShort(dims: Mp4Dimensions): boolean {
  if (dims.height <= dims.width) return false;
  const ratio = dims.width / dims.height;
  return ratio >= 0.45 && ratio <= 0.85;
}
