import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/app-shell';
import { adminNav } from '@/components/app/admin-nav';
import { createClient } from '@/lib/supabase-server';
import { getAvatarLook, heygenConfigured, type AvatarLookDetail } from '@/lib/heygen';
import { CreatePresenterButton } from './create-button';

export default async function AdminPresenterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_super_admin) redirect('/dashboard');

  const { data: catalogRow } = await supabase
    .from('media_provider_catalog')
    .select('config')
    .eq('provider', 'heygen')
    .maybeSingle();
  const config = (catalogRow?.config as Record<string, unknown> | null) ?? {};
  const lookId = typeof config.presenter_look_id === 'string' ? config.presenter_look_id : null;

  let look: AvatarLookDetail | null = null;
  let lookError: string | null = null;
  if (lookId && heygenConfigured()) {
    try {
      look = await getAvatarLook(lookId);
    } catch (error) {
      lookError = error instanceof Error ? error.message : 'Could not load the presenter from HeyGen.';
    }
  }

  return (
    <AppShell
      groups={adminNav('Presenter')}
      crumbs={['Admin', 'Presenter']}
      user={{ name: profile.display_name ?? 'Admin', email: user.email ?? '', role: 'Super Admin' }}
    >
      <div className="page-head">
        <div>
          <h1>Presenter</h1>
          <p className="page-sub">
            The avatar every member&apos;s Shorts are filmed with. The public HeyGen catalog has no portrait-shaped
            avatar (verified by census on Nov 7, 2026), so the platform presenter is our own AI-generated avatar —
            created from a text prompt at 9:16, depicting no real person.
          </p>
        </div>
      </div>

      {!lookId ? (
        <div className="card" style={{ padding: 20, maxWidth: 640 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>No presenter yet</h2>
          <p style={{ fontSize: 14, lineHeight: 1.55 }}>
            Creating the presenter asks HeyGen to generate one AI face from the vetted prompt (professional woman,
            navy blazer, bright office, vertical framing). Generation takes a few minutes; this page then shows the
            finished avatar. No video is rendered — and nothing is charged to members — until the presenter is pinned
            and a proof Short passes the format gate.
          </p>
          <CreatePresenterButton />
        </div>
      ) : (
        <div className="card" style={{ padding: 20, maxWidth: 640 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Platform presenter</h2>
          {lookError ? (
            <p style={{ fontSize: 14, color: 'var(--magenta, #f43f5e)' }}>{lookError}</p>
          ) : look ? (
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {look.previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={look.previewImageUrl}
                  alt="AI presenter preview"
                  style={{ width: 180, borderRadius: 12, border: '1px solid var(--line, #e5e7eb)' }}
                />
              ) : null}
              <div style={{ fontSize: 14, lineHeight: 1.7, minWidth: 240 }}>
                <div>
                  <strong>Status:</strong> {look.status}
                  {look.status !== 'completed' ? ' — refresh this page in a few minutes.' : ''}
                </div>
                <div>
                  <strong>Look ID:</strong> {look.id}
                </div>
                <div>
                  <strong>Source size:</strong>{' '}
                  {look.width && look.height ? `${look.width}×${look.height}` : 'reported after completion'}
                </div>
                <div>
                  <strong>Default voice:</strong> {look.defaultVoiceId ?? '—'}
                </div>
                <div>
                  <strong>Engines:</strong> {look.engines.length ? look.engines.join(', ') : '—'}
                </div>
                {look.status === 'completed' ? (
                  <p style={{ marginTop: 10, maxWidth: 360 }}>
                    When this face is approved, its look + voice pair is pinned in the picker configuration and a
                    proof Short is generated before members can spend credits on video again.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 14 }}>Loading the presenter from HeyGen…</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
