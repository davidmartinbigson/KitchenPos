import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireApp } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Download the restaurant's sales as a CSV file (opens in Excel).
 *   ?range=month (default) | day | all
 *   ?day=YYYY-MM-DD (for range=day)   ?tz=<minutes> (client timezone offset)
 */
export async function GET(request: Request) {
  const guard = await requireApp(["owner"]);
  if (!guard.ok) return guard.response;
  const { ownerId, session } = guard;
  const currency = session.type === "owner" ? session.user.currency : "";
  const cur = currency ? ` (${currency})` : "";

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "month";
  const tzMin = Number(url.searchParams.get("tz") ?? 0) || 0;

  const conditions = [eq(orders.userId, ownerId)];
  let stamp = "all-time";
  const nowLocal = new Date(Date.now() - tzMin * 60000);

  if (range === "month") {
    const y = nowLocal.getUTCFullYear();
    const m = nowLocal.getUTCMonth();
    conditions.push(gte(orders.createdAt, new Date(Date.UTC(y, m, 1) + tzMin * 60000)));
    conditions.push(lt(orders.createdAt, new Date(Date.UTC(y, m + 1, 1) + tzMin * 60000)));
    stamp = `${y}-${String(m + 1).padStart(2, "0")}`;
  } else if (range === "day") {
    const day = url.searchParams.get("day") ?? "";
    const [y, m, d] = day.split("-").map(Number);
    if (y && m && d) {
      conditions.push(gte(orders.createdAt, new Date(Date.UTC(y, m - 1, d) + tzMin * 60000)));
      conditions.push(lt(orders.createdAt, new Date(Date.UTC(y, m - 1, d + 1) + tzMin * 60000)));
      stamp = day;
    }
  }

  const rows = await db.query.orders.findMany({
    where: and(...conditions),
    orderBy: [asc(orders.createdAt)],
    limit: 10000,
    with: { items: true },
  });

  const localOf = (date: Date) => new Date(date.getTime() - tzMin * 60000);
  const header = [
    "Order #", "Date", "Time", "Customer", "Taken By", "Qty", "Items",
    `Subtotal${cur}`, `Total${cur}`, `Received${cur}`, `Change${cur}`,
  ];
  const out = [header.map(csvCell).join(",")];

  let grandTotal = 0;
  let grandQty = 0;
  for (const o of rows) {
    grandTotal += o.total;
    grandQty += o.itemCount;
    const summary = o.items.map((i) => `${i.quantity} × ${i.name}`).join("; ");
    out.push(
      [
        o.orderNumber,
        localOf(o.createdAt).toISOString().slice(0, 10),
        localOf(o.createdAt).toISOString().slice(11, 16),
        o.customerName,
        o.takenBy,
        o.itemCount,
        summary,
        o.subtotal,
        o.total,
        o.amountReceived,
        o.changeDue,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  out.push(new Array(12).join(","));
  out.push(
    ["GRAND TOTAL", `${rows.length} orders`, "", "", "", grandQty, "", "", grandTotal, "", ""]
      .map(csvCell)
      .join(","),
  );

  const body = "﻿" + out.join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
