import { NextResponse } from "next/server";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { jsonError, requireApp } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const { ownerId } = guard;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const conditions = [eq(expenses.userId, ownerId)];
  if (from && !Number.isNaN(Date.parse(from))) conditions.push(gte(expenses.createdAt, new Date(from)));
  if (to && !Number.isNaN(Date.parse(to))) conditions.push(lt(expenses.createdAt, new Date(to)));

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(asc(expenses.createdAt))
    .limit(2000);

  return NextResponse.json({ expenses: rows });
}

export async function POST(request: Request) {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const { ownerId } = guard;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const title = String(body.title ?? "").trim().slice(0, 120);
  const amount = Math.round(Number(body.amount));
  if (!title || !Number.isFinite(amount) || amount < 1 || amount > 100_000_000) {
    return jsonError("EXPENSE_INVALID", 400);
  }

  const [created] = await db
    .insert(expenses)
    .values({ userId: ownerId, title, amount })
    .returning();
  return NextResponse.json({ expense: created }, { status: 201 });
}
