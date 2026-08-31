import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AppShell, type NavGroup } from '@/components/app/app-shell';
import { Icon } from '@/components/icon';

export const metadata = { title: 'Platform Overview' };

const nav: NavGroup[] = [
  {
    items: [
      { label: 'Platform Overview', icon: 'grid', href: '/admin', active: true },
      { label: 'Members', icon: 'users', href: '#' },
      { label: 'Organizations', icon: 'layers', href: '#' },
      { label: 'Campaigns', icon: 'sparkles', href: '#' },
      { label: 'Media Jobs', icon: 'video', href: '#' },
    ],
  },
  {
    title: 'Control',
    items: [
      { label: 'Provider Catalog', icon: 'plug', href: '#' },
      { label: 'Credit Ledger', icon: 'credit', href: '#' },
      { label: 'Mission Brain', icon: 'brain', href: '#' },
      { label: 'System Health', icon: 'shield', href: '#' },
      { label: 'Audit Log', icon: 'lock', href: '#' },
    ],
  },
];

const kpis = [
  { label: 'Members', value: '247', delta: '+18 / 30d', tone: '', bars: [30, 38, 44, 52, 58, 70, 82] },
  { label: 'Campaigns', value: '1,483', delta: '+126 / 30d', tone: 'violet', bars: [26, 34, 40, 46, 60, 66, 78] },
  { label: 'Assets generated', value: '8,420', delta: '+912 / 30d', tone: 'cyan', bars: [20, 32, 38, 50, 56, 64, 74] },
  { label: 'Media credits used', value: '2,914', delta: 'Margin 61%', tone: 'lime', bars: [24, 30, 36, 44, 52, 62, 70] },
];

const tenants = [
  { org: 'Northline Coaching', owner: 'dana@northline.co', campaigns: 34, credits: 412, status: 'Healthy' },
  { org: 'Rivera Creative', owner: 'marco@riveracreative.com', campaigns: 27, credits: 286, status: 'Healthy' },
  { org: 'Summit Consulting', owner: 'ella@summitcg.com', campaigns: 19, credits: 154, status: 'Low credits' },
  { org: 'BrightPath Studio', owner: 'noah@brightpath.io', campaigns: 12, credits: 96, status: 'Onboarding' },
  { org: 'Harbor & Co.', owner: 'lena@harborco.com', campaigns: 8, credits: 62, status: 'Healthy' },
];

const health = [
  { name: 'Supabase', detail: 'Auth · Postgres · Storage', status: 'Operational', tone: 'ichip-emerald' },
  { name: 'Brevo SMTP', detail: 'Login codes · Campaign mail', status: 'Operational', tone: 'ichip-emerald' },
  { name: 'OpenRouter', detail: 'Reasoning + routing', status: 'Operational', tone: 'ichip-emerald' },
  { name: 'HeyGen', detail: 'Avatar video jobs', status: 'Degraded queue', tone: 'ichip-amber' },
  { name: 'Higgsfield', detail: 'Generative b-roll', status: 'Operational', tone: 'ichip-emerald' },
];

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single();
  if (!profile?.is_super_admin) redirect('/dashboard');

  const email = user.email ?? 'admin@hubelites.com';
  const name = ((user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0]) || 'Super Admin';

  return (
    <AppShell
      groups={nav}
      crumbs={['Platform', 'Overview']}
      user={{ name, email, role: 'Super Admin' }}
      badge={{ label: 'Super Admin', tone: 'pill-violet' }}
      action={
        <a className="btn" href="/dashboard">
          <Icon name="users" />
          View as member
        </a>
      }
    >
      <div className="page-head">
        <div>
          <h1>Platform overview</h1>
          <p>Global visibility across tenants, campaigns, media economics and system health.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="pill pill-live">
            <span className="dot" /> All core services up
          </span>
          <span className="pill pill-warn">1 provider degraded</span>
        </div>
      </div>

      <div className="kpis">
        {kpis.map((kpi) => (
          <article className={`kpi ${kpi.tone}`} key={kpi.label}>
            <div className="kpi-top">
              <span className="label">{kpi.label}</span>
              <span className="delta">{kpi.delta}</span>
            </div>
            <strong>{kpi.value}</strong>
            <div className="kpi-spark" aria-hidden="true">
              {kpi.bars.map((bar, index) => (
                <i key={index} style={{ height: `${bar}%` }} />
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="cols">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Tenant activity</h2>
              <p>Most active organizations in the last 30 days.</p>
            </div>
            <a className="btn btn-sm" href="#">
              All organizations
              <Icon name="arrow-up-right" />
            </a>
          </div>
          <div className="panel-body flush" style={{ padding: '16px 8px 8px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Owner</th>
                  <th>Campaigns</th>
                  <th>Credits</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.org}>
                    <td>
                      <b>{tenant.org}</b>
                    </td>
                    <td>{tenant.owner}</td>
                    <td>{tenant.campaigns}</td>
                    <td>{tenant.credits}</td>
                    <td>
                      <span
                        className={
                          tenant.status === 'Healthy'
                            ? 'pill pill-live'
                            : tenant.status === 'Low credits'
                              ? 'pill pill-warn'
                              : 'pill pill-accent'
                        }
                      >
                        {tenant.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>System health</h2>
              <p>Providers and core services.</p>
            </div>
          </div>
          <div className="health">
            {health.map((item) => (
              <div key={item.name}>
                <span className={`ichip ichip-sm ${item.tone}`}>
                  <Icon name={item.status === 'Operational' ? 'check' : 'bolt'} />
                </span>
                <div>
                  <b>{item.name}</b>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{item.detail}</div>
                </div>
                <small>{item.status}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="cols-3">
        <section className="panel">
          <div className="panel-head">
            <h2>Mission Brain</h2>
            <span className="pill pill-accent">Live</span>
          </div>
          <div className="panel-body">
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Approved Mission 1000 positioning, offers, claims and restrictions currently served to every campaign.
            </p>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <div className="row-item" style={{ padding: '10px 0', borderTop: 0 }}>
                <span className="ichip ichip-sm ichip-violet">
                  <Icon name="brain" />
                </span>
                <div>
                  <b>34 approved items</b>
                  <small>Last updated 2 days ago</small>
                </div>
              </div>
              <div className="meter meter-spectrum">
                <i style={{ width: '82%' }} />
              </div>
              <small style={{ fontSize: 11, color: 'var(--text-4)' }}>82% of items reviewed this cycle</small>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Media economics</h2>
            <span className="pill">30 days</span>
          </div>
          <div className="panel-body">
            <div className="credit-visual">
              <div className="row">
                <span>Credits sold</span>
                <b>7,480</b>
              </div>
              <div className="meter">
                <i style={{ width: '78%' }} />
              </div>
              <div className="row">
                <span>Credits consumed</span>
                <b>2,914</b>
              </div>
              <div className="meter meter-emerald">
                <i style={{ width: '39%' }} />
              </div>
              <div className="row">
                <span>Provider cost ratio</span>
                <b>39%</b>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Recent audit events</h2>
          </div>
          <div className="rows">
            <div className="row-item">
              <span className="ichip ichip-sm ichip-blue">
                <Icon name="lock" />
              </span>
              <div>
                <b>Super admin promoted</b>
                <small>bootstrap · 3 days ago</small>
              </div>
            </div>
            <div className="row-item">
              <span className="ichip ichip-sm ichip-amber">
                <Icon name="credit" />
              </span>
              <div>
                <b>Credit refund issued</b>
                <small>Summit Consulting · 18 credits</small>
              </div>
            </div>
            <div className="row-item">
              <span className="ichip ichip-sm ichip-violet">
                <Icon name="brain" />
              </span>
              <div>
                <b>Mission Brain item updated</b>
                <small>Webinar CTA copy · 2 days ago</small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
