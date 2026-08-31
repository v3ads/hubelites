'use client';

import { useState } from 'react';
import { Icon, type IconName } from '../icon';
import { ThemeToggle } from '../theme-toggle';

type StepKey = 'identity' | 'destination' | 'audience' | 'channels' | 'style' | 'launch';

const steps: { key: StepKey; title: string; hint: string; icon: IconName }[] = [
  { key: 'identity', title: 'Your identity', hint: 'The brand prospects will see.', icon: 'wand' },
  { key: 'destination', title: 'Mission 1000 funnel', hint: 'Where every CTA should land.', icon: 'link' },
  { key: 'audience', title: 'Your audience', hint: 'Who this campaign is for.', icon: 'target' },
  { key: 'channels', title: 'Connect channels', hint: 'Where the assets go.', icon: 'plug' },
  { key: 'style', title: 'Content style', hint: 'How your campaigns should sound.', icon: 'sparkles' },
  { key: 'launch', title: 'First campaign', hint: 'Review and generate.', icon: 'bolt' },
];

const audienceOptions = [
  'Coaches',
  'Course creators',
  'Consultants',
  'Local business owners',
  'Agency owners',
  'Real estate pros',
  'Fitness professionals',
  'Service providers',
];

const channelOptions: { label: string; icon: IconName }[] = [
  { label: 'YouTube', icon: 'video' },
  { label: 'Instagram', icon: 'image' },
  { label: 'TikTok', icon: 'play' },
  { label: 'LinkedIn', icon: 'users' },
  { label: 'Facebook', icon: 'globe' },
  { label: 'Email', icon: 'mail' },
];

const toneOptions = ['Direct and practical', 'Warm and encouraging', 'Bold and contrarian', 'Analytical and calm'];

export function OnboardingFlow() {
  const [index, setIndex] = useState(0);
  const [brand, setBrand] = useState('');
  const [fullName, setFullName] = useState('');
  const [website, setWebsite] = useState('');
  const [mission, setMission] = useState('');
  const [audiences, setAudiences] = useState<string[]>(['Coaches']);
  const [channels, setChannels] = useState<string[]>(['YouTube', 'Email']);
  const [tone, setTone] = useState(toneOptions[0]);

  const step = steps[index];
  const progress = Math.round(((index + 1) / steps.length) * 100);

  function toggle(list: string[], setList: (value: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  return (
    <div className="onb">
      <aside className="onb-side">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <a className="logo logo-sm" href="/">
            <span className="logo-mark">
              <span>H</span>
            </span>
            HubElites
          </a>
          <ThemeToggle />
        </div>

        <div className="onb-steps">
          {steps.map((item, position) => (
            <button
              type="button"
              key={item.key}
              className={`onb-step ${position === index ? 'is-current' : ''} ${position < index ? 'is-done' : ''}`}
              onClick={() => setIndex(position)}
            >
              <i>{position < index ? <Icon name="check" /> : position + 1}</i>
              <span>
                <b>{item.title}</b>
                <small>{item.hint}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="onb-progress">
          <div className="meter meter-spectrum">
            <i style={{ width: `${progress}%` }} />
          </div>
          <span>
            Step {index + 1} of {steps.length} · {progress}% complete
          </span>
        </div>
      </aside>

      <main className="onb-main" id="main">
        <div className="onb-card" key={step.key}>
          <span className="pill pill-accent">
            <Icon name={step.icon} />
            Step {index + 1} of {steps.length}
          </span>

          {step.key === 'identity' && (
            <>
              <h1>Make HubElites yours.</h1>
              <p>This identity appears across your campaigns, media and prospect experiences.</p>
              <div className="onb-fields">
                <div className="field">
                  <label htmlFor="brand">Business or ambassador brand</label>
                  <input
                    id="brand"
                    placeholder="Joe&apos;s Hubs"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                  />
                </div>
                <div className="two">
                  <div className="field">
                    <label htmlFor="name">Your name</label>
                    <input
                      id="name"
                      placeholder="Joe Smith"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="site">Main website</label>
                    <input
                      id="site"
                      placeholder="https://joeshubs.com"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step.key === 'destination' && (
            <>
              <h1>Where should the traffic land?</h1>
              <p>
                Every call to action HubElites writes will point at this destination, so your syndicated funnel keeps
                the registration, checkout and attribution.
              </p>
              <div className="onb-fields">
                <div className="field">
                  <label htmlFor="mission">Your Mission 1000 destination</label>
                  <input
                    id="mission"
                    placeholder="https://yourdomain.com/mission1000"
                    value={mission}
                    onChange={(event) => setMission(event.target.value)}
                  />
                  <span className="field-hint">Use your own Ambassador domain, not a shared link.</span>
                </div>
              </div>
            </>
          )}

          {step.key === 'audience' && (
            <>
              <h1>Who are we reaching first?</h1>
              <p>Pick one or two. HubElites researches the angle, objections and language before generating anything.</p>
              <div className="onb-fields">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                  {audienceOptions.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className="chip"
                      aria-pressed={audiences.includes(option)}
                      onClick={() => toggle(audiences, setAudiences, option)}
                    >
                      {audiences.includes(option) && <Icon name="check" width={13} height={13} />}
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step.key === 'channels' && (
            <>
              <h1>Where will you publish?</h1>
              <p>Connect now or later — assets are always export-ready either way.</p>
              <div className="onb-fields">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                  {channelOptions.map((option) => (
                    <button
                      type="button"
                      key={option.label}
                      className="chip"
                      aria-pressed={channels.includes(option.label)}
                      onClick={() => toggle(channels, setChannels, option.label)}
                    >
                      <Icon name={option.icon} width={14} height={14} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step.key === 'style' && (
            <>
              <h1>How should your campaigns sound?</h1>
              <p>This shapes hooks, scripts and email voice across every asset.</p>
              <div className="onb-fields">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                  {toneOptions.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className="chip"
                      aria-pressed={tone === option}
                      onClick={() => setTone(option)}
                    >
                      {tone === option && <Icon name="check" width={13} height={13} />}
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step.key === 'launch' && (
            <>
              <h1>Ready to build your first campaign.</h1>
              <p>HubElites will turn this into a full week of coordinated assets pointing at your funnel.</p>
              <div className="onb-review">
                <div>
                  <span>Brand</span>
                  <b>{brand || 'Your brand'}</b>
                </div>
                <div>
                  <span>Destination</span>
                  <b>{mission || 'yourdomain.com/mission1000'}</b>
                </div>
                <div>
                  <span>Audience</span>
                  <b>{audiences.length ? audiences.join(', ') : 'Coaches'}</b>
                </div>
                <div>
                  <span>Channels</span>
                  <b>{channels.length ? channels.join(', ') : 'Email'}</b>
                </div>
                <div>
                  <span>Voice</span>
                  <b>{tone}</b>
                </div>
              </div>
            </>
          )}

          <div className="onb-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
            >
              Back
            </button>

            {index < steps.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => setIndex((value) => Math.min(steps.length - 1, value + 1))}
              >
                Continue
                <Icon name="arrow" />
              </button>
            ) : (
              <a className="btn btn-primary btn-lg" href="/dashboard">
                <Icon name="sparkles" />
                Generate my first campaign
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
