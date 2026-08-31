import { Icon } from '@/components/icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { requestLoginCode, verifyLoginCode } from './actions';

export const metadata = { title: 'Log in' };

type Props = {
  searchParams: Promise<{ sent?: string; email?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email ?? '';
  const codeStep = params.sent === '1' && Boolean(email);

  return (
    <div className="auth">
      <aside className="auth-side">
        <a className="logo" href="/">
          <span className="logo-mark">
            <span>H</span>
          </span>
          HubElites
        </a>

        <div className="auth-quote">
          <span className="kicker">Campaign autopilot</span>
          <h2 style={{ marginTop: 18 }}>
            One audience decision. <span className="grad-text">A full week of marketing.</span>
          </h2>
          <p>
            Sign in to approve this week&apos;s campaign, publish your assets and watch the traffic land on your own
            Mission 1000 funnel.
          </p>

          <div className="auth-points">
            <div>
              <Icon name="check" />
              No passwords — a one-time code, every time
            </div>
            <div>
              <Icon name="check" />
              Your funnel keeps the conversion and attribution
            </div>
            <div>
              <Icon name="check" />
              Credits are reserved before anything expensive runs
            </div>
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-4)', maxWidth: '38ch' }}>
          Independent platform for eStage Ambassadors. Not affiliated with or endorsed by eStage.
        </p>
      </aside>

      <main className="auth-main" id="main">
        <div className="auth-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span className="pill pill-accent">
              <Icon name="lock" />
              Passwordless access
            </span>
            <ThemeToggle />
          </div>

          <h1>{codeStep ? 'Check your email.' : 'Welcome back.'}</h1>
          <p>
            {codeStep
              ? `We sent a one-time sign-in code to ${email}. Enter it below to continue.`
              : 'Enter your email and we’ll send a one-time sign-in code. No password, no magic-link headaches.'}
          </p>

          {params.error && (
            <div className="auth-alert" style={{ marginTop: 20 }}>
              {params.error === 'invalid_code'
                ? 'Enter the numeric code from your email.'
                : 'That code was not accepted. Request a fresh code and try again.'}
            </div>
          )}

          {codeStep ? (
            <>
              <form className="auth-form" action={verifyLoginCode}>
                <input type="hidden" name="email" value={email} />
                <div className="field">
                  <label htmlFor="token">One-time code</label>
                  <input
                    id="token"
                    className="input-lg input-code"
                    name="token"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="······"
                    minLength={6}
                    maxLength={8}
                    required
                    autoFocus
                  />
                  <span className="field-hint">The code expires shortly after it is sent.</span>
                </div>
                <button className="btn btn-primary btn-lg btn-block" type="submit">
                  Verify &amp; continue
                  <Icon name="arrow" />
                </button>
              </form>

              <form action={requestLoginCode} style={{ marginTop: 12 }}>
                <input type="hidden" name="email" value={email} />
                <button className="btn btn-block" type="submit">
                  Send a fresh code
                </button>
              </form>

              <p className="auth-foot">
                <a href="/login">Use a different email</a>
              </p>
            </>
          ) : (
            <form className="auth-form" action={requestLoginCode}>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  className="input-lg"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  defaultValue={email}
                  required
                />
              </div>
              <button className="btn btn-primary btn-lg btn-block" type="submit">
                Send sign-in code
                <Icon name="mail" />
              </button>
            </form>
          )}

          <p className="auth-foot">
            New here? <a href="/onboarding">Start building your first campaign</a>
          </p>
        </div>
      </main>
    </div>
  );
}
