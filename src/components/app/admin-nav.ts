import type { NavGroup } from './app-shell';

export function adminNav(activeLabel: string): NavGroup[] {
  const mark = (label: string) => (label === activeLabel ? { active: true } : {});
  return [
    {
      items: [
        { label: 'Platform Overview', icon: 'grid', href: '/admin', ...mark('Platform Overview') },
        { label: 'Members', icon: 'users', href: '#' },
        { label: 'Organizations', icon: 'layers', href: '#' },
        { label: 'Campaigns', icon: 'sparkles', href: '#' },
        { label: 'Media Jobs', icon: 'video', href: '#' },
      ],
    },
    {
      title: 'Control',
      items: [
        { label: 'Provider Catalog', icon: 'plug', href: '#' },
        { label: 'Credit Ledger', icon: 'credit', href: '#' },
        { label: 'Mission Brain', icon: 'brain', href: '/admin/mission-brain', ...mark('Mission Brain') },
        { label: 'System Health', icon: 'shield', href: '#' },
        { label: 'Audit Log', icon: 'lock', href: '#' },
      ],
    },
  ];
}
