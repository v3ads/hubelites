import { Icon, type IconName } from '@/components/icon';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { StudioPreview } from '@/components/marketing/studio-preview';

const channels: { label: string; icon: IconName }[] = [
  { label: 'Short-form video', icon: 'video' },
  { label: 'Social posts', icon: 'send' },
  { label: 'Email sequences', icon: 'mail' },
  { label: 'Campaign graphics', icon: 'image' },
  { label: 'Content calendar', icon: 'calendar' },
  { label: 'Prospect outreach', icon: 'users' },
  { label: 'Funnel traffic', icon: 'target' },
  { label: 'Performance signals', icon: 'chart' },
];

const engines: { number: string; icon: IconName; tone: string; title: string; copy: string }[] = [
  {
    number: '01',
    icon: 'target',
    tone: 'ichip-blue',
    title: 'Audience Intelligence',
    copy: 'Pick who you want to reach. HubElites sharpens the angle, pain points, objections and language before a single asset exists.',
  },
  {
    number: '02',
    icon: 'brain',
    tone: 'ichip-violet',
    title: 'Campaign Brain',
    copy: 'One strategic decision becomes a coordinated weekly campaign instead of a pile of unrelated AI outputs.',
  },
  {
    number: '03',
    icon: 'wand',
    tone: 'ichip-magenta',
    title: 'AI Media Studio',
    copy: 'Video concepts, scripts, social posts, emails and graphics generated together, carrying one campaign message.',
  },
  {
    number: '04',
    icon: 'send',
    tone: 'ichip-cyan',
    title: 'Distribution Layer',
    copy: 'Approve, schedule, export and publish across your channels while every CTA points at your Ambassador funnel.',
  },
  {
    number: '05',
    icon: 'orbit',
    tone: 'ichip-lime',
    title: 'Learning Loop',
    copy: 'Track what earns attention and clicks, then feed those signals into next week instead of starting from zero.',
  },
];

const oldWay = [
  'Blank-page prompting every single week',
  'Generic content aimed at everyone',
  'Disconnected posts, videos and emails',
  'Manual planning and endless repetition',
  'No memory of what actually worked',
];

const newWay = [
  'Audience-first campaign intelligence',
  'One message carried across every asset',
  'Video, social and email generated together',
  'A repeatable weekly growth workflow',
  'Performance signals shape what comes next',
];

const faqs = [
  {
    q: 'Does HubElites replace my eStage funnel?',
    a: 'No. Your Ambassador domain and syndicated Mission 1000 experience stay exactly where they are — registration, webinar, checkout and attribution all still happen there. HubElites owns the layer in front of it: audience, strategy, media, distribution and optimization.',
  },
  {
    q: 'What do I actually get each week?',
    a: 'A campaign, not a pile of outputs: an audience, an angle, short-form video scripts and concepts, social posts, email angles, graphics and a calendar — all pointing at the same destination with the same message.',
  },
  {
    q: 'Do I need to be good at prompting?',
    a: 'No. You make one decision — who you want to reach — and the Campaign Brain handles positioning, hooks, objections, cadence and calls to action. You review and approve rather than write prompts.',
  },
  {
    q: 'How is media generation billed?',
    a: 'Media runs on HubElites credits. Every generation is estimated and reserved before it starts, so nothing expensive begins without a sufficient balance and you always see the cost in credits rather than provider pricing.',
  },
  {
    q: 'Is HubElites affiliated with eStage?',
    a: 'HubElites is an independent platform built for eStage Ambassadors. It is not affiliated with, sponsored by, or endorsed by eStage, and it does not use eStage branding.',
  },
];

export default function HomePage() {
  return (
    <div className="site">
      <SiteHeader />

      <main id="main">
        {/* ---------------- Hero ---------------- */}
        <section className="container hero">
          <div className="hero-copy">
            <div className="hero-badge">
              <b>
                <span className="dot" /> Founding build
              </b>
              Built for eStage Ambassadors
              <Icon name="arrow" />
            </div>

            <h1 className="display">
              Turn your Ambassador domain into an <span className="grad-text">AI growth system.</span>
            </h1>

            <p className="lead">
              HubElites thinks like a strategist and creates like a content team. One audience decision becomes a
              coordinated week of video, social, email and outreach — all driving traffic into your own Mission 1000
              funnel.
            </p>

            <div className="hero-cta">
              <a className="btn btn-primary btn-lg" href="/onboarding">
                Build my first campaign
                <Icon name="arrow" />
              </a>
              <a className="btn btn-glass btn-lg" href="#system">
                See how it works
              </a>
            </div>

            <p className="hero-note">
              <Icon name="shield" />
              Passwordless sign-in · Your funnel, your attribution
            </p>

            <div className="hero-stats">
              <div>
                <strong>1</strong>
                <span>Audience decision</span>
              </div>
              <div>
                <strong>1</strong>
                <span>Campaign brain</span>
              </div>
              <div>
                <strong>12+</strong>
                <span>Ready-to-use assets</span>
              </div>
              <div>
                <strong>5</strong>
                <span>Engines in the loop</span>
              </div>
            </div>
          </div>

          <StudioPreview />
        </section>

        {/* ---------------- Channel marquee ---------------- */}
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...channels, ...channels].map((channel, index) => (
              <span key={`${channel.label}-${index}`}>
                <Icon name={channel.icon} />
                {channel.label}
              </span>
            ))}
          </div>
        </div>

        {/* ---------------- Bento: the system ---------------- */}
        <section className="container section" id="system">
          <div className="section-head">
            <span className="kicker">From one decision to a complete campaign</span>
            <h2 className="h2">
              Most AI tools give you outputs. <span className="grad-text">HubElites gives you a system.</span>
            </h2>
            <p className="lead">
              Every part of the platform exists to answer one question: what should this Ambassador publish this week,
              to whom, and why?
            </p>
          </div>

          <div className="bento">
            <article className="card card-hover span-4 bento-tile-accent">
              <span className="ichip ichip-blue">
                <Icon name="target" />
              </span>
              <h3>Choose an audience, not a prompt</h3>
              <p>
                Coaches, course creators, consultants or local businesses. HubElites researches the angle, objections
                and language for that audience before anything is generated.
              </p>
              <div className="bento-visual chip-cloud">
                <span className="hot">Coaches</span>
                <span className="hot">Course creators</span>
                <span>Consultants</span>
                <span>Local business owners</span>
                <span>Agency owners</span>
                <span>Real estate</span>
              </div>
            </article>

            <article className="card card-hover">
              <span className="ichip ichip-violet">
                <Icon name="calendar" />
              </span>
              <h3>A week that plans itself</h3>
              <p>Cadence, formats and posting days arrive as a calendar, not a to-do list.</p>
              <div className="bento-visual mini-calendar" aria-hidden="true">
                <i className="b1" />
                <i />
                <i className="b2" />
                <i className="b3" />
                <i />
                <i className="b4" />
                <i className="b1" />
                <i />
                <i className="b3" />
                <i />
                <i className="b2" />
                <i className="b1" />
                <i />
                <i />
              </div>
            </article>

            <article className="card card-hover">
              <span className="ichip ichip-magenta">
                <Icon name="video" />
              </span>
              <h3>Media that matches the message</h3>
              <p>Short-form video, graphics and copy generated from the same campaign brief.</p>
              <div className="bento-visual">
                <div className="reel" style={{ minHeight: 132 }}>
                  <div className="reel-top">
                    <span>SHORT 02</span>
                    <span>00:34</span>
                  </div>
                  <div className="reel-copy">
                    <b>&ldquo;Build what you actually control.&rdquo;</b>
                    <span>Vertical video · 9:16</span>
                  </div>
                </div>
              </div>
            </article>

            <article className="card card-hover span-4">
              <span className="ichip ichip-cyan">
                <Icon name="credit" />
              </span>
              <h3>Credits with guardrails</h3>
              <p>
                Generation is estimated and reserved before it runs, so an expensive render never starts without a
                balance behind it. You see HubElites credits, never provider pricing.
              </p>
              <div className="bento-visual credit-visual">
                <div className="row">
                  <span>Campaign estimate</span>
                  <b>28 credits</b>
                </div>
                <div className="meter meter-spectrum">
                  <i style={{ width: '34%' }} />
                </div>
                <div className="row">
                  <span>Balance after approval</span>
                  <b>84 credits</b>
                </div>
              </div>
            </article>

            <article className="card card-hover span-2">
              <span className="ichip ichip-emerald">
                <Icon name="link" />
              </span>
              <h3>Every CTA points home</h3>
              <p>Assets carry your Mission 1000 destination, so the traffic lands where you get credit.</p>
            </article>

            <article className="card card-hover span-4">
              <span className="ichip ichip-lime">
                <Icon name="chart" />
              </span>
              <h3>Every week starts smarter</h3>
              <p>
                Clicks and funnel visits feed the next brief, so the system compounds instead of resetting each Monday.
              </p>
              <div className="bento-visual stat-line" aria-hidden="true">
                {[22, 30, 26, 38, 34, 44, 40, 52, 48, 58, 54, 66, 62, 74, 70, 82, 78, 92].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </article>
          </div>
        </section>

        {/* ---------------- Engines ---------------- */}
        <section className="container section-tight" id="engines">
          <div className="section-head">
            <span className="kicker">The HubElites operating loop</span>
            <h2 className="h2">
              Five engines. <span className="grad-text">One growth loop.</span>
            </h2>
          </div>

          <div className="loop">
            {engines.map((engine) => (
              <article className="loop-step" key={engine.number}>
                <span className={`ichip ${engine.tone}`}>
                  <Icon name={engine.icon} />
                </span>
                <span className="badge-num">{engine.number}</span>
                <h3>{engine.title}</h3>
                <p>{engine.copy}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------------- Workflow ---------------- */}
        <section className="container section" id="workflow">
          <div className="showcase">
            <div>
              <span className="kicker">Campaign autopilot</span>
              <h2 className="h2" style={{ marginTop: 18 }}>
                Your weekly marketing meeting — <span className="grad-text">without the meeting.</span>
              </h2>
              <p className="lead" style={{ marginTop: 20 }}>
                Open HubElites, say who you want to reach, and the system turns that into a focused campaign with one
                coherent message across every channel.
              </p>

              <div className="showcase-points">
                <div>
                  <span className="ichip ichip-sm ichip-emerald">
                    <Icon name="check" />
                  </span>
                  <div>
                    <b>Strategy before content</b>
                    <small>The angle is decided before a single asset is generated.</small>
                  </div>
                </div>
                <div>
                  <span className="ichip ichip-sm ichip-emerald">
                    <Icon name="check" />
                  </span>
                  <div>
                    <b>One message, many formats</b>
                    <small>Short video, posts and email all reinforce the same idea.</small>
                  </div>
                </div>
                <div>
                  <span className="ichip ichip-sm ichip-emerald">
                    <Icon name="check" />
                  </span>
                  <div>
                    <b>Your funnel stays yours</b>
                    <small>HubElites creates demand; your syndicated funnel captures and attributes it.</small>
                  </div>
                </div>
              </div>

              <a className="btn btn-outline-grad btn-lg" href="/onboarding" style={{ marginTop: 30 }}>
                Create this week&apos;s campaign
                <Icon name="arrow-up-right" />
              </a>
            </div>

            <div className="brief">
              <div className="brief-head">
                <span className="ichip ichip-violet">
                  <Icon name="brain" />
                </span>
                <div>
                  <small>HubElites AI</small>
                  <b>Campaign brief</b>
                </div>
                <span className="pill pill-live">
                  <span className="dot" /> Complete
                </span>
              </div>

              <div className="brief-prompt">
                Promote Mission 1000 to <b>coaches who are tired of depending on rented social audiences.</b>
              </div>

              <div className="brief-rows">
                <div>
                  <span>Audience signal</span>
                  <strong>Ownership anxiety</strong>
                </div>
                <div>
                  <span>Primary hook</span>
                  <strong>Build what you control</strong>
                </div>
                <div>
                  <span>Objection to clear</span>
                  <strong>&ldquo;I already tried an AI tool&rdquo;</strong>
                </div>
                <div>
                  <span>CTA destination</span>
                  <strong>yourdomain.com/mission1000</strong>
                </div>
              </div>

              <div className="brief-out">
                <div>
                  <b>03</b>
                  <small>Videos</small>
                </div>
                <div>
                  <b>05</b>
                  <small>Posts</small>
                </div>
                <div>
                  <b>02</b>
                  <small>Emails</small>
                </div>
                <div>
                  <b>02</b>
                  <small>Graphics</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Comparison ---------------- */}
        <section className="container section-tight" id="difference">
          <div className="section-head centered">
            <span className="kicker">The difference</span>
            <h2 className="h2">Stop using AI like a slot machine.</h2>
            <p className="lead">Random prompts produce random marketing. HubElites gives the work a system.</p>
          </div>

          <div className="versus">
            <div className="versus-col">
              <div className="versus-head">
                <b>The usual AI workflow</b>
                <span className="pill">Fragmented</span>
              </div>
              {oldWay.map((item) => (
                <div className="versus-row" key={item}>
                  <i className="no">
                    <Icon name="x" />
                  </i>
                  {item}
                </div>
              ))}
            </div>

            <div className="versus-col win">
              <div className="versus-head">
                <b>The HubElites workflow</b>
                <span className="pill pill-accent">Systematic</span>
              </div>
              {newWay.map((item) => (
                <div className="versus-row" key={item}>
                  <i className="yes">
                    <Icon name="check" />
                  </i>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Architecture ---------------- */}
        <section className="container section-tight">
          <div className="arch">
            <div>
              <span className="kicker">Built around the funnel you already have</span>
              <h2 className="h2" style={{ marginTop: 18 }}>
                HubElites doesn&apos;t replace eStage. <span className="grad-text">It feeds it.</span>
              </h2>
              <p className="lead" style={{ marginTop: 18 }}>
                Your Ambassador domain and syndicated Mission 1000 experience stay the destination. HubElites owns the
                marketing layer in front of it.
              </p>
            </div>

            <div className="arch-flow">
              <div className="arch-node">
                <span>HubElites</span>
                <b>Demand engine</b>
                <small>Audience · Strategy · Media · Distribution · Learning</small>
              </div>
              <div className="arch-link" aria-hidden="true">
                <Icon name="arrow" />
              </div>
              <div className="arch-node dest">
                <span>Your Ambassador domain</span>
                <b>Mission 1000 funnel</b>
                <small>Registration · Webinar · Checkout · Attribution</small>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Stat band ---------------- */}
        <section className="container section-tight">
          <div className="statband">
            <div>
              <strong>1 decision</strong>
              <span>Choose the audience — the system handles positioning, cadence and calls to action.</span>
            </div>
            <div>
              <strong>12+ assets</strong>
              <span>Video, social, email and graphics generated from a single campaign brief.</span>
            </div>
            <div>
              <strong>5 engines</strong>
              <span>Audience, campaign, media, distribution and learning working as one loop.</span>
            </div>
            <div>
              <strong>0 blank pages</strong>
              <span>You review and approve instead of starting from an empty prompt box.</span>
            </div>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section className="container section-tight" id="faq">
          <div className="section-head centered">
            <span className="kicker">Questions</span>
            <h2 className="h2">Straight answers.</h2>
          </div>

          <div className="faq">
            {faqs.map((faq) => (
              <details key={faq.q}>
                <summary>
                  {faq.q}
                  <Icon name="chevron" />
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---------------- Final CTA ---------------- */}
        <section className="container section-tight">
          <div className="cta">
            <span className="kicker">Your next campaign is the starting point</span>
            <h2 className="h2" style={{ marginTop: 20 }}>
              Give HubElites an audience. <span className="grad-text">Get a marketing system back.</span>
            </h2>
            <p className="lead">
              Build the campaign, create the assets and drive the traffic — without starting from a blank prompt every
              week.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary btn-lg" href="/onboarding">
                Start building
                <Icon name="arrow" />
              </a>
              <a className="btn btn-glass btn-lg" href="/login">
                Log in
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
