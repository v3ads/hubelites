import type { SVGProps } from 'react';

export type IconName =
  | 'arrow'
  | 'arrow-up-right'
  | 'bolt'
  | 'brain'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'chevron'
  | 'compass'
  | 'credit'
  | 'globe'
  | 'grid'
  | 'image'
  | 'layers'
  | 'link'
  | 'lock'
  | 'mail'
  | 'menu'
  | 'moon'
  | 'orbit'
  | 'play'
  | 'plug'
  | 'plus'
  | 'search'
  | 'send'
  | 'settings'
  | 'shield'
  | 'sparkles'
  | 'sun'
  | 'target'
  | 'trend'
  | 'users'
  | 'video'
  | 'wand'
  | 'x';

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="M4 12h15m-5-5 5 5-5 5" />,
  'arrow-up-right': <path d="M7 17 17 7m-7 0h7v7" />,
  bolt: <path d="M13 2 4.5 13.2h6L11 22l8.5-11.2h-6L13 2Z" />,
  brain: (
    <>
      <path d="M9.5 4.3A3.2 3.2 0 0 0 4.6 7a3.4 3.4 0 0 0 .6 5.8A3.6 3.6 0 0 0 9 17.9V21" />
      <path d="M14.5 4.3A3.2 3.2 0 0 1 19.4 7a3.4 3.4 0 0 1-.6 5.8A3.6 3.6 0 0 1 15 17.9V21" />
      <path d="M9.6 6.4c1 .2 1.8.9 2.4 1.8.6-.9 1.4-1.6 2.4-1.8M12 8.2V21" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-6M22 20H2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  credit: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19M6 15h4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17 5-4.5 4.5 4L17 13l3 3" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4.5-9 5-9-5" />,
  link: <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.3 1.3M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.3-1.3" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  moon: <path d="M20 15.4A8.5 8.5 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4Z" />,
  orbit: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4.4" transform="rotate(-28 12 12)" />
    </>
  ),
  play: <path d="M8.5 6.5 17 12l-8.5 5.5v-11Z" />,
  plug: <path d="M9 3v6M15 3v6M6.5 9h11v3a5.5 5.5 0 0 1-11 0V9ZM12 17.5V21" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </>
  ),
  send: <path d="m4 4 16 8-16 8 3.2-8L4 4Zm3.2 8H20" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0V21a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14.9a2 2 0 1 1 0-4h.2A1.7 1.7 0 0 0 4.4 8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1V4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.2c0 4.4 2.8 7.9 7 9.8 4.2-1.9 7-5.4 7-9.8V6l-7-3Z" />
      <path d="m9.2 12 2 2 3.6-3.6" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="m14.6 9.4 6-6M17.2 3.4h3.4v3.4" />
    </>
  ),
  trend: <path d="M3 17.5 9.5 11l4 4L21 7.5M15.5 7.5H21V13" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.8 20a6.4 6.4 0 0 1 12.4 0M16 4.6a3.6 3.6 0 0 1 0 6.9M17.6 20h3.6a5.6 5.6 0 0 0-3.4-5.1" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="13" height="14" rx="3" />
      <path d="m16 9 5-2.2v10.4L16 15V9Z" />
    </>
  ),
  wand: <path d="m4 20 9-9M14.5 3.5 15 6l2.5.5L15 7l-.5 2.5L14 7l-2.5-.5L14 6l.5-2.5ZM19 12l.4 1.8 1.8.4-1.8.4-.4 1.8-.4-1.8-1.8-.4 1.8-.4.4-1.8ZM12.8 9.3l1.9 1.9" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
};

type Props = SVGProps<SVGSVGElement> & { name: IconName; strokeWidth?: number };

export function Icon({ name, strokeWidth = 1.7, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

export function SolidIcon({ name, ...rest }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
      {paths[name]}
    </svg>
  );
}
