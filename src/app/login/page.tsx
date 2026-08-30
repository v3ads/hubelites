import { requestLoginCode, verifyLoginCode } from './actions';

type Props = {
  searchParams: Promise<{ sent?: string; email?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email ?? '';
  const codeStep = params.sent === '1' && Boolean(email);

  return (
    <main className="onboard-main">
      <div className="form-card" style={{ maxWidth: 520 }}>
        <a className="brand" href="/"><span className="mark">H</span>HubElites</a>
        <div style={{ marginTop: 44 }}>
          <span className="eyebrow">Passwordless access</span>
          <h1 style={{ fontSize: 42, marginTop: 18 }}>{codeStep ? 'Check your email.' : 'Welcome back.'}</h1>
          <p className="sub" style={{ fontSize: 15, lineHeight: 1.6 }}>
            {codeStep
              ? `We sent a one-time sign-in code to ${email}. Enter it below to continue.`
              : 'Enter your email and we’ll send you a one-time sign-in code. No password and no magic-link headaches.'}
          </p>

          {params.error && (
            <div className="flow-card" style={{ marginTop: 18, borderColor: 'rgba(244,189,80,.35)' }}>
              {params.error === 'invalid_code'
                ? 'Enter the numeric code from your email.'
                : 'That code was not accepted. Request a fresh code and try again.'}
            </div>
          )}

          {codeStep ? (
            <>
              <form action={verifyLoginCode}>
                <input type="hidden" name="email" value={email} />
                <div className="field">
                  <label>One-time code</label>
                  <input
                    name="token"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter code"
                    minLength={6}
                    maxLength={8}
                    required
                    autoFocus
                  />
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }}>
                  Verify & continue
                </button>
              </form>

              <form action={requestLoginCode} style={{ marginTop: 12 }}>
                <input type="hidden" name="email" value={email} />
                <button className="btn" style={{ width: '100%' }}>Send a fresh code</button>
              </form>

              <p className="sub" style={{ textAlign: 'center', marginTop: 15 }}>
                <a href="/login">Use a different email</a>
              </p>
            </>
          ) : (
            <form action={requestLoginCode}>
              <div className="field">
                <label>Email address</label>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  defaultValue={email}
                  required
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }}>
                Send sign-in code
              </button>
            </form>
          )}

          <p className="sub" style={{ textAlign: 'center', marginTop: 15 }}>
            Login codes are delivered securely through Brevo.
          </p>
        </div>
      </div>
    </main>
  );
}
