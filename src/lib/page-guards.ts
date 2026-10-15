import { redirect } from "next/navigation";
import { fetchUserById, getSession, hasFullCashierAccess, type OwnerContext, type StaffSessionRow } from "@/lib/auth";
import type { CurrentUser } from "@/lib/auth";

export function staffHome(role: string) {
  return role === "chef" ? "/kitchen" : "/pos";
}

/**
 * Shop account pages. With the full-control-cashier add-on ON, a cashier
 * emulates the owner everywhere. ` ownerOnly: true ` keeps a page strict
 * (the Live view always stays owner-only).
 */
export async function requireOwnerPage(opts?: { ownerOnly?: boolean }): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.type === "staff") {
    if (opts?.ownerOnly || !hasFullCashierAccess(session)) {
      redirect(staffHome(session.staff.role));
    }
    if (!session.ownerActive) redirect("/login");
    const ownerUser = await fetchUserById(session.staff.ownerId);
    if (!ownerUser) redirect("/login");
    return ownerUser;
  }
  return session.user;
}

export type PosScope =
  | { type: "owner"; user: CurrentUser; ownerId: number; sellerName: string; shopName: string; currency: string }
  | {
      type: "staff";
      staff: StaffSessionRow;
      owner: OwnerContext;
      ownerId: number;
      sellerName: string;
      shopName: string;
      currency: string;
    };

/** POS page: owner or cashier. Chef goes to the kitchen. */
export async function requirePosScope(): Promise<PosScope> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.type === "staff") {
    const member = session.staff;
    if (member.role === "chef") redirect("/kitchen");
    if (!session.ownerActive) redirect("/login");
    return {
      type: "staff",
      staff: member,
      owner: session.owner,
      ownerId: member.ownerId,
      sellerName: member.name,
      shopName: session.owner.shopName,
      currency: session.owner.currency,
    };
  }

  return {
    type: "owner",
    user: session.user,
    ownerId: session.user.id,
    sellerName: session.user.name,
    shopName: session.user.shopName,
    currency: session.user.currency,
  };
}

export type KitchenScope = {
  ownerId: number;
  viewerRole: "owner" | "chef";
  viewerName: string;
  categories: string[];
  shopName: string;
  /** Owner's add-on flags — the display itself is now an opt-in add-on. */
  addons: Record<string, unknown>;
};

/** Kitchen display: chef sees their scoped feed; owner can supervise everything. */
export async function requireKitchenScope(): Promise<KitchenScope> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.type === "staff") {
    const member = session.staff;
    const elevated = hasFullCashierAccess(session);
    if (member.role !== "chef" && !elevated) redirect("/pos");
    if (!session.ownerActive) redirect("/login");
    if (member.role === "chef") {
      return {
        ownerId: member.ownerId,
        viewerRole: "chef",
        viewerName: member.name,
        categories: member.categories,
        shopName: session.owner.shopName,
        addons: session.owner.addons as Record<string, unknown>,
      };
    }
    // Full-control cashier supervises the kitchen like the owner.
    return {
      ownerId: member.ownerId,
      viewerRole: "owner",
      viewerName: member.name,
      categories: [],
      shopName: session.owner.shopName,
      addons: session.owner.addons as Record<string, unknown>,
    };
  }

  return {
    ownerId: session.user.id,
    viewerRole: "owner",
    viewerName: session.user.name,
    categories: [],
    shopName: session.user.shopName,
    addons: session.user.addons as Record<string, unknown>,
  };
}
