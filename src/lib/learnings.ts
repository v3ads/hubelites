// Learning loop (Phase 6, Slice C) — turns the ambassador's own tracked
// results into a short "what has worked" brief for the campaign engine.
//
// Honesty rules, by design:
// - A group (an audience, a content type) only becomes a signal with a
//   minimum body of evidence: at least MIN_PUBLICATIONS publications AND
//   at least MIN_HUMAN_CLICKS human (crawler-filtered) clicks. Below
//   that, the loop says nothing — "not enough data yet" beats a
//   confident story built on two clicks.
// - Signals rank by human clicks PER PUBLICATION, not raw totals, so a
//   format published ten times doesn't beat a better one published twice
//   just by volume.
// - The loop informs the generation brief only. It never publishes,
//   re-targets or changes approvals on its own, and the campaign page
//   shows exactly which signals a generation used.
import type { GroupStat } from './analytics.ts';

export const MIN_SIGNAL_PUBLICATIONS = 2;
export const MIN_SIGNAL_HUMAN_CLICKS = 5;
export const MIN_BEST_ASSET_HUMAN_CLICKS = 5;

export type LearningSignalsInput = {
  perAudience: GroupStat[];
  perAssetType: GroupStat[];
  bestPublication: { assetTitle: string | null; campaignTitle: string | null; human: number } | null;
};

const typeLabels: Record<string, string> = {
  social_post: 'Social posts',
  email: 'Emails',
  image: 'Graphics',
  video: 'Videos',
  carousel: 'Carousels',
  script: 'Avatar videos',
  landing_copy: 'Landing copy',
};

function rate(group: GroupStat): number {
  return group.publications > 0 ? group.human / group.publications : 0;
}

function rateText(group: GroupStat): string {
  const value = rate(group);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function qualifies(group: GroupStat): boolean {
  return group.publications >= MIN_SIGNAL_PUBLICATIONS && group.human >= MIN_SIGNAL_HUMAN_CLICKS;
}

/**
 * Returns up to three plain-language signal lines for the generation
 * brief, strongest first. An empty array means: not enough data yet —
 * generation proceeds exactly as before.
 */
export function extractLearningSignals(input: LearningSignalsInput): string[] {
  const lines: string[] = [];

  const audiences = input.perAudience.filter(qualifies).sort((a, b) => rate(b) - rate(a));
  if (audiences[0]) {
    const group = audiences[0];
    lines.push(
      `Audience "${group.label}" averages ${rateText(group)} human clicks per publication (${group.human} human clicks across ${group.publications} publications).`,
    );
  }

  const formats = input.perAssetType.filter(qualifies).sort((a, b) => rate(b) - rate(a));
  if (formats[0]) {
    const group = formats[0];
    lines.push(
      `${typeLabels[group.key] ?? group.key} are the strongest format so far: ${rateText(group)} human clicks per publication on average (${group.human} human clicks across ${group.publications} publications).`,
    );
  }

  if (input.bestPublication && input.bestPublication.human >= MIN_BEST_ASSET_HUMAN_CLICKS) {
    lines.push(
      `Best-performing post so far: "${input.bestPublication.assetTitle ?? 'Untitled'}"${input.bestPublication.campaignTitle ? ` (campaign "${input.bestPublication.campaignTitle}")` : ''} with ${input.bestPublication.human} human clicks.`,
    );
  }

  return lines;
}
