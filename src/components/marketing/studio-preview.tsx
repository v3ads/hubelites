import { Icon } from '../icon';

const railIcons = ['grid', 'sparkles', 'video', 'calendar', 'chart'] as const;
const bars = [38, 52, 44, 68, 58, 84, 72];

export function StudioPreview() {
  return (
    <div className="stage">
      <div className="stage-halo" aria-hidden="true" />

      <div className="app-window" role="img" aria-label="Preview of the HubElites Campaign Studio interface">
        <div className="win-bar">
          <div className="win-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="win-title">
            <Icon name="sparkles" />
            Campaign Studio
          </div>
          <span className="pill pill-live">
            <span className="dot" /> AI online
          </span>
        </div>

        <div className="win-body">
          <div className="win-rail" aria-hidden="true">
            {railIcons.map((name, index) => (
              <i key={name} className={index === 1 ? 'on' : ''}>
                <Icon name={name} />
              </i>
            ))}
          </div>

          <div className="win-main">
            <div className="win-head">
              <div>
                <span className="microlabel">This week&apos;s campaign</span>
                <h3>Mission 1000 · Coaches</h3>
              </div>
              <span className="pill pill-accent">Ready to approve</span>
            </div>

            <div className="strategy-row">
              <div>
                <span>Audience</span>
                <b>Course creators</b>
              </div>
              <div>
                <span>Angle</span>
                <b>Stop renting your audience</b>
              </div>
              <div>
                <span>Goal</span>
                <b>Funnel visits</b>
              </div>
            </div>

            <div className="win-split">
              <div className="reel">
                <div className="reel-top">
                  <span>SHORT 01</span>
                  <span>00:28</span>
                </div>
                <div className="reel-orb">
                  <Icon name="play" strokeWidth={0} style={{ fill: 'currentColor' }} />
                </div>
                <div className="reel-copy">
                  <b>&ldquo;What if your next audience already exists?&rdquo;</b>
                  <span>Vertical video · 9:16</span>
                </div>
              </div>

              <div className="asset-list">
                <div className="asset-row">
                  <span className="ichip ichip-sm ichip-blue">
                    <Icon name="video" />
                  </span>
                  <div>
                    <b>3 short videos</b>
                    <small>Scripted &amp; branded</small>
                  </div>
                  <em>Ready</em>
                </div>
                <div className="asset-row">
                  <span className="ichip ichip-sm ichip-violet">
                    <Icon name="send" />
                  </span>
                  <div>
                    <b>5 social posts</b>
                    <small>Platform-ready copy</small>
                  </div>
                  <em>Ready</em>
                </div>
                <div className="asset-row">
                  <span className="ichip ichip-sm ichip-cyan">
                    <Icon name="mail" />
                  </span>
                  <div>
                    <b>2 email angles</b>
                    <small>Nurture + invitation</small>
                  </div>
                  <em>Ready</em>
                </div>
                <div className="asset-row" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="spark" aria-hidden="true">
                    {bars.map((height, index) => (
                      <i key={index} style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="win-foot">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span className="dot" /> Campaign intelligence complete
              </span>
              <span className="btn btn-sm btn-primary">Approve campaign</span>
            </div>
          </div>
        </div>
      </div>

      <div className="float-card float-a">
        <span className="ichip ichip-sm ichip-lime">
          <Icon name="trend" />
        </span>
        <div>
          <small>AI recommendation</small>
          <b>Coach audience is strongest</b>
        </div>
      </div>

      <div className="float-card float-b">
        <small>Tracked funnel visits</small>
        <div>
          <strong>147</strong>
          <span>+23%</span>
        </div>
        <div className="meter meter-emerald" style={{ marginTop: 8 }}>
          <i style={{ width: '68%' }} />
        </div>
      </div>
    </div>
  );
}
