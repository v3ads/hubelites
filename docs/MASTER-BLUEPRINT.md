# HubElites V1 Master Blueprint

## Product thesis

HubElites turns an eStage Ambassador's existing syndicated Mission 1000 domain into an AI-powered marketing engine. It does not replace eStage's webinar pages, attribution, checkout, or Mission 1000 funnel. It creates demand in front of them and sends traffic back to the Ambassador's own attributed destination.

## V1 promise

Connect your brand, Mission 1000 destination, audience, and channels. HubElites creates campaigns, media, outreach, and publishing plans that drive prospects into your syndicated eStage funnel.

## Roles

- **Super Admin** — global platform visibility, Mission Brain control, provider economics, credits, campaigns, users, system health, and audit logs.
- **Ambassador Owner** — tenant owner with access to branding, Mission 1000 destination, audiences, campaigns, media, credits, prospects, analytics, and connections.
- **Team Member** — later V1 role for delegated access.

## Authentication

Passwordless Supabase Auth. Magic-link email is delivered through Brevo custom SMTP. Sessions use Supabase SSR cookies. Super Admin identity is promoted through a trusted bootstrap operation and is never hard-coded in source.

## Onboarding

1. Your identity
2. Mission 1000 funnel URL
3. Target audience
4. Connect channels
5. Content style
6. Generate first campaign

The user should finish onboarding with a useful campaign, not an empty dashboard.

## Core engines

### Mission Brain
Super Admin-controlled source of truth for approved Mission 1000 positioning, current offers, webinar state, claims, restrictions, FAQs, CTAs, links, and effective dates.

### Campaign Intelligence
Inputs: brand, destination, audience, goal, channel mix, media budget, Mission Brain. Outputs: campaign angle, calendar, social posts, emails, video scripts, media briefs, and CTAs.

Budget modes: Economy, Balanced, Video Heavy.

### Media Orchestrator
Provider abstraction over HeyGen, Higgsfield, OpenRouter media models, and future providers. Members see HubElites credits rather than provider pricing.

### Credit Safety
No expensive generation begins without sufficient prepaid balance. Credits are estimated, reserved, charged/refunded by policy, and mapped to internal provider costs so the platform can protect margin.

### Distribution
Social OAuth, preview, approval, scheduling, publishing, and channel analytics are added incrementally by provider/channel.

### Learning Loop
Asset and campaign performance should improve future recommendations. Initial HubElites attribution ends at funnel visit/click unless eStage later exposes registration/sale outcomes.

## Main navigation

Home, Campaigns, Create, Content, Calendar, Prospects, Analytics. Utilities: Brand, Connections, Credits, Settings. Persistent primary action: **Create with AI**.

## Super Admin

Platform Overview, Members, Organizations, Campaigns, Social Connections, Media Jobs, Provider Catalog, Credit Ledger, Mission Brain, Analytics, System Health, Audit Log.

## Core data model

profiles, organizations, organization_members, brand_profiles, ambassador_destinations, audiences, social_connections, campaigns, campaign_assets, media_provider_catalog, credit_wallets, credit_ledger, generation_jobs, prospects, mission_brain_items, analytics_events, audit_log.

Tenant isolation is enforced with PostgreSQL Row Level Security.

## Stack

- Next.js 16 App Router + React + TypeScript
- Supabase Postgres/Auth/Storage/Edge Functions
- Brevo SMTP and later Brevo campaign API where useful
- OpenRouter for reasoning/model routing
- HeyGen/Higgsfield/OpenRouter adapters for media
- Vercel deployment
- GitHub source control

## Visual system

Dark-first premium AI product aesthetic. Core colors: background #060914, surface #111827, electric blue #397BFF, cyan #22D3EE, violet #7C5CFF, success #2DD4A0, text #F7F9FC. Signature gradient: blue → cyan → violet. Public site is cinematic; app reduces visual intensity for long-session usability. Light theme is supported.

Do not use the eStage logo unless an official partnership/license permits it. Until then use clear text such as “Built for eStage Ambassadors” plus an independence disclaimer.

## Mobile

Mobile is an approval/publishing surface, not a squeezed desktop. Prioritize preview, edit, approve, schedule, publish, credit impact, recommendations, and quick campaign creation.

## Deliberately postponed

### Unlimited Hub Owner Mode
Managed Hub packages, seller pricing, Stripe Connect, client checkout, onboarding, demo domains/subdomains.

### Demo Pro
Per-prospect eStage/Genesis project connection using GenWhisperer-derived technology surfaced only as a HubElites add-on. Each project must be connected independently.

## Build sequence

1. Foundation: repo, UI shell, Supabase schema/RLS, environment strategy, Vercel preview.
2. Identity/onboarding: passwordless auth, organization bootstrap, brand, Mission 1000 URL, audiences.
3. Mission Brain + text campaign engine.
4. Credits + media adapters.
5. Social connections and publishing.
6. Analytics and learning.
7. Prospect mode.
8. Later: Hub Owner Mode and Demo Pro.

## Launch strategy

Use HubElites privately first during Mission 1000, optionally with a small trusted founding-test group. Capture campaign output, clicks, registrations/sales where verifiable, and testimonials. Broader Ambassador launch should be driven by proof rather than a concept-only announcement.
