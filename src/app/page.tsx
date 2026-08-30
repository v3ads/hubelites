import { ThemeToggle } from '@/components/theme-toggle';

function Icon({ name }: { name: 'brain' | 'video' | 'send' | 'chart' | 'spark' | 'target' | 'shield' | 'check' | 'arrow' }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true } as const;
  switch (name) {
    case 'brain':
      return <svg {...common}><path d="M9.5 4.6A3.1 3.1 0 0 0 4.7 7.2a3.3 3.3 0 0 0 .6 5.7A3.5 3.5 0 0 0 9 17.8V20M14.5 4.6a3.1 3.1 0 0 1 4.8 2.6 3.3 3.3 0 0 1-.6 5.7 3.5 3.5 0 0 1-3.7 4.9V20M9.5 6.5c1 .2 1.8.9 2.5 1.8.7-.9 1.5-1.6 2.5-1.8M12 8.3V20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'video':
      return <svg {...common}><rect x="3" y="5" width="13" height="14" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="m16 9 5-2v10l-5-2V9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m8 9 4 3-4 3V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
    case 'send':
      return <svg {...common}><path d="m4 4 16 8-16 8 3-8-3-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M7 12h13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case 'chart':
      return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="m4 7 5-3 6 4 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'spark':
      return <svg {...common}><path d="M12 2.5 13.9 8l5.6 1.9-5.6 1.9L12 17.5l-1.9-5.7-5.6-1.9L10.1 8 12 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" fill="currentColor"/></svg>;
    case 'target':
      return <svg {...common}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="m14.5 9.5 6-6M17 3.5h3.5V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 3 5 6v5.2c0 4.4 2.8 7.8 7 9.8 4.2-2 7-5.4 7-9.8V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'arrow':
      return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    default:
      return null;
  }
}

const engines = [
  { icon: 'target' as const, number: '01', title: 'Audience Intelligence', copy: 'Choose who you want to reach. HubElites sharpens the angle, pain points, objections and language before a single asset is created.' },
  { icon: 'brain' as const, number: '02', title: 'Campaign Brain', copy: 'One strategy becomes a coordinated weekly campaign instead of a pile of unrelated AI outputs.' },
  { icon: 'video' as const, number: '03', title: 'AI Media Studio', copy: 'Generate short-form video concepts, scripts, social posts, emails and graphics with a consistent campaign message.' },
  { icon: 'send' as const, number: '04', title: 'Distribution Layer', copy: 'Approve, export and eventually publish across your channels while every call to action points to your Ambassador funnel.' },
  { icon: 'chart' as const, number: '05', title: 'Learning Loop', copy: 'Track what earns attention and clicks, then feed those signals into the next campaign instead of starting from zero.' },
];

const oldWay = ['Blank-page prompting every week', 'Generic content aimed at everyone', 'Disconnected posts, videos and emails', 'Manual campaign planning and repetition', 'No consistent learning loop'];
const eliteWay = ['Audience-first campaign intelligence', 'One coordinated message across every asset', 'Video, social and email generated together', 'A repeatable weekly growth workflow', 'Performance signals improve what comes next'];

export default function HomePage() {
  return (
    <main className="marketing-shell">
      <div className="marketing-ambient marketing-ambient-one" />
      <div className="marketing-ambient marketing-ambient-two" />

      <header className="marketing-nav">
        <div className="marketing-container nav-inner">
          <a className="brand brand-premium" href="/" aria-label="HubElites home">
            <span className="brand-symbol"><span>H</span></span>
            <span>HubElites</span>
          </a>
          <nav className="marketing-links" aria-label="Primary navigation">
            <a href="#system">The System</a>
            <a href="#engines">Engines</a>
            <a href="#workflow">Workflow</a>
            <a href="#difference">Why HubElites</a>
          </nav>
          <div className="marketing-actions">
            <ThemeToggle />
            <a className="btn btn-quiet" href="/login">Log in</a>
            <a className="btn btn-primary premium-cta" href="/onboarding">Start building <span>→</span></a>
          </div>
        </div>
      </header>

      <section className="marketing-container premium-hero">
        <div className="hero-copy">
          <div className="signal-badge"><span className="signal-dot" /> Built for eStage Ambassadors</div>
          <h1>Turn your Ambassador domain into an <span className="gradient-text">AI growth system.</span></h1>
          <p className="hero-lead">HubElites thinks like a strategist, creates like a content team, and turns one audience decision into a coordinated week of marketing that drives people to your own syndicated Mission 1000 funnel.</p>
          <div className="hero-actions">
            <a className="btn btn-primary btn-large" href="/onboarding">Build my first campaign <span className="btn-icon"><Icon name="arrow" /></span></a>
            <a className="btn btn-glass btn-large" href="#system">See how it works</a>
          </div>
          <div className="hero-proof-row">
            <div><strong>1</strong><span>audience decision</span></div>
            <i />
            <div><strong>1</strong><span>campaign brain</span></div>
            <i />
            <div><strong>12+</strong><span>ready-to-use assets</span></div>
          </div>
          <p className="independent-note">Independent platform designed for eStage Ambassadors. Not affiliated with or endorsed by eStage.</p>
        </div>

        <div className="hero-stage" aria-label="HubElites campaign interface preview">
          <div className="stage-glow" />
          <div className="hero-app-window">
            <div className="app-window-top">
              <div className="app-window-brand"><span className="mini-symbol">H</span><span>Campaign Studio</span></div>
              <div className="app-window-status"><span /> AI online</div>
            </div>
            <div className="app-window-grid">
              <aside className="app-mini-sidebar">
                <span className="mini-nav active"><i /> Campaign</span>
                <span className="mini-nav"><i /> Content</span>
                <span className="mini-nav"><i /> Calendar</span>
                <span className="mini-nav"><i /> Analytics</span>
              </aside>
              <div className="campaign-canvas">
                <div className="canvas-heading">
                  <div><span className="micro-label">WEEKLY CAMPAIGN</span><h3>Mission 1000 · Coaches</h3></div>
                  <span className="campaign-ready">Ready</span>
                </div>
                <div className="strategy-strip">
                  <div><span>Audience</span><b>Course creators</b></div>
                  <div><span>Angle</span><b>Stop renting your audience</b></div>
                  <div><span>Goal</span><b>Funnel visits</b></div>
                </div>
                <div className="content-preview-grid">
                  <div className="video-preview">
                    <div className="video-preview-top"><span>SHORT 01</span><span>00:28</span></div>
                    <div className="video-orb"><span className="play-triangle" /></div>
                    <div className="video-copy"><b>“What if your next audience already exists?”</b><span>Vertical video · 9:16</span></div>
                  </div>
                  <div className="asset-stack">
                    <div className="asset-line"><span className="asset-line-icon"><Icon name="video" /></span><div><b>3 short videos</b><span>Scripted & branded</span></div><em>100%</em></div>
                    <div className="asset-line"><span className="asset-line-icon"><Icon name="send" /></span><div><b>5 social posts</b><span>Platform-ready copy</span></div><em>100%</em></div>
                    <div className="asset-line"><span className="asset-line-icon"><Icon name="spark" /></span><div><b>2 email angles</b><span>Nurture + invitation</span></div><em>100%</em></div>
                  </div>
                </div>
                <div className="canvas-footer"><span><i className="pulse-dot" /> Campaign intelligence complete</span><button>Approve campaign →</button></div>
              </div>
            </div>
          </div>
          <div className="floating-card floating-card-top"><span className="float-icon"><Icon name="spark" /></span><div><small>AI recommendation</small><b>Coach audience is strongest</b></div></div>
          <div className="floating-card floating-card-bottom"><small>Tracked funnel visits</small><div><strong>147</strong><span>+23%</span></div></div>
        </div>
      </section>

      <section className="marketing-container trust-strip" id="system">
        <div className="trust-kicker">FROM ONE DECISION TO A COMPLETE CAMPAIGN</div>
        <div className="trust-flow">
          <div><span className="trust-icon"><Icon name="target" /></span><b>Choose an audience</b><small>Coaches, creators, local businesses, consultants</small></div>
          <span className="trust-arrow">→</span>
          <div><span className="trust-icon"><Icon name="brain" /></span><b>Build the strategy</b><small>Angle, hooks, objections, CTAs and cadence</small></div>
          <span className="trust-arrow">→</span>
          <div><span className="trust-icon"><Icon name="spark" /></span><b>Create the assets</b><small>Video, posts, emails and graphics in one voice</small></div>
          <span className="trust-arrow">→</span>
          <div><span className="trust-icon"><Icon name="send" /></span><b>Drive the traffic</b><small>Every CTA points to your own Mission destination</small></div>
        </div>
      </section>

      <section className="premium-section marketing-container" id="engines">
        <div className="section-intro split-intro">
          <div><span className="section-kicker">THE HUBELITES SYSTEM</span><h2>Five engines. <span className="gradient-text">One growth loop.</span></h2></div>
          <p>Most AI tools give you outputs. HubElites is designed around a repeatable operating system: decide who matters, build a campaign, create the media, distribute it, learn, repeat.</p>
        </div>
        <div className="engine-grid">
          {engines.map((engine, index) => (
            <article className={`engine-card ${index === 0 ? 'engine-card-featured' : ''}`} key={engine.number}>
              <div className="engine-card-top"><span className="engine-icon"><Icon name={engine.icon} /></span><span className="engine-number">{engine.number}</span></div>
              <h3>{engine.title}</h3>
              <p>{engine.copy}</p>
              <div className="engine-line" />
            </article>
          ))}
        </div>
      </section>

      <section className="premium-section workflow-section" id="workflow">
        <div className="marketing-container workflow-layout">
          <div className="workflow-copy">
            <span className="section-kicker">CAMPAIGN AUTOPILOT</span>
            <h2>Your weekly marketing meeting — <span className="gradient-text">without the meeting.</span></h2>
            <p>Open HubElites, choose who you want to reach, and let the system turn that decision into a focused campaign with a coherent message across every channel.</p>
            <div className="workflow-points">
              <div><span><Icon name="check" /></span><div><b>Strategy before content</b><small>The campaign angle is decided before generation starts.</small></div></div>
              <div><span><Icon name="check" /></span><div><b>One message, many formats</b><small>Short video, posts and email all reinforce the same idea.</small></div></div>
              <div><span><Icon name="check" /></span><div><b>Your funnel stays yours</b><small>HubElites creates demand; your syndicated eStage funnel captures and attributes it.</small></div></div>
            </div>
            <a className="text-link" href="/onboarding">Create this week’s campaign <Icon name="arrow" /></a>
          </div>
          <div className="workflow-visual">
            <div className="command-card">
              <div className="command-top"><span className="command-ai"><Icon name="spark" /></span><div><small>HUBELITES AI</small><b>Campaign brief</b></div><span className="command-status">Complete</span></div>
              <div className="command-prompt">Promote Mission 1000 to <b>coaches who are tired of depending on rented social audiences.</b></div>
              <div className="command-thinking">
                <span>Audience signal</span><strong>Ownership anxiety</strong>
                <span>Primary hook</span><strong>Build what you control</strong>
                <span>CTA destination</span><strong>yourdomain.com/mission1000</strong>
              </div>
              <div className="command-output-title"><span>Campaign generated</span><span>12 assets</span></div>
              <div className="command-output-grid">
                <div><span>03</span><small>Videos</small></div><div><span>05</span><small>Social posts</small></div><div><span>02</span><small>Emails</small></div><div><span>02</span><small>Graphics</small></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-section marketing-container" id="difference">
        <div className="section-intro centered-intro"><span className="section-kicker">THE DIFFERENCE</span><h2>Stop using AI like a slot machine.</h2><p>Random prompts produce random marketing. HubElites gives the work a system.</p></div>
        <div className="comparison-wrap">
          <div className="comparison-column comparison-old">
            <div className="comparison-heading"><span>The usual AI workflow</span><b>Fragmented</b></div>
            {oldWay.map(item => <div className="comparison-row" key={item}><span className="comparison-x">×</span>{item}</div>)}
          </div>
          <div className="comparison-column comparison-new">
            <div className="comparison-glow" />
            <div className="comparison-heading"><span>The HubElites workflow</span><b>Systematic</b></div>
            {eliteWay.map(item => <div className="comparison-row" key={item}><span className="comparison-check"><Icon name="check" /></span>{item}</div>)}
          </div>
        </div>
      </section>

      <section className="premium-section architecture-section">
        <div className="marketing-container architecture-card">
          <div className="architecture-copy"><span className="section-kicker">BUILT AROUND THE FUNNEL YOU ALREADY HAVE</span><h2>HubElites doesn’t replace eStage. <span className="gradient-text">It feeds it.</span></h2><p>Your Ambassador domain and syndicated Mission 1000 experience remain the destination. HubElites owns the marketing layer in front: audience, strategy, media, distribution and optimization.</p></div>
          <div className="architecture-flow">
            <div><span>HubElites</span><b>Demand Engine</b><small>Audience · Content · Video · Traffic</small></div>
            <span className="architecture-connector">→</span>
            <div className="architecture-destination"><span>Your Ambassador Domain</span><b>Mission 1000 Funnel</b><small>Registration · Webinar · Checkout · Attribution</small></div>
          </div>
        </div>
      </section>

      <section className="marketing-container final-cta-section">
        <div className="final-cta-glow" />
        <span className="section-kicker">YOUR NEXT CAMPAIGN IS THE STARTING POINT</span>
        <h2>Give HubElites an audience.<br /><span className="gradient-text">Get a marketing system back.</span></h2>
        <p>Build the campaign, create the assets, and drive the traffic — without starting from a blank prompt every week.</p>
        <div className="hero-actions final-actions"><a className="btn btn-primary btn-large" href="/onboarding">Start building <span className="btn-icon"><Icon name="arrow" /></span></a><a className="btn btn-glass btn-large" href="/login">Log in</a></div>
      </section>

      <footer className="marketing-footer">
        <div className="marketing-container footer-inner"><a className="brand brand-premium" href="/"><span className="brand-symbol"><span>H</span></span><span>HubElites</span></a><p>Independent platform for eStage Ambassadors. Not affiliated with or endorsed by eStage.</p><span>© 2026 HubElites</span></div>
      </footer>
    </main>
  );
}
