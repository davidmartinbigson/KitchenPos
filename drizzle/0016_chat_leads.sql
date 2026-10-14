-- Landing chatbot marketing leads (only stored once a valid phone is shared).
CREATE TABLE IF NOT EXISTS "chat_leads" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL DEFAULT '',
  "kind" text NOT NULL DEFAULT 'customer',
  "country" text NOT NULL DEFAULT '',
  "city" text NOT NULL DEFAULT '',
  "phone" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "chat_leads" ADD COLUMN IF NOT EXISTS "restaurant" text NOT NULL DEFAULT '';
