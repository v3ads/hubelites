'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icon';

type Theme = 'dark' | 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark') setTheme(current);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('hubelites-theme', next);
    } catch {
      /* storage unavailable — the choice simply will not persist */
    }
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <span
        role="button"
        tabIndex={0}
        className={theme === 'dark' ? 'is-on' : ''}
        aria-pressed={theme === 'dark'}
        aria-label="Dark theme"
        title="Dark theme"
        onClick={() => apply('dark')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') apply('dark');
        }}
      >
        <Icon name="moon" />
      </span>
      <span
        role="button"
        tabIndex={0}
        className={theme === 'light' ? 'is-on' : ''}
        aria-pressed={theme === 'light'}
        aria-label="Light theme"
        title="Light theme"
        onClick={() => apply('light')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') apply('light');
        }}
      >
        <Icon name="sun" />
      </span>
    </div>
  );
}
