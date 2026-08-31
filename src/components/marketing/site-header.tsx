'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../icon';
import { ThemeToggle } from '../theme-toggle';

const links = [
  { href: '#system', label: 'System' },
  { href: '#engines', label: 'Engines' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#difference', label: 'Why HubElites' },
  { href: '#faq', label: 'FAQ' },
];

export function SiteHeader() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className={`nav${stuck ? ' is-stuck' : ''}`}>
        <div className="container nav-inner">
          <a className="logo" href="/" aria-label="HubElites home">
            <span className="logo-mark">
              <span>H</span>
            </span>
            HubElites
          </a>

          <nav className="nav-links" aria-label="Primary">
            {links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="nav-actions">
            <ThemeToggle />
            <a className="btn btn-ghost nav-desktop-only" href="/login">
              Log in
            </a>
            <a className="btn btn-primary nav-desktop-only" href="/onboarding">
              Start building
              <Icon name="arrow" />
            </a>
            <button
              type="button"
              className="btn btn-icon nav-burger"
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
            >
              <Icon name={open ? 'x' : 'menu'} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="nav-mobile">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a className="btn btn-glass" href="/login" onClick={() => setOpen(false)}>
            Log in
          </a>
          <a className="btn btn-primary" href="/onboarding" onClick={() => setOpen(false)}>
            Start building
            <Icon name="arrow" />
          </a>
        </div>
      )}
    </>
  );
}
