import type { ReactNode } from 'react';
import { SiteFooter } from './site-footer';
import { ThemeToggle } from '../theme-toggle';
import { Icon } from '../icon';

type Props = {
  kicker: string;
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
};

export function LegalPage({ kicker, title, updated, intro, children }: Props) {
  return (
    <>
      <header className="nav is-stuck">
        <div className="container nav-inner">
          <a className="logo" href="/" aria-label="HubElites home">
            <span className="logo-mark">
              <span>H</span>
            </span>
            HubElites
          </a>
          <div className="nav-actions">
            <ThemeToggle />
            <a className="btn btn-ghost" href="/">
              <Icon name="arrow" style={{ transform: 'rotate(180deg)' }} />
              Back to home
            </a>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="section legal">
          <div className="container legal-wrap">
            <span className="kicker">{kicker}</span>
            <h1>{title}</h1>
            <p className="legal-updated">Last updated: {updated}</p>
            <p className="legal-intro">{intro}</p>
            <div className="legal-body">{children}</div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  );
}
