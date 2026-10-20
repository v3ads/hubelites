import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/app/app-shell';
import { adminNav } from '@/components/app/admin-nav';
import { MissionBrainEditor, type MissionBrainItemView } from '@/components/app/mission-brain-editor';
import { Icon } from '@/components/icon';

export const metadata = { title: 'Mission Brain' };

export default async function MissionBrainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('is_super_admin,display_name').eq('id', user.id).single();
  if (!profile?.is_super_admin) redirect('/dashboard');

  const { data: items } = await supabase
    .from('mission_brain_items')
    .select('id,key,category,title,content,status,updated_at')
    .order('category', { ascending: true })
    .order('key', { ascending: true });

  const views: MissionBrainItemView[] = (items ?? []).map((item) => {
    const content = (item.content ?? {}) as { text?: string };
    return {
      id: item.id as string,
      key: item.key as string,
      category: item.category as string,
      title: item.title as string,
      text: content.text ?? JSON.stringify(item.content),
      status: item.status as string,
      updated_at: item.updated_at as string,
    };
  });

  const activeCount = views.filter((item) => item.status === 'active').length;
  const email = user.email ?? 'admin@hubelites.com';
  const name = (profile.display_name as string | undefined) ?? email.split('@')[0] ?? 'Super Admin';

  return (
    <AppShell
      groups={adminNav('Mission Brain')}
      crumbs={['Platform', 'Mission Brain']}
      user={{ name, email, role: 'Super Admin' }}
      badge={{ label: 'Super Admin', tone: 'pill-violet' }}
      action={
        <a className="btn" href="/dashboard">
          <Icon name="users" />
          View as member
        </a>
      }
    >
      <div className="page-head">
        <div>
          <h1>Mission Brain</h1>
          <p>
            The approved source of truth for Mission 1000 positioning, offers, claims, restrictions and CTAs. The
            Campaign Brain works from these items — it does not improvise positioning.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="pill pill-live">
            <span className="dot" /> {activeCount} active items served
          </span>
          <span className="pill">{views.length} total</span>
        </div>
      </div>

      <MissionBrainEditor items={views} />
    </AppShell>
  );
}
