import { NextResponse } from "next/server";
import { getCurrentUser, getSession, type AppSession } from "@/lib/auth";
import { hasActiveAccess, isAdmin } from "@/lib/access";

export function jsonError(code: string, status = 400) {
  return NextResponse.json({ error: code }, { status });
}

/** Only checks that somebody is logged in. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: jsonError("UNAUTHORIZED", 401) };
  }
  return { user, response: null };
}

/** Logged in AND holding a valid (non-suspended, non-expired) subscription. */
export async function requireActiveUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: jsonError("UNAUTHORIZED", 401) };
  }
  if (!hasActiveAccess(user)) {
    return { user: null, response: jsonError("ACCESS_INACTIVE", 403) };
  }
  return { user, response: null };
}

/** Master admin only. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: jsonError("UNAUTHORIZED", 401) };
  }
  if (!isAdmin(user)) {
    return { user: null, response: jsonError("FORBIDDEN", 403) };
  }
  return { user, response: null };
}

export function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type AppRole = "owner" | "chef" | "cashier";

export type GuardOk = {
  ok: true;
  session: AppSession;
  ownerId: number;
  role: AppRole;
  response?: never;
};

export type GuardFail = {
  ok: false;
  session: null;
  ownerId: null;
  role: null;
  response: NextResponse;
};

export type GuardResult = GuardOk | GuardFail;

function fail(code: string, status: number): GuardFail {
  return { ok: false, session: null, ownerId: null, role: null, response: jsonError(code, status) };
}

/**
 * Session-aware guard. Anyone from the shop can pass:
 * an owner with an active subscription OR an active staff member whose
 * owner currently has access. Optionally restrict to certain roles.
 */
export async function requireApp(roles?: AppRole[]): Promise<GuardResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", 401);

  if (session.type === "owner") {
    if (!hasActiveAccess(session.user)) return fail("ACCESS_INACTIVE", 403);
    const role: AppRole = "owner";
    if (roles && !roles.includes(role)) return fail("FORBIDDEN", 403);
    return { ok: true, session, ownerId: session.user.id, role };
  }

  const staffRole: AppRole = session.staff.role === "chef" ? "chef" : "cashier";
  if (!session.ownerActive) return fail("OWNER_INACTIVE", 403);
  if (roles && !roles.includes(staffRole)) return fail("FORBIDDEN", 403);
  return { ok: true, session, ownerId: session.staff.ownerId, role: staffRole };
}
