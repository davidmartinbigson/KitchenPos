-- Staff quota per shop (master admin adjustable, default 3).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "staff_limit" integer NOT NULL DEFAULT 3;
