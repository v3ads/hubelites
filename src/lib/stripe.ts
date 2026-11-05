// Minimal Stripe REST client (no SDK dependency) — Checkout Sessions for
// credit-pack purchases and webhook signature verification for grants.
// Server-only: uses STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.

import { createHmac, timingSafeEqual } from 'node:crypto';

const STRIPE_API = 'https://api.stripe.com/v1';

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

type CheckoutSession = { id: string; url: string };

export async function createPackCheckoutSession(input: {
  priceId: string;
  organizationId: string;
  packId: string;
  credits: number;
  customerEmail: string;
  appUrl: string;
}): Promise<CheckoutSession> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('STRIPE_SECRET_KEY is not configured.');

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('line_items[0][price]', input.priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', `${input.appUrl}/credits?checkout=success`);
  params.set('cancel_url', `${input.appUrl}/credits?checkout=cancelled`);
  params.set('client_reference_id', input.organizationId);
  params.set('customer_email', input.customerEmail);
  params.set('metadata[organization_id]', input.organizationId);
  params.set('metadata[pack_id]', input.packId);
  params.set('metadata[credits]', String(input.credits));
  params.set('payment_intent_data[metadata][organization_id]', input.organizationId);
  params.set('payment_intent_data[metadata][pack_id]', input.packId);

  const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !data.id || !data.url) {
    throw new Error(data.error?.message || `Stripe checkout session failed (${response.status}).`);
  }
  return { id: data.id, url: data.url };
}

export type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      amount_total?: number | null;
      client_reference_id?: string | null;
      metadata?: Record<string, string>;
    };
  };
};

/** Verify a Stripe webhook signature (v1 scheme) and parse the event. */
export function parseStripeWebhook(rawBody: string, signatureHeader: string | null): StripeEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  if (!signatureHeader) throw new Error('Missing stripe-signature header.');

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((piece) => {
      const idx = piece.indexOf('=');
      return [piece.slice(0, idx).trim(), piece.slice(idx + 1).trim()];
    }),
  );
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) throw new Error('Malformed stripe-signature header.');

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) throw new Error('Webhook timestamp outside tolerance.');

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) {
    throw new Error('Webhook signature verification failed.');
  }
  return JSON.parse(rawBody) as StripeEvent;
}
