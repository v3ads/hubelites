import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/app-shell';
import { Icon } from '@/components/icon';
import { memberNav } from '@/components/app/member-nav';
import { createClient } from '@/lib/supabase-server';
import { CREDIT_PACKS, packPriceId } from '@/lib/credits';
import { stripeConfigured } from '@/lib/stripe';
import { buyPack } from './actions';

type LedgerRow = {
  id: string;
  entry_type: string;
  credits: number;
  balance_after: number;
  amount_cents: number | null;
  description: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  grant: 'Grant',
  purchase: 'Purchase',
  usage: 'Usage',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect('/onboarding');
  const orgId = membership.organization_id;
  const orgName =
    (membership as unknown as { organizations: { name: string } | null }).organizations?.name ?? 'Workspace';

  const [{ data: wallet }, { data: ledger }] = await Promise.all([
    supabase.from('credit_wallets').select('*').eq('organization_id', orgId).maybeSingle(),
    supabase
      .from('credit_ledger')
      .select('id, entry_type, credits, balance_after, amount_cents, description, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  const rows = (ledger ?? []) as LedgerRow[];
  const balance = wallet?.balance ?? 0;
  const checkoutReady = stripeConfigured();

  return (
    <AppShell
      groups={memberNav('Credits', Boolean(profile?.is_super_admin))}
      crumbs={['Workspace', 'Credits']}
      user={{
        name: profile?.display_name ?? user.email ?? 'Ambassador',
        email: user.email ?? '',
        role: profile?.is_super_admin ? 'Super Admin' : 'Ambassador',
      }}
      credits={wallet && wallet.lifetime_purchased > 0 ? { used: wallet.lifetime_used, total: wallet.lifetime_purchased } : undefined}
      action={
        <a className="btn btn-primary" href="/campaigns/new">
          <Icon name="sparkles" />
          Create with AI
        </a>
      }
    >
      <div className="page-head">
        <div>
          <h1>Credits</h1>
          <p>
            Credits power media generation in {orgName} — images and video. Text campaign writing is included
            during the founding phase, so your balance is reserved for the work that costs real compute.
          </p>
        </div>
        <span className="pill">{balance.toLocaleString()} credits available</span>
      </div>

      {checkout === 'success' && (
        <div className="alert alert-success">
          Payment received. Your credits are being added — they appear below within a few seconds.
        </div>
      )}
      {checkout === 'cancelled' && (
        <div className="alert">Checkout was cancelled. No charge was made and your balance is unchanged.</div>
      )}
      {checkout === 'unavailable' && (
        <div className="alert alert-error">
          Pack checkout is not open yet. Your balance and history below are live; purchasing opens shortly.
        </div>
      )}

      <div className="grid cols-3">
        <article className="stat">
          <span>Balance</span>
          <strong>{balance.toLocaleString()}</strong>
          <small>credits ready to spend</small>
        </article>
        <article className="stat">
          <span>Purchased</span>
          <strong>{(wallet?.lifetime_purchased ?? 0).toLocaleString()}</strong>
          <small>credits, all time</small>
        </article>
        <article className="stat">
          <span>Used</span>
          <strong>{(wallet?.lifetime_used ?? 0).toLocaleString()}</strong>
          <small>credits, all time</small>
        </article>
      </div>

      <h2 className="section-title">Credit packs</h2>
      <div className="grid cols-3">
        {CREDIT_PACKS.map((pack) => {
          const canBuy = checkoutReady && Boolean(packPriceId(pack));
          return (
            <article className={`card${pack.featured ? ' pack-featured' : ''}`} key={pack.id}>
              <div className="pack-top">
                <h3>{pack.name}</h3>
                {pack.featured && <span className="tag tag-teal">Most popular</span>}
              </div>
              <p className="pack-credits">
                <strong>{pack.credits.toLocaleString()}</strong> credits
              </p>
              <p className="muted">{pack.blurb}</p>
              <p className="pack-price">
                ${(pack.priceCents / 100).toFixed(0)}
                <small> one-time · ${(pack.priceCents / 100 / pack.credits).toFixed(3).replace(/0$/, '')} per credit</small>
              </p>
              <form action={buyPack}>
                <input type="hidden" name="pack_id" value={pack.id} />
                <button className="btn btn-primary" type="submit" disabled={!canBuy}>
                  {canBuy ? `Buy ${pack.name}` : 'Checkout opens shortly'}
                </button>
              </form>
            </article>
          );
        })}
      </div>
      <p className="small muted">
        Packs are one-time purchases processed by Stripe and never expire. Credits have no cash value and are
        spent only on generation you approve — every spend is estimated and shown before it starts.
      </p>

      <h2 className="section-title">History</h2>
      <section className="card">
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No credit activity yet. Purchases, grants and generation spend will appear here as they happen.
          </p>
        ) : (
          rows.map((row) => (
            <div className="ledger-row" key={row.id}>
              <div>
                <strong>{row.description ?? TYPE_LABELS[row.entry_type] ?? row.entry_type}</strong>
                <div className="small muted">
                  {new Date(row.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  {row.amount_cents ? ` · $${(row.amount_cents / 100).toFixed(2)}` : ''}
                </div>
              </div>
              <div className="ledger-amount">
                <span className={row.credits >= 0 ? 'credit-plus' : 'credit-minus'}>
                  {row.credits >= 0 ? '+' : ''}
                  {row.credits.toLocaleString()}
                </span>
                <small className="muted">balance {row.balance_after.toLocaleString()}</small>
              </div>
            </div>
          ))
        )}
      </section>

      <style>{`
        .grid { display: grid; gap: 14px; margin: 14px 0; }
        .grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 900px) { .grid.cols-3 { grid-template-columns: 1fr; } }
        .stat { background: var(--surface-1); border: 1px solid var(--line); border-radius: 14px; padding: 16px; display: grid; gap: 3px; }
        .stat span { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-3); }
        .stat strong { font-size: 26px; }
        .stat small { color: var(--text-3); }
        .pack-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .pack-top h3 { margin: 0; }
        .pack-credits { font-size: 20px; margin: 10px 0 4px; }
        .pack-price { font-size: 22px; font-weight: 700; margin: 12px 0; }
        .pack-price small { font-size: 12px; font-weight: 500; color: var(--text-3); }
        .pack-featured { border-color: var(--emerald); box-shadow: 0 0 0 1px var(--emerald); }
        .ledger-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
        .ledger-row:last-child { border-bottom: 0; }
        .ledger-amount { text-align: right; display: grid; gap: 2px; }
        .credit-plus { color: var(--emerald); font-weight: 700; }
        .credit-minus { color: var(--amber); font-weight: 700; }
      `}</style>
    </AppShell>
  );
}
