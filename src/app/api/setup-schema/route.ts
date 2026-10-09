import { NextResponse } from "next/server";
import { pool } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-shot schema bootstrap for serverless deploys (e.g. Vercel) where
// opening a psql shell against the production DB is not possible.
// Guarded by the master admin password; idempotent no-op once applied.

const MIGRATIONS: string[] = [
"CREATE TABLE \"license_keys\" (\n\t\"id\" serial PRIMARY KEY NOT NULL,\n\t\"code\" text NOT NULL,\n\t\"plan\" text DEFAULT 'monthly' NOT NULL,\n\t\"duration_days\" integer DEFAULT 30 NOT NULL,\n\t\"note\" text DEFAULT '' NOT NULL,\n\t\"revoked\" boolean DEFAULT false NOT NULL,\n\t\"redeemed_by_user_id\" integer,\n\t\"redeemed_at\" timestamp with time zone,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"license_keys_code_unique\" UNIQUE(\"code\")\n);\n--> statement-breakpoint\nCREATE TABLE \"menu_items\" (\n\t\"id\" serial PRIMARY KEY NOT NULL,\n\t\"user_id\" integer NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"category\" text DEFAULT 'General' NOT NULL,\n\t\"description\" text DEFAULT '' NOT NULL,\n\t\"price\" integer DEFAULT 0 NOT NULL,\n\t\"image_data\" text,\n\t\"emoji\" text DEFAULT '🍽️' NOT NULL,\n\t\"available\" boolean DEFAULT true NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);\n--> statement-breakpoint\nCREATE TABLE \"order_items\" (\n\t\"id\" serial PRIMARY KEY NOT NULL,\n\t\"order_id\" integer NOT NULL,\n\t\"menu_item_id\" integer,\n\t\"name\" text NOT NULL,\n\t\"unit_price\" integer NOT NULL,\n\t\"quantity\" integer NOT NULL,\n\t\"line_total\" integer NOT NULL,\n\t\"category\" text DEFAULT '' NOT NULL,\n\t\"status\" text DEFAULT 'new' NOT NULL\n);\n--> statement-breakpoint\nCREATE TABLE \"orders\" (\n\t\"id\" serial PRIMARY KEY NOT NULL,\n\t\"user_id\" integer NOT NULL,\n\t\"order_number\" integer NOT NULL,\n\t\"customer_name\" text DEFAULT '' NOT NULL,\n\t\"staff_id\" integer,\n\t\"taken_by\" text DEFAULT '' NOT NULL,\n\t\"subtotal\" integer DEFAULT 0 NOT NULL,\n\t\"total\" integer DEFAULT 0 NOT NULL,\n\t\"amount_received\" integer DEFAULT 0 NOT NULL,\n\t\"change_due\" integer DEFAULT 0 NOT NULL,\n\t\"item_count\" integer DEFAULT 0 NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL\n);\n--> statement-breakpoint\nCREATE TABLE \"staff\" (\n\t\"id\" serial PRIMARY KEY NOT NULL,\n\t\"owner_id\" integer NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"email\" text NOT NULL,\n\t\"password_hash\" text NOT NULL,\n\t\"role\" text DEFAULT 'cashier' NOT NULL,\n\t\"categories\" text[] DEFAULT '{}'::text[] NOT NULL,\n\t\"active\" boolean DEFAULT true NOT NULL,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"staff_email_unique\" UNIQUE(\"email\")\n);\n--> statement-breakpoint\nCREATE TABLE \"users\" (\n\t\"id\" serial PRIMARY KEY NOT NULL,\n\t\"name\" text NOT NULL,\n\t\"email\" text NOT NULL,\n\t\"password_hash\" text NOT NULL,\n\t\"shop_name\" text DEFAULT 'My Kitchen' NOT NULL,\n\t\"currency\" text DEFAULT 'Rs' NOT NULL,\n\t\"language\" text DEFAULT 'en' NOT NULL,\n\t\"role\" text DEFAULT 'owner' NOT NULL,\n\t\"suspended\" boolean DEFAULT false NOT NULL,\n\t\"access_expires_at\" timestamp with time zone,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"users_email_unique\" UNIQUE(\"email\")\n);\n--> statement-breakpoint\nALTER TABLE \"license_keys\" ADD CONSTRAINT \"license_keys_redeemed_by_user_id_users_id_fk\" FOREIGN KEY (\"redeemed_by_user_id\") REFERENCES \"public\".\"users\"(\"id\") ON DELETE set null ON UPDATE no action;--> statement-breakpoint\nALTER TABLE \"menu_items\" ADD CONSTRAINT \"menu_items_user_id_users_id_fk\" FOREIGN KEY (\"user_id\") REFERENCES \"public\".\"users\"(\"id\") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint\nALTER TABLE \"order_items\" ADD CONSTRAINT \"order_items_order_id_orders_id_fk\" FOREIGN KEY (\"order_id\") REFERENCES \"public\".\"orders\"(\"id\") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint\nALTER TABLE \"order_items\" ADD CONSTRAINT \"order_items_menu_item_id_menu_items_id_fk\" FOREIGN KEY (\"menu_item_id\") REFERENCES \"public\".\"menu_items\"(\"id\") ON DELETE set null ON UPDATE no action;--> statement-breakpoint\nALTER TABLE \"orders\" ADD CONSTRAINT \"orders_user_id_users_id_fk\" FOREIGN KEY (\"user_id\") REFERENCES \"public\".\"users\"(\"id\") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint\nALTER TABLE \"orders\" ADD CONSTRAINT \"orders_staff_id_staff_id_fk\" FOREIGN KEY (\"staff_id\") REFERENCES \"public\".\"staff\"(\"id\") ON DELETE set null ON UPDATE no action;--> statement-breakpoint\nALTER TABLE \"staff\" ADD CONSTRAINT \"staff_owner_id_users_id_fk\" FOREIGN KEY (\"owner_id\") REFERENCES \"public\".\"users\"(\"id\") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint\nCREATE INDEX \"license_keys_redeemed_idx\" ON \"license_keys\" USING btree (\"redeemed_by_user_id\");--> statement-breakpoint\nCREATE INDEX \"menu_items_user_idx\" ON \"menu_items\" USING btree (\"user_id\");--> statement-breakpoint\nCREATE INDEX \"order_items_order_idx\" ON \"order_items\" USING btree (\"order_id\");--> statement-breakpoint\nCREATE INDEX \"orders_user_created_idx\" ON \"orders\" USING btree (\"user_id\",\"created_at\");--> statement-breakpoint\nCREATE INDEX \"staff_owner_idx\" ON \"staff\" USING btree (\"owner_id\");",
"-- Owner-extended schema: countries, item limits, presence & password resets\n\nALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"country\" text DEFAULT 'PK' NOT NULL;\nALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"item_limit\" integer DEFAULT 500 NOT NULL;\nALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"last_seen_at\" timestamp with time zone;\n\nCREATE TABLE IF NOT EXISTS \"password_resets\" (\n\t\"id\" serial PRIMARY KEY NOT NULL,\n\t\"email\" text NOT NULL,\n\t\"token\" text NOT NULL,\n\t\"expires_at\" timestamp with time zone NOT NULL,\n\t\"used_at\" timestamp with time zone,\n\t\"created_at\" timestamp with time zone DEFAULT now() NOT NULL,\n\tCONSTRAINT \"password_resets_token_unique\" UNIQUE(\"token\")\n);\n--> statement-breakpoint\nCREATE INDEX IF NOT EXISTS \"password_resets_email_idx\" ON \"password_resets\" USING btree (\"email\");\n",
];

export async function POST(req: Request) {
  const secret = req.headers.get("x-setup-secret");
  const expected = process.env.MASTER_ADMIN_PASSWORD;
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const { rows } = await pool.query(
      "select table_name from information_schema.tables where table_schema='public' and table_name='license_keys'"
    );
    if (rows.length > 0) {
      return NextResponse.json({ ok: true, alreadyInitialized: true });
    }
    for (const sql of MIGRATIONS) {
      await pool.query(sql);
    }
    return NextResponse.json({ ok: true, initialized: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
