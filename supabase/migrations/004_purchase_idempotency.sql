-- HubElites — Phase 3: purchase idempotency for Stripe-granted credits.
-- A checkout session may be delivered by Stripe more than once; the ledger
-- records the session id as external_reference on purchase rows, and this
-- partial unique index makes a second grant for the same session impossible
-- at the database level (the webhook handler also checks before writing).

create unique index credit_ledger_purchase_reference_uidx
  on public.credit_ledger (external_reference)
  where entry_type = 'purchase' and external_reference is not null;
