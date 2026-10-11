-- Custom payment methods: owner-defined names for the POS payments add-on.
-- Cash is always built in; this list rides alongside it. Default = one neutral
-- "Online payment" chip so the app is global (no country-specific wallets).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "payment_methods" jsonb NOT NULL DEFAULT '["online-payment"]';
