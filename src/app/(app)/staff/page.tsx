import { requireOwnerPage } from "@/lib/page-guards";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { StaffManager } from "@/components/staff/staff-manager";

export const metadata = { title: "Team & Roles" };

export default async function StaffPage() {
  const user = await requireOwnerPage();

  // Suggest category names the owner already uses on their menu.
  const rows = await db
    .select({ category: menuItems.category })
    .from(menuItems)
    .where(eq(menuItems.userId, user.id));
  const suggestions = Array.from(new Set(rows.map((r) => r.category))).filter(
    (c) => c && c !== "General",
  );

  return <StaffManager suggestions={suggestions} />;
}
