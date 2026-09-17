import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { PUBLIC_ACCESS_ENABLED } from '@/lib/public-access';

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!PUBLIC_ACCESS_ENABLED) return NextResponse.redirect(new URL('/', url.origin));
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(new URL('/login?error=invalid_or_expired_link', url.origin));
}
