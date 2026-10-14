import { NextResponse } from "next/server";
import { pool, db } from "@/db";
import { chatLeads } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/api";
import { ensureChatLeadsTable } from "@/lib/chat-leads";

export const dynamic = "force-dynamic";

/** GET /api/admin/leads — master dashboard's "Chat Leads" card. */
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  await ensureChatLeadsTable();
  const leads = await db
    .select()
    .from(chatLeads)
    .orderBy(desc(chatLeads.createdAt))
    .limit(200);

  const { rows } = await pool.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM chat_leads WHERE created_at >= date_trunc('day', now())",
  );

  return NextResponse.json({ leads, today: rows[0]?.n ?? 0 });
}
