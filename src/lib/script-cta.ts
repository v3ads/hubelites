// Per-platform closing CTAs for generated video scripts (settled by
// Ayman, 2026-11-08 voice call).
//
// Video scripts close with a comment-keyword CTA instead of the generic
// "register at the destination" ending — the keyword is HUB (short, hard
// to misspell). The second half of the line matches how each platform
// can actually deliver the link:
//   Instagram / TikTok — "see the link in my bio"
//   YouTube (Shorts)   — "check the description for the link" (the
//                        HubRipple description fix puts the full
//                        caption + tracked link there)
// The invite leads to the Mission 1000 landing page — the wording stays
// "the invite"; no community language, and never the word "free".
// The matching comment automation lives in HubRipple (a separate step);
// this module only guarantees the spoken lines match it.
//
// Enforcement is deterministic, not left to the model: the engine is
// briefed on the lines AND this module rewrites the closing section
// before the asset is saved, so every render speaks the exact line for
// its channel. Other channels keep the destination CTA the engine
// wrote. The Say 1-2-3 sequence and the rest of the script are never
// touched — only the closing section changes.

export const INSTAGRAM_VIDEO_CTA = "Comment HUB and I'll send you the invite, or see the link in my bio.";
export const TIKTOK_VIDEO_CTA = INSTAGRAM_VIDEO_CTA;
export const YOUTUBE_VIDEO_CTA = "Comment HUB and I'll send you the invite, or check the description for the link.";

const CTA_BY_CHANNEL: Record<string, string> = {
  instagram: INSTAGRAM_VIDEO_CTA,
  tiktok: TIKTOK_VIDEO_CTA,
  youtube: YOUTUBE_VIDEO_CTA,
};

/** The exact spoken closing line for a channel, or null to keep the engine's destination CTA. */
export function closingCtaForChannel(channel: string | null | undefined): string | null {
  return CTA_BY_CHANNEL[(channel ?? '').trim().toLowerCase()] ?? null;
}

/**
 * Ensures a script's closing section is exactly the given CTA line.
 * - A [CTA ...] section (the engine's script format) has its content
 *   replaced with the line.
 * - With no CTA section, the line is appended as one — it becomes the
 *   last thing spoken either way.
 */
export function applyPlatformClosingCta(body: string, ctaLine: string): string {
  const ctaSection = body.match(/\[CTA[^\]]*\]/i);
  if (ctaSection && ctaSection.index !== undefined) {
    const head = body.slice(0, ctaSection.index).trimEnd();
    const section = `${ctaSection[0]} ${ctaLine}`;
    return head ? `${head}\n\n${section}\n` : `${section}\n`;
  }
  if (body.includes(ctaLine)) return body;
  return `${body.trimEnd()}\n\n[CTA] ${ctaLine}\n`;
}

/** Apply the per-platform closing-CTA rule for a generated asset body. */
export function applyClosingCta(body: string, assetType: string, channel: string | null | undefined): string {
  if (assetType !== 'script') return body;
  const ctaLine = closingCtaForChannel(channel);
  return ctaLine ? applyPlatformClosingCta(body, ctaLine) : body;
}
