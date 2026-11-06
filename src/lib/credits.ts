// HubElites credits — pack catalogue, cost estimates, and the purchase grant.
// Credits are the member-facing unit for paid generation (media first, per
// the blueprint). Text campaign generation is included during the founding
// phase (estimate 0) — the reserve/finalize plumbing exists so media jobs
// can charge through the same path later.

export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  blurb: string;
  priceEnvVar: string;
  featured?: boolean;
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 500,
    priceCents: 900,
    blurb: 'A first batch of media credits for images and short clips.',
    priceEnvVar: 'STRIPE_PRICE_PACK_STARTER',
  },
  {
    id: 'growth',
    name: 'Growth',
    credits: 2000,
    priceCents: 2900,
    blurb: 'The working pack for a weekly campaign rhythm.',
    priceEnvVar: 'STRIPE_PRICE_PACK_GROWTH',
    featured: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    credits: 6000,
    priceCents: 6900,
    blurb: 'For heavy media weeks and multiple campaigns in flight.',
    priceEnvVar: 'STRIPE_PRICE_PACK_SCALE',
  },
];

export function getPack(packId: string): CreditPack | null {
  return CREDIT_PACKS.find((pack) => pack.id === packId) ?? null;
}

/** Stripe price id for a pack, or null when checkout is not provisioned yet. */
export function packPriceId(pack: CreditPack): string | null {
  return process.env[pack.priceEnvVar] || null;
}

export type GenerationKind = 'text_campaign' | 'media_image' | 'media_video';

// Credit estimate per generation kind. Text is 0 during the founding phase
// (the Campaign Brain's provider costs are platform-borne and capped via the
// ai_spend_ledger). Media rates land with the Phase 4 adapters; the values
// below are the published planning rates the estimate UI will quote.
export const GENERATION_CREDIT_COSTS: Record<GenerationKind, number> = {
  text_campaign: 0,
  media_image: 12,
  media_video: 120,
};

export function estimateGenerationCredits(kind: GenerationKind): number {
  return GENERATION_CREDIT_COSTS[kind];
}
