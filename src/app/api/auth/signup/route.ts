import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE,
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
} from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { sendWelcomeEmail, supportEmail } from "@/lib/mail";
import { currencyForCountry, isCountryCode, DEFAULT_COUNTRY } from "@/lib/countries";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("REQUIRED", 400);
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const shopName = String(body.shopName ?? "").trim();
  const country = isCountryCode(body.country) ? String(body.country) : DEFAULT_COUNTRY;

  if (!name || !email || !shopName) return jsonError("REQUIRED", 400);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 191) return jsonError("INVALID_EMAIL", 400);
  if (password.length < 6) return jsonError("PASSWORD_SHORT", 400);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) return jsonError("EMAIL_EXISTS", 409);

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({
      name: name.slice(0, 100),
      email,
      passwordHash,
      shopName: shopName.slice(0, 120),
      country,
      currency: currencyForCountry(country),
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      shopName: users.shopName,
      currency: users.currency,
      country: users.country,
      language: users.language,
    });

  let welcomeEmailSent = false;
  try {
    welcomeEmailSent = await sendWelcomeEmail(created.email, created.name);
  } catch {
    // Email must never block signups (e.g. SMTP down/misconfigured).
  }

  const response = NextResponse.json(
    { user: created, supportEmail: supportEmail(), welcomeEmailSent },
    { status: 201 },
  );
  response.cookies.set(SESSION_COOKIE, createSessionToken(created.id), sessionCookieOptions);
  return response;
}
