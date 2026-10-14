import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatLeads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, jsonError } from "@/lib/api";
import { ensureChatLeadsTable } from "@/lib/chat-leads";

export const dynamic = "force-dynamic";

/** DELETE /api/admin/leads/[id] — remove a chat lead. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return jsonError("REQUIRED", 400);
  await ensureChatLeadsTable();
  await db.delete(chatLeads).where(eq(chatLeads.id, id));
  return NextResponse.json({ ok: true });
}
