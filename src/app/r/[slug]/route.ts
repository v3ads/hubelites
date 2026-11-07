import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { buildTrackedDestination, isLinkSlug } from '@/lib/tracked-links';

// Public tracked-link redirector (Phase 5 Slice 1). Anyone with the
// link can click it — no auth. The click is logged through the service
// role (link_clicks has no public insert policy), then the visitor is
// sent to the ambassador's own destination with UTM attribution.
// Unknown slugs land on the site root rather than an error page: a
// link shared into the world should never dead-end.

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const home = new URL('/', request.url);
  if (!isLinkSlug(slug)) return NextResponse.redirect(home, 302);

  try {
    const admin = createAdminClient();
    const { data: publication } = await admin
      .from('publications')
      .select('id, destination_url')
      .eq('link_slug', slug)
      .maybeSingle();
    if (!publication) return NextResponse.redirect(home, 302);

    // Log first, redirect regardless of the log's outcome — a visitor
    // must never be stranded by an analytics write.
    const { error } = await admin.from('link_clicks').insert({
      publication_id: publication.id,
      user_agent: (request.headers.get('user-agent') || '').slice(0, 300) || null,
      referer: (request.headers.get('referer') || '').slice(0, 500) || null,
    });
    if (error) console.error('Tracked-link click log failed:', error.message);

    return NextResponse.redirect(buildTrackedDestination(publication.destination_url, slug), 302);
  } catch (error) {
    console.error('Tracked-link redirect failed:', error);
    return NextResponse.redirect(home, 302);
  }
}
