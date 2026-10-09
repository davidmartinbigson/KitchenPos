import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { staff, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { jsonError, parseId, requireActiveUser } from "@/lib/api";
import { STAFF_ROLES } from "@/app/api/staff/route";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const updates: Partial<typeof staff.$inferInsert> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return jsonError("REQUIRED", 400);
    updates.name = name.slice(0, 100);
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return jsonError("INVALID_EMAIL", 400);
    const [takenUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    const [takenStaff] = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.email, email), ne(staff.id, id)))
      .limit(1);
    if (takenUser || takenStaff) return jsonError("EMAIL_EXISTS", 409);
    updates.email = email;
  }
  if (body.password !== undefined && String(body.password).length > 0) {
    const password = String(body.password);
    if (password.length < 6) return jsonError("PASSWORD_SHORT", 400);
    updates.passwordHash = await hashPassword(password);
  }
  if (body.role !== undefined) {
    const role = String(body.role);
    if (!STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) {
      return jsonError("INVALID_ROLE", 400);
    }
    updates.role = role;
  }
  if (body.categories !== undefined) {
    updates.categories = Array.isArray(body.categories)
      ? body.categories
          .map((c) => String(c).trim())
          .filter(Boolean)
          .slice(0, 40)
      : [];
  }
  if (body.active !== undefined) {
    updates.active = Boolean(body.active);
  }

  const [member] = await db
    .update(staff)
    .set(updates)
    .where(and(eq(staff.id, id), eq(staff.ownerId, user.id)))
    .returning({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      categories: staff.categories,
      active: staff.active,
      createdAt: staff.createdAt,
    });

  if (!member) return jsonError("NOT_FOUND", 404);
  return NextResponse.json({ staff: member });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  const id = parseId((await params).id);
  if (!id) return jsonError("NOT_FOUND", 404);

  const deleted = await db
    .delete(staff)
    .where(and(eq(staff.id, id), eq(staff.ownerId, user.id)))
    .returning({ id: staff.id });

  if (deleted.length === 0) return jsonError("NOT_FOUND", 404);

  // The member's login is tied to this row and stops working at once.
  return NextResponse.json({ ok: true });
}
