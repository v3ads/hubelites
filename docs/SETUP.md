# HubElites Setup

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Required public environment variables

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Server-only environment variables

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPER_ADMIN_EMAIL`
- `BREVO_API_KEY`
- `OPENROUTER_API_KEY`
- `ANTHROPIC_API_KEY`
- `HEYGEN_API_KEY`
- `HIGGSFIELD_API_KEY`

Optional model overrides: `OPENROUTER_MODEL`, `ANTHROPIC_MODEL`.

Never expose server-only keys through `NEXT_PUBLIC_*` variables.

## AI provider routing (Anthropic first-spend)

Campaign generation is Anthropic-first with an OpenRouter fallback, governed
by `src/lib/ai-config.ts`. When `ANTHROPIC_API_KEY` is set and the
hubelites-generation workload is under its $35 per-cycle cap (cycles run from
the 4th of each month), generation calls Anthropic direct (Sonnet); at the
cap or on any Anthropic error it falls back silently to OpenRouter. With no
`ANTHROPIC_API_KEY`, behaviour is OpenRouter-only, exactly as before. Spend
is recorded in the `ai_spend_ledger` table (migration 002) and summarised on
the Super Admin overview.

## Database

Live Supabase project: `HubElites` in `us-east-1`.

The initial schema is in:

`supabase/migrations/001_initial_schema.sql`

Follow-ups are applied the same way — paste the file into the Supabase SQL
Editor and run it once:

- `supabase/migrations/002_ai_spend_ledger.sql` — AI spend ledger. **Owner
  action:** apply this in the HubElites Supabase project to activate the
  Anthropic first-spend layer; until then generation stays on OpenRouter.

It provides tenant isolation, Super Admin visibility, campaign/media/credit primitives, Mission Brain storage, prospects, analytics and audit logging.

## Authentication

The current app uses Supabase passwordless OTP/magic-link authentication. Production email delivery is intended to be customized through Brevo. Configure production redirect URLs before enabling external users.

## Build validation

This execution environment has no shell DNS access to GitHub or npm. Development therefore uses the connected GitHub API for repository synchronization, and GitHub Actions for network-enabled dependency installation and production build validation.

The workflow is `.github/workflows/ci.yml` and runs on pushes and pull requests to `main`.

## Deployment

Next target: Vercel. Configure the public Supabase variables and server-only keys in the Vercel project rather than committing them to GitHub.
