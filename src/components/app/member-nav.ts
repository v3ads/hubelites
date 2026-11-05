import type { NavGroup } from './app-shell';

export function memberNav(activeLabel: string, isSuperAdmin = false): NavGroup[] {
  const mark = (label: string) => (label === activeLabel ? { active: true } : {});
  return [
    {
      items: [
        { label: 'Home', icon: 'grid', href: '/dashboard', ...mark('Home') },
        { label: 'Campaigns', icon: 'layers', href: '/campaigns', ...mark('Campaigns') },
        { label: 'Create', icon: 'sparkles', href: '/campaigns/new', tag: 'AI', ...mark('Create') },
        { label: 'Content', icon: 'image', href: '#' },
        { label: 'Calendar', icon: 'calendar', href: '#' },
        { label: 'Prospects', icon: 'users', href: '#' },
        { label: 'Analytics', icon: 'chart', href: '#' },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { label: 'Brand', icon: 'wand', href: '#' },
        { label: 'Connections', icon: 'plug', href: '#' },
        { label: 'Credits', icon: 'credit', href: '/credits', ...mark('Credits') },
        { label: 'Settings', icon: 'settings', href: '#' },
        ...(isSuperAdmin ? [{ label: 'Admin', icon: 'shield' as const, href: '/admin' }] : []),
      ],
    },
  ];
}
