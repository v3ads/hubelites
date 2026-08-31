# HubElites

AI-powered marketing engine for eStage Ambassadors.

## Current scaffold

- Dark-first marketing site (hero product mockup, bento system, engine loop, campaign brief, comparison, FAQ)
- Split-screen passwordless login
- Interactive six-step onboarding flow
- Ambassador dashboard (KPIs, next best action, campaign pipeline, weekly calendar)
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
