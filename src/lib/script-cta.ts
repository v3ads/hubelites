// Closing-CTA rules for generated scripts (2026-11-08, Ayman's call).
//
// For Instagram-bound video scripts, the spoken closing line is a
// comment-keyword CTA — exactly INSTAGRAM_VIDEO_CTA — instead of the
// generic "register at the destination" ending. The keyword is HUB
// (short, hard to misspell); the matching comment automation in
// HubRipple is a separate later step — this module only guarantees the
// spoken line matches it.
//
// The rule is enforced deterministically on the generated body, not left
// to the model: the engine is briefed on it AND this function rewrites
// the closing section before the asset is saved, so every render of an
// Instagram script speaks the exact line. Other channels keep the
// destination CTA the engine wrote. The Say 1-2-3 sequence and the rest
// of the script are never touched — only the closing section changes.

export const INSTAGRAM_VIDEO_CTA = "Comment HUB and I'll send you the invite.";

export function isInstagramChannel(channel: string | null | undefined): boolean {
  return (channel ?? '').trim().toLowerCase() === 'instagram';
}

/**
 * Ensures an Instagram script's closing section is exactly the HUB CTA.
 * - A [CTA ...] section (the engine's script format) has its content
 *   replaced with the exact line.
 * - With no CTA section, the line is appended as one — it becomes the
 *   last thing spoken either way.
 * - Already correct → returned unchanged.
 */
export function applyInstagramClosingCta(body: string): string {
  const ctaSection = body.match(/\[CTA[^\]]*\]/i);
  if (ctaSection && ctaSection.index !== undefined) {
    const head = body.slice(0, ctaSection.index).trimEnd();
    const section = `${ctaSection[0]} ${INSTAGRAM_VIDEO_CTA}`;
    return head ? `${head}\n\n${section}\n` : `${section}\n`;
  }
  if (body.includes(INSTAGRAM_VIDEO_CTA)) return body;
  return `${body.trimEnd()}\n\n[CTA] ${INSTAGRAM_VIDEO_CTA}\n`;
}

/** Apply the platform closing-CTA rule for a generated asset body. */
export function applyClosingCta(body: string, assetType: string, channel: string | null | undefined): string {
  if (assetType === 'script' && isInstagramChannel(channel)) return applyInstagramClosingCta(body);
  return body;
}
