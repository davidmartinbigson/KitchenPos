import { readFileSync } from "fs";
import { join } from "path";
import nodemailer from "nodemailer";

/**
 * Optional SMTP mailer. Configure these env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * If SMTP is not configured the related API falls back to showing links
 * directly on screen, so features always work.
 */
export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

export function supportEmail() {
  return (
    process.env.SUPPORT_EMAIL ||
    process.env.MASTER_ADMIN_EMAIL ||
    "prokitchenpos@gmail.com"
  );
}

export function createTransporter() {
  const port = Number(process.env.SMTP_PORT ?? 587) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export function fromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@kitchen-pos.app";
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!smtpConfigured()) return false;

  await createTransporter().sendMail({
    from: fromAddress(),
    to,
    subject: "Reset your Kitchen POS password",
    text: `You asked to reset your Kitchen POS password.\n\nOpen this link to choose a new password (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0f172a">Kitchen POS — password reset</h2>
        <p>You asked to reset your password. Click the button below to choose a new one. The link is valid for <b>30 minutes</b>.</p>
        <p style="margin:28px 0">
          <a href="${resetUrl}" style="background:#f97316;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:bold">Reset password</a>
        </p>
        <p style="color:#64748b;font-size:12px">Or paste this link in your browser:<br/>${resetUrl}</p>
        <p style="color:#94a3b8;font-size:12px">If you did not request this, you can ignore this email.</p>
      </div>`,
  });
  return true;
}

function loadWelcomeGif(): Buffer | null {
  try {
    return readFileSync(join(process.cwd(), "public", "assets", "welcome-tutorial.gif"));
  } catch {
    return null;
  }
}

/** Welcome email to a brand-new restaurant: next steps + animated quick-start GIF. */
export async function sendWelcomeEmail(to: string, name: string) {
  if (!smtpConfigured()) return false;

  const support = supportEmail();
  const displayName = name?.trim() || to;
  const gif = loadWelcomeGif();

  const stepsHtml = `
    <ol style="padding-left:20px;color:#1e293b;line-height:1.7">
      <li><b>Insert your Activation Key</b> — you'll find it on your dashboard.<br/>
        <span style="color:#64748b;font-size:13px">Don't have a key? Email us at
        <a href="mailto:${support}" style="color:#f97316;font-weight:bold">${support}</a></span></li>
      <li><b>Add your menu items</b> — Menu page → "Add item" (try a dummy dish first!).</li>
      <li><b>Open Point of Sale</b> — tap dishes to add them to the order.</li>
      <li><b>Take cash & place the order</b> — 🎉 that's your first sale!</li>
    </ol>`;

  await createTransporter().sendMail({
    from: fromAddress(),
    to,
    subject: "🎉 Welcome to Kitchen POS — your account has been created!",
    text: `Congratulations${displayName ? `, ${displayName}` : ""}! Your Kitchen POS account has been created.\n\nNext steps:\n1) Insert your Activation Key on your dashboard (no key? email ${support})\n2) Add your menu items\n3) Open Point of Sale\n4) Place your first order!\n\nA quick-start animated guide is attached to this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:linear-gradient(90deg,#f97316,#f43f5e);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
          <div style="font-size:34px">🎉</div>
          <h1 style="color:#ffffff;margin:8px 0 0;font-size:24px">Congratulations!</h1>
          <p style="color:#ffedd5;margin:6px 0 0;font-size:14px">Your Kitchen POS account has been created</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:24px">
          <p style="color:#1e293b;font-size:15px">Hi ${displayName}, here's how to get started in under a minute:</p>
          ${stepsHtml}
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px 16px;margin:16px 0">
            <span style="color:#9a3412;font-size:14px">Need help or an activation key? Email us any time:
              <b>${support}</b></span>
          </div>
          ${
            gif
              ? `<p style="color:#1e293b;font-size:15px;margin-bottom:8px"><b>Watch the 60-second quick-start:</b></p>
                 <img src="cid:welcomegif" width="480" alt="Kitchen POS quick start tutorial" style="width:100%;max-width:480px;border-radius:12px;border:1px solid #e2e8f0"/>`
              : ""
          }
          <p style="color:#94a3b8;font-size:12px;margin-top:22px">— The Kitchen POS team</p>
        </div>
      </div>`,
    attachments: gif
      ? [
          {
            filename: "kitchen-pos-quick-start.gif",
            content: gif,
            cid: "welcomegif",
          },
        ]
      : [],
  });
  return true;
}

export async function sendDailySummaryEmail(opts: {
  to: string;
  shopName: string;
  currency: string;
  revenue: number;
  orderCount: number;
  expenseTotal: number;
  pendingOrders: number;
}) {
  const { to, shopName, currency, revenue, orderCount, expenseTotal, pendingOrders } = opts;
  const profit = revenue - expenseTotal;
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const transport = createTransporter();
  if (!transport) return false;

  const row = (label: string, value: string, color: string) => `
    <tr>
      <td style="padding:14px 20px;font-size:14px;color:#64748b;font-weight:600">${label}</td>
      <td align="right" style="padding:14px 20px;font-size:18px;font-weight:800;color:${color};font-variant-numeric:tabular-nums">${value}</td>
    </tr>`;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:24px;padding:28px 24px;text-align:center">
      <div style="font-size:36px">📊</div>
      <h1 style="margin:12px 0 0;color:#fff;font-size:22px;font-weight:800">Daily Summary — ${shopName}</h1>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:13px">${dateStr}</p>
    </div>
    <div style="background:#fff;border-radius:24px;margin-top:16px;overflow:hidden;border:1px solid #e2e8f0">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        ${row("Revenue today", `${currency} ${revenue.toLocaleString()}`, "#0f172a")}
        ${row("Orders today", String(orderCount), "#0f172a")}
        ${row("Expenses today", `− ${currency} ${expenseTotal.toLocaleString()}`, "#dc2626")}
        ${row("Net (revenue − expenses)", `${currency} ${profit.toLocaleString()}`, profit >= 0 ? "#059669" : "#dc2626")}
        ${row("Open orders right now", String(pendingOrders), "#d97706")}
      </table>
    </div>
    <div style="margin-top:16px;background:linear-gradient(135deg,#f97316,#f43f5e);border-radius:24px;padding:22px;text-align:center">
      <p style="margin:0;color:#fff;font-size:14px;font-weight:700">Open your dashboard for the full picture</p>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px">© 2026 Developed By Shayan Ali · Kitchen POS</p>
  </div></body></html>`;

  try {
    await transport.sendMail({
      from: fromAddress(),
      to,
      subject: `📊 ${shopName} — daily summary (${dateStr})`,
      html,
      text: `${shopName} daily summary ${dateStr}\nRevenue: ${currency} ${revenue}\nOrders: ${orderCount}\nExpenses: ${currency} ${expenseTotal}\nNet: ${currency} ${profit}\nOpen orders: ${pendingOrders}`,
    });
    return true;
  } catch (err) {
    console.error("daily-summary mail failed", err);
    return false;
  }
}
