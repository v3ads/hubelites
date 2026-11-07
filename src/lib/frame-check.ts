// Flat-band (letterbox) detection over per-row luminance statistics
// (pure — no imports, unit-tested).
//
// Why this exists: the media-jobs format gate originally probed the
// rendered FILE's dimensions, and the 2026-11-07 proof render passed it
// while being unusable — the MP4 was 1080×1920, but the picture occupied
// only the middle ~third, padded above and below with flat off-white
// bands (pixel-sampled at RGB 243,244,249). HeyGen's video detail
// exposes a thumbnail still of the render (in practice a WebP frame
// grab, despite the .jpeg file name); media-jobs.ts decodes it and
// reduces it to one {mean, stdev} pair per row, and this function
// decides whether those rows describe padding bands around a picture.
//
// Verdict discipline: 'padded' is the only verdict that fails a job, and
// it requires the full signature — long near-uniform runs at BOTH ends,
// of matching color, around a middle that actually has content. Any
// doubt (too few rows, a wholly flat frame, bands of different colors)
// resolves to 'full' or 'unknown', never to a charge-blocking guess.

export type RowStat = { mean: number; stdev: number };

export type PaddingVerdict = {
  verdict: 'padded' | 'full' | 'unknown';
  /** Share of rows in the top flat band (0 when not padded). */
  topShare: number;
  /** Share of rows in the bottom flat band (0 when not padded). */
  bottomShare: number;
};

export const PADDING_THRESHOLDS = {
  /** A row counts as flat when its luminance stdev is at most this. */
  flatStdev: 6,
  /** Band rows must stay within this many luminance points of the band mean. */
  bandMeanTolerance: 6,
  /** Top and bottom band means must agree within this (same pad color). */
  bandColorTolerance: 8,
  /** Each band must cover at least this share of the frame height. */
  minBandShare: 0.1,
  /** Both bands together must cover at least this share. */
  minTotalBandShare: 0.3,
  /** The non-band middle must cover at least this share to be judged. */
  minMiddleShare: 0.15,
  /** The middle must average at least this stdev — proof it has content. */
  minMiddleStdev: 12,
  /** Fewer rows than this cannot support a verdict. */
  minRows: 24,
};

/** Length of the flat run starting at `start`, walking in `step` direction. */
function flatRun(rows: RowStat[], start: number, step: 1 | -1): number {
  let count = 0;
  let meanSum = 0;
  for (let i = start; i >= 0 && i < rows.length; i += step) {
    const row = rows[i];
    if (row.stdev > PADDING_THRESHOLDS.flatStdev) break;
    const bandMean = count === 0 ? row.mean : meanSum / count;
    if (count > 0 && Math.abs(row.mean - bandMean) > PADDING_THRESHOLDS.bandMeanTolerance) break;
    meanSum += row.mean;
    count++;
  }
  return count;
}

function meanOf(rows: RowStat[], from: number, to: number, pick: (row: RowStat) => number): number {
  if (to <= from) return 0;
  let sum = 0;
  for (let i = from; i < to; i++) sum += pick(rows[i]);
  return sum / (to - from);
}

export function detectPaddingBands(rows: RowStat[]): PaddingVerdict {
  const total = rows.length;
  if (total < PADDING_THRESHOLDS.minRows) return { verdict: 'unknown', topShare: 0, bottomShare: 0 };

  const topCount = flatRun(rows, 0, 1);
  const bottomCount = flatRun(rows, total - 1, -1);
  const middleFrom = topCount;
  const middleTo = total - bottomCount;
  const middleCount = middleTo - middleFrom;

  const none: PaddingVerdict = { verdict: 'full', topShare: 0, bottomShare: 0 };
  if (middleCount < total * PADDING_THRESHOLDS.minMiddleShare) {
    // Bands (or flatness) swallow the frame — a blank or near-blank
    // still is not evidence of letterboxing.
    return { verdict: 'unknown', topShare: 0, bottomShare: 0 };
  }

  const topShare = topCount / total;
  const bottomShare = bottomCount / total;
  if (topShare < PADDING_THRESHOLDS.minBandShare || bottomShare < PADDING_THRESHOLDS.minBandShare) return none;
  if (topShare + bottomShare < PADDING_THRESHOLDS.minTotalBandShare) return none;

  const topMean = meanOf(rows, 0, topCount, (row) => row.mean);
  const bottomMean = meanOf(rows, middleTo, total, (row) => row.mean);
  if (Math.abs(topMean - bottomMean) > PADDING_THRESHOLDS.bandColorTolerance) return none;

  const middleStdev = meanOf(rows, middleFrom, middleTo, (row) => row.stdev);
  if (middleStdev < PADDING_THRESHOLDS.minMiddleStdev) {
    return { verdict: 'unknown', topShare: 0, bottomShare: 0 };
  }

  return { verdict: 'padded', topShare, bottomShare };
}
