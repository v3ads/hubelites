import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icon';
import { ThemeToggle } from '../theme-toggle';

export type NavItem = {
  label: string;
  icon: IconName;
  href?: string;
  active?: boolean;
  tag?: string;
};

export type NavGroup = {
  title?: string;
  items: NavItem[];
};

type Props = {
  groups: NavGroup[];
  crumbs: string[];
  user: { name: string; email: string; role: string };
  badge?: { label: string; tone?: string };
  credits?: { used: number; total: number };
  action?: ReactNode;
  children: ReactNode;
};

export function AppShell({ groups, crumbs, user, badge, credits, action, children }: Props) {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="shell">
      <aside className="side">
        <div className="side-top">
          <a className="logo logo-sm" href="/">
            <span className="logo-mark">
              <span>H</span>
            </span>
            HubElites
          </a>
          {badge && (
            <span className={`pill ${badge.tone ?? 'pill-violet'}`} style={{ marginTop: 12 }}>
              {badge.label}
            </span>
          )}
        </div>

        {groups.map((group, index) => (
          <div key={group.title ?? index}>
            {group.title && <div className="side-section">{group.title}</div>}
            <nav className="side-nav">
              {group.items.map((item) => (
                <a key={item.label} href={item.href ?? '#'} className={item.active ? 'active' : undefined}>
                  <Icon name={item.icon} />
                  {item.label}
                  {item.tag && <span className="tag">{item.tag}</span>}
                </a>
              ))}
            </nav>
          </div>
        ))}

        <div className="side-foot">
          {credits && (
            <div className="credit-card">
              <div className="top">
                <span>Media credits</span>
                <Icon name="credit" width={14} height={14} />
              </div>
              <b>
                {credits.total - credits.used} <span style={{ fontSize: 11, color: 'var(--text-4)' }}>left</span>
              </b>
              <div className="meter meter-spectrum">
                <i style={{ width: `${Math.round((credits.used / credits.total) * 100)}%` }} />
              </div>
              <small>
                {credits.used} of {credits.total} used this cycle
              </small>
            </div>
          )}

          <div className="side-user">
            <span className="avatar">{initials}</span>
            <div>
              <b>{user.name}</b>
              <small>{user.email}</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="crumbs">
            {crumbs.map((crumb, index) => (
              <span key={crumb} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {index > 0 && <span aria-hidden="true">/</span>}
                {index === crumbs.length - 1 ? <b>{crumb}</b> : crumb}
              </span>
            ))}
          </div>

          <div className="searchbox" aria-hidden="true">
            <Icon name="search" />
            Search campaigns, assets, prospects
            <kbd>⌘K</kbd>
          </div>

          <ThemeToggle />
          {action}
        </header>

        <main className="work" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
