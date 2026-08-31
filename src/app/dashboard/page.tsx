import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AppShell, type NavGroup } from '@/components/app/app-shell';
import { Icon } from '@/components/icon';

export const metadata = { title: 'Dashboard' };

const nav: NavGroup[] = [
  {
    items: [
      { label: 'Home', icon: 'grid', href: '/dashboard', active: true },
      { label: 'Campaigns', icon: 'layers', href: '#' },
      { label: 'Create', icon: 'sparkles', href: '#', tag: 'AI' },
      { label: 'Content', icon: 'image', href: '#' },
      { label: 'Calendar', icon: 'calendar', href: '#' },
      { label: 'Prospects', icon: 'users', href: '#' },
      { label: 'Analytics', icon: 'chart', href: '#' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Brand', icon: 'wand', href: '#' },
      { label: 'Connections', icon: 'plug', href: '#' },
      { label: 'Credits', icon: 'credit', href: '#' },
      { label: 'Settings', icon: 'settings', href: '#' },
    ],
  },
];

const kpis = [
  { label: 'Content ready', value: '11', delta: '+4 this week', tone: '', bars: [30, 44, 38, 56, 50, 72, 84] },
  { label: 'Scheduled', value: '7', delta: '+2 vs last week', tone: 'violet', bars: [22, 30, 42, 38, 54, 60, 66] },
  { label: 'Published', value: '4', delta: 'On track', tone: 'cyan', bars: [18, 26, 24, 40, 44, 52, 58] },
  { label: 'Funnel visits', value: '83', delta: '+23%', tone: 'lime', bars: [26, 34, 30, 48, 56, 68, 88] },
];

const board = [
  {
    title: 'Drafting',
    count: 2,
    cards: [
      { title: 'Coach objection short #3', meta: 'Video · 00:31' },
      { title: 'Creator email — nurture', meta: 'Email · 320 words' },
    ],
  },
  {
    title: 'Needs approval',
    count: 3,
    cards: [
      { title: 'Wednesday short — coaches', meta: 'Video · 00:34' },
      { title: 'LinkedIn carousel', meta: 'Graphic · 6 slides' },
      { title: 'Mission invite email', meta: 'Email · 210 words' },
    ],
  },
  {
    title: 'Scheduled',
    count: 4,
    cards: [
      { title: 'Ownership hook short', meta: 'Tue 9:00am' },
      { title: 'Case-angle post', meta: 'Thu 12:30pm' },
    ],
  },
  {
    title: 'Published',
    count: 4,
    cards: [
      { title: '“Rented audience” short', meta: '412 views · 38 clicks' },
      { title: 'Founder story post', meta: '203 views · 11 clicks' },
    ],
  },
];

const week: { day: string; chips: { label: string; tone: string }[] }[] = [
  { day: 'Mon', chips: [{ label: 'Short 01', tone: 'blue' }] },
  {
    day: 'Tue',
    chips: [
      { label: 'Post', tone: 'violet' },
      { label: 'Email', tone: 'cyan' },
    ],
  },
  { day: 'Wed', chips: [{ label: 'Short 02', tone: 'blue' }] },
  { day: 'Thu', chips: [{ label: 'Carousel', tone: 'lime' }] },
  {
    day: 'Fri',
    chips: [
      { label: 'Short 03', tone: 'blue' },
      { label: 'Post', tone: 'violet' },
    ],
  },
  { day: 'Sat', chips: [] },
  { day: 'Sun', chips: [{ label: 'Recap email', tone: 'cyan' }] },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const email = user.email ?? 'ambassador@hubelites.com';
  const name = ((user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0]) || 'Ambassador';

  return (
    <AppShell
      groups={nav}
      crumbs={['Workspace', 'Home']}
      user={{ name, email, role: 'Ambassador' }}
      credits={{ used: 36, total: 120 }}
      action={
        <a className="btn btn-primary" href="#">
          <Icon name="sparkles" />
          Create with AI
        </a>
      }
    >
      <div className="page-head">
        <div>
          <h1>Good to see you, {name.split(/[ .]/)[0]}.</h1>
          <p>Your Mission 1000 campaign has 5 assets waiting for approval this week.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="pill pill-live">
            <span className="dot" /> Campaign brain active
          </span>
          <span className="pill">Week 34</span>
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
              <h2>Next best action</h2>
              <p>Coach-focused video is currently your strongest campaign format.</p>
            </div>
            <span className="pill pill-accent">Recommended</span>
          </div>
          <div className="panel-body">
            <div className="preview-stage">
              <span className="preview-badge pill pill-live">
                <span className="dot" /> Ready
              </span>
              <button type="button" className="play" aria-label="Play preview">
                <Icon name="play" strokeWidth={0} style={{ fill: 'currentColor' }} />
              </button>
              <div className="preview-meta">
                <b>Mission 1000 — Coaches</b>
                <small>00:34 · Vertical short · Hook: &ldquo;Build what you control&rdquo;</small>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary">
                <Icon name="check" />
                Approve &amp; schedule
              </button>
              <button type="button" className="btn">
                <Icon name="wand" />
                Edit script
              </button>
              <button type="button" className="btn btn-ghost">
                Regenerate
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>AI recommendations</h2>
              <p>What HubElites thinks you should do next.</p>
            </div>
          </div>
          <div className="rows">
            <div className="row-item">
              <span className="ichip ichip-sm ichip-blue">
                <Icon name="trend" />
              </span>
              <div>
                <b>Run another coach campaign</b>
                <small>4.3× more clicks than generic content.</small>
              </div>
              <Icon name="arrow" width={16} height={16} />
            </div>
            <div className="row-item">
              <span className="ichip ichip-sm ichip-violet">
                <Icon name="plug" />
              </span>
              <div>
                <b>Finish your YouTube connection</b>
                <small>2 videos are ready to publish.</small>
              </div>
              <Icon name="arrow" width={16} height={16} />
            </div>
            <div className="row-item">
              <span className="ichip ichip-sm ichip-emerald">
                <Icon name="credit" />
              </span>
              <div>
                <b>Credit balance is healthy</b>
                <small>84 credits remaining this cycle.</small>
              </div>
              <Icon name="arrow" width={16} height={16} />
            </div>
            <div className="row-item">
              <span className="ichip ichip-sm ichip-amber">
                <Icon name="target" />
              </span>
              <div>
                <b>Add a second audience</b>
                <small>Consultants share 70% of your winning angle.</small>
              </div>
              <Icon name="arrow" width={16} height={16} />
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Campaign pipeline</h2>
            <p>Everything HubElites generated for Mission 1000 · Coaches.</p>
          </div>
          <a className="btn btn-sm" href="#">
            Open campaign
            <Icon name="arrow-up-right" />
          </a>
        </div>
        <div className="panel-body">
          <div className="board">
            {board.map((column) => (
              <div className="board-col" key={column.title}>
                <header>
                  {column.title}
                  <span>{column.count}</span>
                </header>
                {column.cards.map((card) => (
                  <article className="board-card" key={card.title}>
                    <b>{card.title}</b>
                    <div className="meta">
                      <span>{card.meta}</span>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>This week&apos;s calendar</h2>
            <p>Cadence generated by the Campaign Brain.</p>
          </div>
          <span className="pill">7 slots · 9 assets</span>
        </div>
        <div className="panel-body">
          <div className="week">
            {week.map((day) => (
              <div className="week-day" key={day.day}>
                <span>{day.day}</span>
                {day.chips.map((chip) => (
                  <span className={`week-chip ${chip.tone}`} key={chip.label}>
                    {chip.label}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
