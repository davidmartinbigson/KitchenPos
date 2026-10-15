import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { staff, users } from "@/db/schema";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "pos_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  return process.env.SESSION_SECRET || "kitchen-pos-dev-secret-change-me";
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scrypt(password, salt, 64);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: number) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function createStaffToken(staffId: number) {
  const payload = Buffer.from(
    JSON.stringify({ sid: staffId, exp: Date.now() + SESSION_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string): { uid?: number; sid?: number } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: number;
      sid?: number;
      exp: number;
    };
    if (data.exp < Date.now()) return null;
    return { uid: data.uid, sid: data.sid };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
  secure: process.env.COOKIE_SECURE === "true",
};

const CURRENT_USER_COLS = {
      id: users.id,
      name: users.name,
      email: users.email,
      shopName: users.shopName,
      currency: users.currency,
      country: users.country,
      city: users.city,
      area: users.area,
      language: users.language,
      role: users.role,
      suspended: users.suspended,
      accessExpiresAt: users.accessExpiresAt,
      itemLimit: users.itemLimit,
      slug: users.slug,
      dailyOrderReset: users.dailyOrderReset,
      addons: users.addons,
      paymentMethods: users.paymentMethods,
      tableCount: users.tableCount,
      receiptHeader: users.receiptHeader,
      receiptFooter: users.receiptFooter,
      receiptLogo: users.receiptLogo,
      receiptSize: users.receiptSize,
      taxRate: users.taxRate,
      googleReviewUrl: users.googleReviewUrl,
      menuTheme: users.menuTheme,
      dashTheme: users.dashTheme,
      lastSeenAt: users.lastSeenAt,
    };

/** Fetches the full owner row - also used by the full-control cashier emulation. */
export async function fetchUserById(uid: number) {
  const [user] = await db.select(CURRENT_USER_COLS).from(users).where(eq(users.id, uid)).limit(1);
  return user ?? null;
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = readSessionToken(token);
  if (!session || !session.uid) return null;
  return fetchUserById(session.uid);
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type StaffSessionRow = {
  id: number;
  ownerId: number;
  name: string;
  email: string;
  role: string;
  categories: string[];
  active: boolean;
};

export type OwnerContext = {
  shopName: string;
  currency: string;
  suspended: boolean;
  accessExpiresAt: Date | null;
  role: string;
  /** Shop add-on flags (drives full-control cashier + branch picker visibility for staff). */
  addons: unknown;
};

/**
 * "Full-control cashier" add-on: this cashier operates the shop like the owner
 * (every page & API), EXCEPT the Live view which stays owner-only by design.
 */
export function hasFullCashierAccess(session: AppSession): boolean {
  if (session.type !== "staff") return false;
  if (session.staff.role !== "cashier") return false;
  const addons = session.owner.addons as Record<string, unknown> | null | undefined;
  return addons?.fullCashier === true;
}

export type AppSession =
  | { type: "owner"; user: CurrentUser }
  | {
      type: "staff";
      staff: StaffSessionRow;
      ownerActive: boolean;
      owner: OwnerContext;
    };

/**
 * Reads the session cookie and resolves it to either a shop account
 * (owner / master admin) or a staff member (chef / cashier).
 */
export async function getSession(): Promise<AppSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const raw = readSessionToken(token);
  if (!raw) return null;

  if (raw.uid) {
    const user = await getCurrentUser();
    return user ? { type: "owner", user } : null;
  }

  if (raw.sid) {
    const [member] = await db
      .select({
        id: staff.id,
        ownerId: staff.ownerId,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        categories: staff.categories,
        active: staff.active,
      })
      .from(staff)
      .where(eq(staff.id, raw.sid))
      .limit(1);
    if (!member || !member.active) return null;

    const [owner] = await db
      .select({
        shopName: users.shopName,
        addons: users.addons,
        currency: users.currency,
        suspended: users.suspended,
        accessExpiresAt: users.accessExpiresAt,
        role: users.role,
        dashTheme: users.dashTheme,
      })
      .from(users)
      .where(eq(users.id, member.ownerId))
      .limit(1);
    if (!owner) return null;

    const ownerActive =
      owner.role === "admin" ||
      (owner.accessExpiresAt !== null &&
        new Date(owner.accessExpiresAt).getTime() > Date.now() &&
        !owner.suspended);

    return { type: "staff", staff: member, ownerActive, owner };
  }

  return null;
}
