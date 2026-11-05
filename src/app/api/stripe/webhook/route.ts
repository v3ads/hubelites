import { NextResponse } from 'next/server';
import { parseStripeWebhook } from '@/lib/stripe';
import { grantPackPurchase } from '@/lib/credit-grants';

// Stripe webhook — grants credit packs on verified checkout completion.
// Signature verification happens before any state changes; grants are
// idempotent on the Stripe session id.
export async function POST(request: Request) {
  const rawBody = await request.text();
  let event;
  try {
    event = parseStripeWebhook(rawBody, request.headers.get('stripe-signature'));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid webhook.' },
      { status: 400 },
    );
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object;
  const organizationId = session.metadata?.organization_id || session.client_reference_id || '';
  const packId = session.metadata?.pack_id || '';
  if (session.payment_status !== 'paid' || !organizationId || !packId) {
    return NextResponse.json({ received: true, ignored: 'incomplete session' });
  }

  try {
    const result = await grantPackPurchase({
      organizationId,
      packId,
      sessionId: session.id,
      amountTotalCents: session.amount_total ?? null,
    });
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error('Stripe webhook grant failed:', error);
    return NextResponse.json({ error: 'Grant failed.' }, { status: 500 });
  }
}
