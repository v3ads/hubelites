const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('next/dist/build/swc');
const { renderToStaticMarkup } = require('react-dom/server');

// Execute real page/action code with controlled auth responses; no production users or OTPs.
function load(file, { enabled = false, user = null, admin = false, mobile = false, calls = [] } = {}) {
  const filename = resolve(file);
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename, jsc: { parser: { syntax: 'typescript', tsx: file.endsWith('.tsx') },
      transform: { react: { runtime: 'automatic' } }, target: 'es2022' }, module: { type: 'commonjs' },
  });
  const module = { exports: {} };
  let state = 0;
  const auth = {
    getUser: async () => ({ data: { user } }),
    signInWithOtp: async () => { calls.push('request'); return {}; },
    verifyOtp: async () => { calls.push('verify'); return {}; },
  };
  const supabase = { auth, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { is_super_admin: admin } }) }) }) }) };
  const redirect = (url) => { throw new Error(`redirect:${url}`); };
  runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, require: (id) => {
    if (id === '@/lib/public-access') return { PUBLIC_ACCESS_ENABLED: enabled };
    if (id === '@/lib/supabase-server') return { createClient: async () => { calls.push('client'); return supabase; } };
    if (id === 'next/navigation') return { redirect };
    if (id === 'next/server') return { NextResponse: { redirect: (url) => ({ location: String(url) }) } };
    if (id === 'react') return { ...require('react'), useEffect: () => {}, useState: () => [state++ === 1 && mobile, () => {}] };
    if (id.startsWith('@/components/') || id.startsWith('../') || id === './actions') return new Proxy({}, { get: () => () => null });
    return require(id);
  } });
  return module.exports;
}

for (const file of ['src/app/login/page.tsx', 'src/app/onboarding/page.tsx']) {
  test(`${file}: closed redirects, reopening restores the page`, async () => {
    await assert.rejects(async () => load(file).default({ searchParams: Promise.resolve({}) }), /redirect:\/$/);
    assert.ok(await load(file, { enabled: true }).default({ searchParams: Promise.resolve({}) }));
  });
}
for (const action of ['requestLoginCode', 'verifyLoginCode']) {
  test(`${action}: closed blocks auth calls, reopening restores flow`, async () => {
    const calls = [];
    const form = new FormData(); form.set('email', 'test@example.com'); form.set('token', '123456');
    await assert.rejects(load('src/app/login/actions.ts', { calls })[action](form), /redirect:\/$/);
    assert.deepEqual(calls, []);
    await assert.rejects(load('src/app/login/actions.ts', { enabled: true, calls })[action](form), /redirect:\/(login\?sent=1|dashboard)/);
    assert.ok(calls.includes(action === 'requestLoginCode' ? 'request' : 'verify'));
  });
}
test('email confirmation is blocked without touching the session', async () => {
  const calls = [];
  const result = await load('src/app/auth/confirm/route.ts', { calls }).GET({ url: 'https://www.hubelites.com/auth/confirm?type=email&token_hash=test' });
  assert.equal(result.location, 'https://www.hubelites.com/'); assert.deepEqual(calls, []);
});
for (const route of ['dashboard', 'admin']) {
  test(`${route}: signed-out users remain protected`, async () => {
    await assert.rejects(load(`src/app/${route}/page.tsx`).default(), /redirect:\/login$/);
  });
  test(`${route}: existing authorized sessions still render`, async () => {
    assert.ok(await load(`src/app/${route}/page.tsx`, { user: { id: 'existing-user', email: 'test@example.com' }, admin: true }).default());
  });
}
test('admin rejects a signed-in non-admin', async () => {
  await assert.rejects(load('src/app/admin/page.tsx', { user: { id: 'ordinary-user' } }).default(), /redirect:\/dashboard$/);
});
for (const [file, exported, mobile] of [
  ['src/app/page.tsx', 'default', false],
  ['src/components/marketing/site-header.tsx', 'SiteHeader', false],
  ['src/components/marketing/site-header.tsx', 'SiteHeader', true],
  ['src/components/marketing/site-footer.tsx', 'SiteFooter', false],
]) {
  test(`${file} mobile=${mobile}: closed hides entry links, reopening restores them`, () => {
    const closed = renderToStaticMarkup(load(file, { mobile })[exported]());
    assert.doesNotMatch(closed, /href="\/(login|onboarding)(?:["?])/);
    const open = renderToStaticMarkup(load(file, { mobile, enabled: true })[exported]());
    assert.match(open, /href="\/onboarding"/);
  });
}
