-- Per-shop QR menu branding (color preset + layout).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "menu_theme" jsonb;
