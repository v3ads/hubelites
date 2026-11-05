// Server-only credit grants. Called from the Stripe webhook after a verified
// checkout.session.completed event. Idempotent on the Stripe session id:
// the credit_ledger carries a unique index on external_reference for
// purchases (migration 004), and this function checks before it writes, so
// a replayed webhook can never grant twice.

import { createAdminClient } from '@/lib/supabase-admin';
import { getPack } from '@/lib/credits';

export async function grantPackPurchase(input: {
  organizationId: string;
  packId: string;
  sessionId: string;
  amountTotalCents: number | null;
}): Promise<{ granted: boolean; reason?: string }> {
  const pack = getPack(input.packId);
  if (!pack) return { granted: false, reason: `Unknown pack ${input.packId}` };

  const admin = createAdminClient();

  const { data: existing, error: lookupError } = await admin
    .from('credit_ledger')
    .select('id')
    .eq('entry_type', 'purchase')
    .eq('external_reference', input.sessionId)
    .maybeSingle();
  if (lookupError) throw new Error(`Ledger lookup failed: ${lookupError.message}`);
  if (existing) return { granted: false, reason: 'already granted' };

  const { data: wallet, error: walletError } = await admin
    .from('credit_wallets')
    .select('balance, lifetime_purchased')
    .eq('organization_id', input.organizationId)
    .maybeSingle();
  if (walletError) throw new Error(`Wallet lookup failed: ${walletError.message}`);

  const balanceAfter = (wallet?.balance ?? 0) + pack.credits;
  const { error: upsertError } = await admin.from('credit_wallets').upsert(
    {
      organization_id: input.organizationId,
      balance: balanceAfter,
      lifetime_purchased: (wallet?.lifetime_purchased ?? 0) + pack.credits,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' },
  );
  if (upsertError) throw new Error(`Wallet update failed: ${upsertError.message}`);

  const { error: ledgerError } = await admin.from('credit_ledger').insert({
    organization_id: input.organizationId,
    entry_type: 'purchase',
    credits: pack.credits,
    balance_after: balanceAfter,
    amount_cents: input.amountTotalCents ?? pack.priceCents,
    external_reference: input.sessionId,
    description: `${pack.name} pack — ${pack.credits.toLocaleString()} credits`,
    metadata: { pack_id: pack.id, source: 'stripe_checkout' },
  });
  if (ledgerError) throw new Error(`Ledger insert failed: ${ledgerError.message}`);

  return { granted: true };
}
