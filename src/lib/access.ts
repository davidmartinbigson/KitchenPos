import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import type { CurrentUser } from "@/lib/auth";

export const MASTER_ADMIN_EMAIL = (
  process.env.MASTER_ADMIN_EMAIL || "davidmartinbigson@gmail.com"
).toLowerCase();

const MASTER_ADMIN_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || "ShAyAnAlI!123#";

export function isAdmin(user: { role: string } | null | undefined) {
  return user?.role === "admin";
}

/** A shop owner can use the app only while not suspended and the subscription is valid. */
export function hasActiveAccess(user: CurrentUser | null | undefined) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (user.suspended) return false;
  if (!user.accessExpiresAt) return false;
  return new Date(user.accessExpiresAt).getTime() > Date.now();
}

export function accessState(user: CurrentUser) {
  if (isAdmin(user)) return "admin" as const;
  if (user.suspended) return "suspended" as const;
  if (!user.accessExpiresAt) return "never_activated" as const;
  return new Date(user.accessExpiresAt).getTime() > Date.now()
    ? ("active" as const)
    : ("expired" as const);
}

export function daysLeft(accessExpiresAt: Date | string | null) {
  if (!accessExpiresAt) return 0;
  const ms = new Date(accessExpiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Creates the master admin account the first time it is needed. Idempotent. */
export async function ensureMasterAdmin() {
  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, MASTER_ADMIN_EMAIL))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
    }
    return;
  }

  try {
    await db.insert(users).values({
      name: "Master Admin",
      email: MASTER_ADMIN_EMAIL,
      passwordHash: await hashPassword(MASTER_ADMIN_PASSWORD),
      shopName: "Kitchen POS HQ",
      role: "admin",
    });
  } catch {
    // Two first logins raced each other — the other request already created it.
  }
}

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike chars

/** Generates a key like KPOS-7F3K-9QX2-MB4D */
export function generateLicenseCode() {
  const group = () => {
    const bytes = randomBytes(4);
    return Array.from(bytes, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join("");
  };
  return `KPOS-${group()}-${group()}-${group()}`;
}

export const PLAN_DURATIONS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  "half-yearly": 182,
  yearly: 365,
  lifetime: 36500,
};

export function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
