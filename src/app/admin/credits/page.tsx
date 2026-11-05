import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/app-shell';
import { adminNav } from '@/components/app/admin-nav';
import { createClient } from '@/lib/supabase-server';

type LedgerRow = {
  id: string;
  organization_id: string;
  entry_type: string;
  credits: number;
  balance_after: number;
  amount_cents: number | null;
  external_reference: string | null;
  description: string | null;
  created_at: string;
};

export default async function AdminCreditsPage() {
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
  if (!profile?.is_super_admin) redirect('/dashboard');

  const [{ data: ledger }, { data: wallets }, { data: orgs }] = await Promise.all([
    supabase
      .from('credit_ledger')
      .select('id, organization_id, entry_type, credits, balance_after, amount_cents, external_reference, description, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('credit_wallets').select('balance, lifetime_purchased, lifetime_used'),
    supabase.from('organizations').select('id, name'),
  ]);
  const rows = (ledger ?? []) as LedgerRow[];
  const orgName = new Map((orgs ?? []).map((org) => [org.id, org.name]));
  const revenueCents = rows
    .filter((row) => row.entry_type === 'purchase')
    .reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  const outstanding = (wallets ?? []).reduce((sum, wallet) => sum + wallet.balance, 0);
  const purchased = (wallets ?? []).reduce((sum, wallet) => sum + wallet.lifetime_purchased, 0);
  const used = (wallets ?? []).reduce((sum, wallet) => sum + wallet.lifetime_used, 0);

  return (
    <AppShell
      groups={adminNav('Credit Ledger')}
      crumbs={['Admin', 'Credit Ledger']}
      user={{ name: profile.display_name ?? 'Admin', email: user.email ?? '', role: 'Super Admin' }}
    >
      <div className="page-head">
        <div>
          <h1>Credit Ledger</h1>
          <p>Every credit movement across all workspaces — purchases granted by the Stripe webhook, grants, usage and refunds, newest first.</p>
        </div>
      </div>

      <div className="grid cols-4">
        <article className="stat"><span>Pack revenue</span><strong>${(revenueCents / 100).toFixed(2)}</strong><small>all time, purchases below</small></article>
        <article className="stat"><span>Outstanding balance</span><strong>{outstanding.toLocaleString()}</strong><small>credits across wallets</small></article>
        <article className="stat"><span>Purchased</span><strong>{purchased.toLocaleString()}</strong><small>credits, all time</small></article>
        <article className="stat"><span>Used</span><strong>{used.toLocaleString()}</strong><small>credits, all time</small></article>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No ledger entries yet. The first pack purchase or grant will appear here.</p>
        ) : (
          rows.map((row) => (
            <div className="ledger-row" key={row.id}>
              <div>
                <strong>{row.description ?? row.entry_type}</strong>
                <div className="small muted">
                  {orgName.get(row.organization_id) ?? row.organization_id} · {row.entry_type}
                  {row.external_reference ? ` · ${row.external_reference}` : ''}
                </div>
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
        .grid.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        @media (max-width: 900px) { .grid.cols-4 { grid-template-columns: 1fr 1fr; } }
        .stat { background: var(--surface-1); border: 1px solid var(--line); border-radius: 14px; padding: 16px; display: grid; gap: 3px; }
        .stat span { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-3); }
        .stat strong { font-size: 26px; }
        .stat small { color: var(--text-3); }
        .ledger-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
        .ledger-row:last-child { border-bottom: 0; }
        .ledger-amount { text-align: right; display: grid; gap: 2px; }
        .credit-plus { color: var(--emerald); font-weight: 700; }
        .credit-minus { color: var(--amber); font-weight: 700; }
      `}</style>
    </AppShell>
  );
}
