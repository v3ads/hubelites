import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="nav"><div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a className="brand" href="/"><span className="mark">H</span>HubElites</a>
        <nav className="navlinks"><a href="#engine">The Engine</a><a href="#campaigns">Campaigns</a><a href="#ambassadors">For Ambassadors</a><a href="#pricing">Pricing</a></nav>
        <div className="actions"><ThemeToggle/><a className="btn" href="/login">Log in</a><a className="btn btn-primary" href="/onboarding">Start free</a></div>
      </div></header>
      <section className="container hero">
        <div>
          <span className="eyebrow">✦ Built for eStage Ambassadors</span>
          <h1>Turn your ambassador domain into an <span className="gradient">AI marketing engine.</span></h1>
          <p>HubElites creates the campaigns, videos, social content and outreach that send the right prospects into your own syndicated Mission 1000 funnel — already attributed to you.</p>
          <div className="hero-cta"><a className="btn btn-primary" href="/onboarding">Build My First Campaign →</a><a className="btn" href="#engine">See the Engine</a></div>
          <p style={{fontSize:12,marginTop:20}}>Independent platform designed for eStage Ambassadors. Not affiliated with or endorsed by eStage.</p>
        </div>
        <div className="product-card">
          <div className="windowbar"><div className="dots"><span className="dot"/><span className="dot"/><span className="dot"/></div><span className="live">● AI engine live</span></div>
          <div className="workflow">
            <div className="flow-card"><div className="flow-head"><span className="flow-label">Audience</span><span className="pill">Mission 1000</span></div><strong>Coaches & Course Creators</strong><div className="sub" style={{marginTop:6}}>Your funnel: joeshubs.com/mission1000</div></div>
            <div className="flow-card"><div className="flow-head"><span className="flow-label">Campaign ready</span><span className="pill">12 assets</span></div><div className="asset-grid"><div className="asset">🎬 3 Short Videos</div><div className="asset">📱 5 Social Posts</div><div className="asset">✉️ 2 Emails</div><div className="asset">🖼️ 2 Graphics</div></div></div>
            <div className="flow-card"><div className="flow-head"><span className="flow-label">This week</span><span className="pill">+23%</span></div><div className="metric">147 funnel visits</div><div className="sub">from your HubElites campaign</div></div>
          </div>
        </div>
      </section>
      <section className="container sections" id="engine">
        <div className="section-title"><h2>One mission. <span className="gradient">Your audience.</span></h2><p>HubElites doesn’t replace your syndicated eStage funnel. It creates the intelligent marketing layer in front of it.</p></div>
        <div className="features">
          <div className="feature"><div className="feature-icon">◎</div><h3>Campaign Intelligence</h3><p>Choose your audience and goal. HubElites builds the campaign angle, messaging, calendar and calls to action around Mission 1000.</p></div>
          <div className="feature"><div className="feature-icon">▶</div><h3>AI Media Studio</h3><p>Create short videos, graphics, posts and emails using managed media credits so generation costs stay predictable.</p></div>
          <div className="feature"><div className="feature-icon">↗</div><h3>Distribution & Learning</h3><p>Connect social channels, approve or schedule content, then let performance data improve the next campaign.</p></div>
        </div>
      </section>
    </main>
  );
}
