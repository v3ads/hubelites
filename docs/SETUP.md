# HubElites environment setup

## Supabase

1. Create a dedicated `HubElites` Supabase project in the chosen organization.
2. Apply `supabase/migrations/001_initial_schema.sql`.
3. Add the project URL and publishable key to deployment environment variables.
4. Configure Supabase Auth Site URL and allowed redirect URLs for local, preview, and production URLs.
5. Configure Brevo as Supabase Auth custom SMTP.
6. Set the Magic Link email template to use the SSR token-hash callback pattern:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/dashboard`
7. After the platform-owner account first authenticates, promote that profile to `is_super_admin = true` using a trusted server-side/admin operation. Do not hard-code the owner email in source.

## Brevo

Use Brevo first for authentication email delivery. Add API-based marketing email features only when campaign sending enters scope.

## Media providers

All provider keys remain server-side only:
- OpenRouter
- HeyGen
- Higgsfield

The browser never receives provider credentials. Expensive generation is credit-gated and invoked through trusted server routes/Edge Functions.

## Vercel

Use separate preview/production environment values where appropriate. Connect `hubelites.com` only after the first preview deployment is accepted.
