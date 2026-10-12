import { randomBytes } from "crypto";
import { eq, or } from "drizzle-orm";
import { db, pool } from "@/db";
import { menuItems, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";

/**
 * Multi-branch add-on.
 *
 * A branch is simply a full owner row in `users` whose `parentOwnerId` points at
 * the main account. Every existing query keys off `users.id`, so a branch gets a
 * completely isolated dashboard/menu/staff/orders "for free". Switching branches =
 * rewriting the signed session cookie to the branch's user id — zero rest-of-app changes.
 */

export type BranchRow = {
  id: number;
  name: string;
  shopName: string;
  email: string;
  suspended: boolean;
  accessExpiresAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  parentOwnerId: number | null;
  branchLimit: number;
};

let branchSchemaPromise: Promise<void> | null = null;

/**
 * Self-healing schema guard. Every branch code path calls this first, so the app
 * keeps working even if the deploy went out before /api/setup-schema was run.
 * Idempotent (ADD COLUMN IF NOT EXISTS).
 */
export function ensureBranchSchema(): Promise<void> {
  if (!branchSchemaPromise) {
    branchSchemaPromise = (async () => {
      const { rows } = await pool.query(
        "select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='parent_owner_id'",
      );
      if (rows.length > 0) return;
      await pool.query(
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "branch_limit" integer NOT NULL DEFAULT 1`,
      );
      await pool.query(
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "parent_owner_id" integer REFERENCES "public"."users"("id") ON DELETE cascade`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS "users_parent_owner_idx" ON "users" ("parent_owner_id")`,
      );
    })();
  }
  return branchSchemaPromise;
}

const BRANCH_COLS = {
  id: users.id,
  name: users.name,
  shopName: users.shopName,
  email: users.email,
  suspended: users.suspended,
  accessExpiresAt: users.accessExpiresAt,
  lastSeenAt: users.lastSeenAt,
  createdAt: users.createdAt,
  parentOwnerId: users.parentOwnerId,
  branchLimit: users.branchLimit,
} as const;

export async function getBranchRow(id: number): Promise<BranchRow | null> {
  const [row] = await db.select(BRANCH_COLS).from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

/** The main account id for any logged-in owner (main or branch). Staff never switch. */
export async function mainOwnerIdOf(userId: number): Promise<number> {
  const row = await getBranchRow(userId);
  if (!row) return userId;
  return row.parentOwnerId ?? row.id;
}

export async function listBranches(mainId: number): Promise<BranchRow[]> {
  return db
    .select(BRANCH_COLS)
    .from(users)
    .where(or(eq(users.id, mainId), eq(users.parentOwnerId, mainId)))
    .orderBy(users.createdAt);
}

export function slugify(raw: string) {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "branch"
  );
}

/**
 * Creates a child branch under the owner's MAIN account.
 * Copies subscription window, settings-style columns and (optionally) the menu.
 * Caller is responsible for the add-on + limit checks.
 */
export async function createBranch(
  main: CurrentUser & { id: number; email: string },
  name: string,
  copyMenu: boolean,
): Promise<BranchRow> {
  const safeName = name.trim().slice(0, 60);
  const email = `${main.email.split("@")[0]}.br${Date.now().toString(36)}@branches.local`;

  const [row] = await db
    .insert(users)
    .values({
      name: main.name,
      email,
      passwordHash: cryptoRandomHashLike(),
      shopName: safeName,
      currency: main.currency,
      country: main.country,
      city: main.city,
      area: main.area,
      language: main.language,
      role: "owner",
      suspended: false,
      accessExpiresAt: main.accessExpiresAt,
      itemLimit: main.itemLimit,
      dailyOrderReset: main.dailyOrderReset,
      addons: main.addons,
      paymentMethods: main.paymentMethods,
      tableCount: main.tableCount,
      receiptHeader: main.receiptHeader,
      receiptFooter: main.receiptFooter,
      receiptLogo: main.receiptLogo,
      receiptSize: main.receiptSize,
      taxRate: main.taxRate,
      parentOwnerId: main.id,
      branchLimit: 0, // branches cannot create branches (only the main account)
    })
    .returning(BRANCH_COLS);

  // Vanity menu URL for the branch (mirrors setup backfill so /menu/… works too).
  await db
    .update(users)
    .set({ slug: `${slugify(safeName)}-${row.id}` })
    .where(eq(users.id, row.id));

  if (copyMenu) {
    const items = await db
      .select({
        name: menuItems.name,
        category: menuItems.category,
        description: menuItems.description,
        price: menuItems.price,
        imageData: menuItems.imageData,
        emoji: menuItems.emoji,
        available: menuItems.available,
        stockQty: menuItems.stockQty,
        extras: menuItems.extras,
        costPrice: menuItems.costPrice,
      })
      .from(menuItems)
      .where(eq(menuItems.userId, main.id));
    if (items.length > 0) {
      await db.insert(menuItems).values(items.map((it) => ({ ...it, userId: row.id })));
    }
  }

  return row;
}

/** Branches never accept direct logins — the stored hash is unusable on purpose. */
function cryptoRandomHashLike() {
  return `locked:${randomBytes(32).toString("hex")}`;
}
