// Public entry points for EXISTING accounts are open: passwordless sign-in
// and the dashboard stay reachable. NEW signups are closed at the Supabase
// Auth layer (disable_signup=true, set 2026-11-06 after a bot-registration
// wave; login actions also pass shouldCreateUser=false) — this flag is the
// harder kill-switch: set to false and redeploy to close sign-in too;
// existing sessions and session refresh stay active either way.
export const PUBLIC_ACCESS_ENABLED = true;
