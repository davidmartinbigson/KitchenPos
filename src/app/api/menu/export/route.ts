import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { requireApp } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Download all menu items as CSV — same columns the CSV importer accepts,
 * so a file can be edited in Excel and imported back.
 */
export async function GET() {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const ownerId = guard.ownerId;

  const rows = await db.query.menuItems.findMany({
    where: eq(menuItems.userId, ownerId),
    orderBy: [asc(menuItems.category), asc(menuItems.name)],
    limit: 5000,
  });

  const out = ["name,category,description,price,emoji,available,image"];
  for (const item of rows) {
    out.push(
      [
        item.name,
        item.category,
        item.description,
        item.price,
        item.emoji,
        item.available ? "yes" : "no",
        item.imageData ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const body = "﻿" + out.join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="menu-items.csv"',
      "Cache-Control": "no-store",
    },
  });
}
