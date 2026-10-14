import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatLeads } from "@/db/schema";
import { ensureChatLeadsTable, normalizeLeadPhone } from "@/lib/chat-leads";

export const dynamic = "force-dynamic";

/** Strict rate limit: max 8 lead posts per IP per hour. */
const hits = new Map<string, { n: number; t: number }>();
function rateOk(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now - cur.t > 3_600_000) {
    hits.set(ip, { n: 1, t: now });
    return true;
  }
  cur.n += 1;
  return cur.n <= 8;
}

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/**
 * POST /api/public/leads — chatbot lead capture.
 * Only persists when a VALID phone is shared; name/city without a number are not leads.
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!rateOk(ip)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "REQUIRED" }, { status: 400 });
  }

  const phone = normalizeLeadPhone(clip(body.phone, 40));
  if (!phone) return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });

  const kind = clip(body.kind, 10) === "owner" ? "owner" : "customer";
  const name = clip(body.name, 60);
  const country = clip(body.country, 60);
  const city = clip(body.city, 60);

  await ensureChatLeadsTable();
  await db.insert(chatLeads).values({ name, kind, country, city, phone });
  return NextResponse.json({ ok: true });
}
