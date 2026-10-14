import { NextResponse } from "next/server";
import { pool, db } from "@/db";
import { chatLeads } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/api";
import { ensureChatLeadsTable } from "@/lib/chat-leads";

export const dynamic = "force-dynamic";

/** GET /api/admin/leads?page=1&per=8 — master dashboard's "Chat Leads" card (paginated). */
export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Math.min(10_000, Math.round(Number(searchParams.get("page") ?? 1)) || 1));
  const per = Math.max(1, Math.min(50, Math.round(Number(searchParams.get("per") ?? 8)) || 8));

  await ensureChatLeadsTable();
  const leads = await db
    .select()
    .from(chatLeads)
    .orderBy(desc(chatLeads.createdAt))
    .limit(per)
    .offset((page - 1) * per);

  const { rows } = await pool.query<{ n: number; today: number }>(
    "SELECT count(*)::int AS n, count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today FROM chat_leads",
  );

  return NextResponse.json({ leads, today: rows[0]?.today ?? 0, total: rows[0]?.n ?? 0, page, per });
}
