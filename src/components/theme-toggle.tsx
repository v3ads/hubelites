'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('hubelites-theme') as 'dark' | 'light' | null;
    const next = saved ?? 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('hubelites-theme', next);
    document.documentElement.dataset.theme = next;
  }

  return <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">{theme === 'dark' ? '☀' : '☾'}</button>;
}
