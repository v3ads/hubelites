-- HubElites — Phase 4: seed the media provider catalog.
-- Member-facing credit costs mirror src/lib/credits.ts (Ayman's rates,
-- locked 2026-11-06: image 12, avatar video 120). internal_cost_micros is
-- the platform's worst-case planning cost per job for margin tracking.

insert into public.media_provider_catalog (provider, model_key, display_name, media_kind, internal_cost_micros, credit_cost, enabled, config)
values
  ('higgsfield', 'soul_v2_standard', 'Image — Soul V2 (720p)', 'image', 90000, 12, true,
   '{"endpoint": "higgsfield-ai/soul/v2/standard", "resolution": "720p", "aspect_ratio": "3:4"}'::jsonb),
  ('heygen', 'avatar_iii_default', 'Avatar video — HeyGen (Avatar III, ≤60s)', 'avatar_video', 990000, 120, true,
   '{"engine": "avatar_iii", "fallback_engine": "avatar_iv", "resolution": "1080p", "aspect_ratio": "9:16", "max_script_chars": 900}'::jsonb)
on conflict (provider, model_key) do update
  set display_name = excluded.display_name,
      media_kind = excluded.media_kind,
      internal_cost_micros = excluded.internal_cost_micros,
      credit_cost = excluded.credit_cost,
      enabled = excluded.enabled,
      config = excluded.config,
      updated_at = now();
