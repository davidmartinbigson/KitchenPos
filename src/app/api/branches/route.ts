import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, requireActiveUser, requireUser } from "@/lib/api";
import { addonEnabled } from "@/lib/addons";
import { isOnline } from "@/lib/presence";
import { createBranch, ensureBranchSchema, listBranches, mainOwnerIdOf } from "@/lib/branches";

/**
 * GET: the main account's full branch family (main + children) with usage limits.
 * POST: create a child branch (add-on on, under master-set limit).
 */
export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  try {
    await ensureBranchSchema();
  } catch {
    // Columns not there yet → behave as "no branches" instead of 500s.
    return NextResponse.json({
      items: [{ id: user.id, name: user.name, shopName: user.shopName, suspended: user.suspended, online: true, isMain: true, createdAt: null }],
      currentId: user.id,
      limit: 0,
      used: 0,
      canCreate: false,
      addonOn: false,
    });
  }

  const mainId = await mainOwnerIdOf(user.id);
  const family = await listBranches(mainId);
  const main = family.find((r) => r.id === mainId) ?? family[0];
  const children = family.filter((r) => r.parentOwnerId === mainId);
  const addonOn = addonEnabled(user.addons, "branches");

  return NextResponse.json({
    items: family.map((r) => ({
      id: r.id,
      name: r.name,
      shopName: r.shopName,
      suspended: r.suspended,
      online: isOnline(r.lastSeenAt),
      isMain: r.parentOwnerId == null,
      createdAt: r.createdAt,
    })),
    currentId: user.id,
    limit: main?.branchLimit ?? 0,
    used: children.length,
    canCreate: addonOn && user.id === mainId && children.length < (main?.branchLimit ?? 0),
    addonOn,
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireActiveUser();
  if (!user) return response;
  await ensureBranchSchema();

  if (!addonEnabled(user.addons, "branches")) return jsonError("ADDON_OFF", 403);

  const mainId = await mainOwnerIdOf(user.id);
  if (user.id !== mainId) return jsonError("MAIN_ONLY", 403);

  const [main] = await db
    .select({ branchLimit: users.branchLimit })
    .from(users)
    .where(eq(users.id, mainId))
    .limit(1);
  const family = await listBranches(mainId);
  const used = family.filter((r) => r.parentOwnerId === mainId).length;
  if (used >= (main?.branchLimit ?? 0)) return jsonError("BRANCH_LIMIT", 403);

  const body = (await request.json().catch(() => ({}))) as { name?: string; copyMenu?: boolean };
  const name = (body.name ?? "").trim();
  if (name.length < 2 || name.length > 60) return jsonError("NAME_INVALID", 400);

  const row = await createBranch(user, name, body.copyMenu === true);
  return NextResponse.json({ ok: true, branch: { id: row.id, shopName: row.shopName } });
}
