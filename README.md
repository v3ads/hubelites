# HubElites

AI-powered marketing engine for eStage Ambassadors.

## Current scaffold

- Dark-first marketing site (hero product mockup, bento system, engine loop, campaign brief, comparison, FAQ)
- Split-screen passwordless login
- Interactive six-step onboarding flow, persisted to Supabase (workspace, brand, destination, audiences, first campaign draft)
- Ambassador dashboard reading real tenant data (KPIs, next best action, setup checklist, destination editor, campaign pipeline, weekly calendar)
- Real Terms of Service and Privacy Policy pages linked in the footer
- Super Admin command center (platform KPIs, tenants, system health, media economics)
- Initial multi-tenant Supabase schema + RLS
- Master product/technical blueprint

## Front-end design system

No CSS framework — a hand-built token layer lives in `src/styles/`:

| File | Purpose |
| --- | --- |
| `tokens.css` | Palette (electric spectrum), radii, shadows, type and motion tokens; light-theme overrides |
| `base.css` | Reset, typography scale, page atmosphere (mesh + grid + grain), animations |
| `ui.css` | Buttons, pills, cards, icon chips, fields, meters, tables, theme toggle |
| `marketing.css` | Public site sections |
| `app.css` | App shell, dashboard, admin, onboarding and auth surfaces |

`src/app/globals.css` imports them in that order. Theme is stored in `localStorage` under
`hubelites-theme` and applied before first paint by an inline script in `src/app/layout.tsx`.
Icons are a single inline SVG set in `src/components/icon.tsx` (no icon dependency).
Brand favicon lives at `src/app/icon.svg`, with generated `apple-icon` and `opengraph-image`.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Key docs

- `docs/MASTER-BLUEPRINT.md`
- `supabase/migrations/001_initial_schema.sql`

## Security

Never commit production keys. Provider API keys and the Super Admin bootstrap identity are environment configuration only.

## Public access

`src/lib/public-access.ts` controls public login and onboarding access. It is currently
`true` (reopened 2026-10-20 with the Phase 0+1 launch): passwordless sign-in/sign-up,
the six-step onboarding (which persists the workspace, brand, destination, audiences and
a first campaign draft to Supabase), and a dashboard that reads real tenant data.
Set `PUBLIC_ACCESS_ENABLED` to `false` and redeploy to close public entry points again;
existing sessions, token refresh, `/dashboard`, and super-admin checks stay active.
