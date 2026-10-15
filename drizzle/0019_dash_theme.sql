-- Dashboard white-label accent.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dash_theme" jsonb;
