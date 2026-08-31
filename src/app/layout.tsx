import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://hubelites.com'),
  title: {
    default: 'HubElites — AI growth system for eStage Ambassadors',
    template: '%s · HubElites',
  },
  description:
    'HubElites turns your Ambassador domain into an AI-powered marketing engine: one audience decision becomes a coordinated week of video, social, email and outreach that drives traffic to your Mission 1000 funnel.',
  applicationName: 'HubElites',
  keywords: ['HubElites', 'eStage Ambassador', 'Mission 1000', 'AI marketing', 'campaign automation'],
  openGraph: {
    title: 'HubElites — AI growth system for eStage Ambassadors',
    description: 'One audience decision in. A complete, coordinated campaign out. Built for eStage Ambassadors.',
    url: 'https://hubelites.com',
    siteName: 'HubElites',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HubElites — AI growth system for eStage Ambassadors',
    description: 'One audience decision in. A complete, coordinated campaign out.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#06070e' },
    { media: '(prefers-color-scheme: light)', color: '#f6f8fc' },
  ],
};

// Applies the stored theme before first paint so there is no flash.
const themeScript = `(function(){try{var t=localStorage.getItem('hubelites-theme');if(t!=='light'&&t!=='dark'){t='dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="atmos" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
