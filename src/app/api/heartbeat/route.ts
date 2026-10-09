import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";

/**
 * Lightweight presence ping from the app UI. The master admin dashboard
 * shows a restaurant as "Online" while heartbeats keep arriving.
 * Both owner logins and staff logins mark the shop as online.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const ownerId = session.type === "owner" ? session.user.id : session.staff.ownerId;
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, ownerId));

  return NextResponse.json({ ok: true });
}
