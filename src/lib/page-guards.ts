import { redirect } from "next/navigation";
import { getSession, type OwnerContext, type StaffSessionRow } from "@/lib/auth";
import type { CurrentUser } from "@/lib/auth";

export function staffHome(role: string) {
  return role === "chef" ? "/kitchen" : "/pos";
}

/** Only shop accounts (owner). Staff is bounced to their own home screen. */
export async function requireOwnerPage(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.type === "staff") redirect(staffHome(session.staff.role));
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
};

/** Kitchen display: chef sees their scoped feed; owner can supervise everything. */
export async function requireKitchenScope(): Promise<KitchenScope> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.type === "staff") {
    const member = session.staff;
    if (member.role !== "chef") redirect("/pos");
    if (!session.ownerActive) redirect("/login");
    return {
      ownerId: member.ownerId,
      viewerRole: "chef",
      viewerName: member.name,
      categories: member.categories,
      shopName: session.owner.shopName,
    };
  }

  return {
    ownerId: session.user.id,
    viewerRole: "owner",
    viewerName: session.user.name,
    categories: [],
    shopName: session.user.shopName,
  };
}
