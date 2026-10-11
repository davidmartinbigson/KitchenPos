-- Payment proof add-on: guests upload an online-payment screenshot that stays
-- attached to their QR order (owner verifies it in the QR-order inbox / Sales).
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_proof" text;
