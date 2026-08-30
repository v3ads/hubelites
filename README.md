# HubElites

AI-powered marketing engine for eStage Ambassadors.

## Current scaffold

- Premium dark-first public landing page
- Passwordless login UI
- Six-step onboarding shell
- Ambassador dashboard shell
- Super Admin command-center shell
- Initial multi-tenant Supabase schema + RLS
- Master product/technical blueprint

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
