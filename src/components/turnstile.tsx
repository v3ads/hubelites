'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void },
      ) => string;
    };
  }
}

/**
 * Cloudflare Turnstile widget bound to a hidden form field named
 * "captcha_token". Rendered only when a site key is configured; the
 * matching secret lives in Supabase Auth's bot-protection settings.
 * Enabling the Supabase side must happen only after this ships — the
 * reverse order would reject every sign-in, including the owner's.
 */
export function TurnstileField({ siteKey }: { siteKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const renderedRef = useRef(false);

  function tryRender() {
    if (renderedRef.current || !window.turnstile || !containerRef.current || !inputRef.current) return;
    renderedRef.current = true;
    window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => {
        if (inputRef.current) inputRef.current.value = token;
      },
      'expired-callback': () => {
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  }

  useEffect(() => {
    tryRender();
    // The script may load after mount; the onLoad below covers the common
    // path and this covers a cached script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onLoad={tryRender} />
      <div ref={containerRef} style={{ margin: '4px 0 2px' }} />
      <input ref={inputRef} type="hidden" name="captcha_token" value="" readOnly />
    </>
  );
}
