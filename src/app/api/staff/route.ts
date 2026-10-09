import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { staff, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { jsonError, requireActiveUser } from "@/lib/api";

const MAX_STAFF_PER_OWNER = 50;
export const STAFF_ROLES = ["chef", "cashier"] as const;

export async function GET() {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  const members = await db
    .select({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      categories: staff.categories,
      active: staff.active,
      createdAt: staff.createdAt,
    })
    .from(staff)
    .where(eq(staff.ownerId, user.id))
    .orderBy(desc(staff.createdAt));

  return NextResponse.json({ staff: members });
}

export async function POST(request: Request) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "cashier");
  const categories = Array.isArray(body.categories)
    ? body.categories
        .map((c) => String(c).trim())
        .filter(Boolean)
        .slice(0, 40)
    : [];

  if (!name || !email) return jsonError("REQUIRED", 400);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 191) return jsonError("INVALID_EMAIL", 400);
  if (password.length < 6) return jsonError("PASSWORD_SHORT", 400);
  if (!STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) {
    return jsonError("INVALID_ROLE", 400);
  }

  const [countRow] = await db
    .select({ count: db.$count(staff, eq(staff.ownerId, user.id)) })
    .from(staff)
    .where(eq(staff.ownerId, user.id));
  if ((countRow?.count ?? 0) >= MAX_STAFF_PER_OWNER) return jsonError("STAFF_LIMIT", 400);

  const [takenUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  const [takenStaff] = await db.select({ id: staff.id }).from(staff).where(eq(staff.email, email)).limit(1);
  if (takenUser || takenStaff) return jsonError("EMAIL_EXISTS", 409);

  const [member] = await db
    .insert(staff)
    .values({
      ownerId: user.id,
      name: name.slice(0, 100),
      email,
      passwordHash: await hashPassword(password),
      role,
      categories,
      active: body.active === false ? false : true,
    })
    .returning({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      categories: staff.categories,
      active: staff.active,
      createdAt: staff.createdAt,
    });

  return NextResponse.json({ staff: member }, { status: 201 });
}
