import { NextResponse } from "next/server";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Tiny fixed-window rate limiter (per IP) — keeps the public discovery safe. */
const hits = new Map<string, { n: number; t: number }>();
function rateOk(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now - cur.t > 60_000) {
    hits.set(ip, { n: 1, t: now });
    return true;
  }
  cur.n += 1;
  return cur.n <= 30;
}

/**
 * GET /api/public/restaurants?city=Karachi
 * Powers the landing chatbot's "restaurants near you" flow.
 * Returns only publicly shareable identity of menus with a vanity slug —
 * never emails, plan data or sales numbers.
 */
export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!rateOk(ip)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const city = (searchParams.get("city") ?? "").trim().slice(0, 60);
  if (city.length < 3) return NextResponse.json({ restaurants: [] });

  const rows = await db
    .select({ id: users.id, name: users.shopName, slug: users.slug, city: users.city, country: users.country })
    .from(users)
    .where(and(eq(users.role, "owner"), ne(users.suspended, true), isNotNull(users.slug)))
    .limit(400);

  const q = city.toLowerCase();
  const matches = rows
    .filter((r) => r.slug && r.city && r.city.toLowerCase().includes(q))
    .slice(0, 12)
    .map((r) => ({ id: r.id, name: r.name, slug: r.slug as string, city: r.city }));

  return NextResponse.json({ restaurants: matches });
}
