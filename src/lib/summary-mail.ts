import { createTransporter, fromAddress, smtpConfigured } from "./mail";

export type DaySummary = {
  dateLabel: string;
  sale: number;
  ordersCount: number;
  expensesTotal: number;
  bachat: number;
  topItem: { name: string; qty: number } | null;
  currency: string;
};

/** Sends the automatic end-of-day summary to a restaurant owner. Free — uses the app's Gmail SMTP. */
export async function sendDailySummaryEmail(to: string, shopName: string, s: DaySummary): Promise<boolean> {
  if (!smtpConfigured()) return false;
  const money = (n: number) => `${s.currency} ${n.toLocaleString("en-US")}`;
  const topRow = s.topItem
    ? `<tr><td style="padding:8px 12px;color:#64748b;">Top item</td><td style="padding:8px 12px;font-weight:700;color:#0f172a;text-align:right;">${s.topItem.qty}× ${s.topItem.name}</td></tr>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:24px;">
  <div style="background:linear-gradient(135deg,#f97316,#ef4444);border-radius:20px 20px 0 0;padding:24px 28px;">
    <p style="margin:0;color:#fff;font-size:13px;opacity:.9;">Daily summary — ${s.dateLabel}</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:22px;">${shopName}</h1>
  </div>
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;padding:24px 28px;">
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr><td style="padding:8px 12px;color:#64748b;">Today's sale</td><td style="padding:8px 12px;font-weight:700;color:#0f172a;text-align:right;">${money(s.sale)}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#64748b;">Orders</td><td style="padding:8px 12px;font-weight:700;color:#0f172a;text-align:right;">${s.ordersCount}</td></tr>
      <tr><td style="padding:8px 12px;color:#64748b;">Expenses</td><td style="padding:8px 12px;font-weight:700;color:#b91c1c;text-align:right;">− ${money(s.expensesTotal)}</td></tr>
      ${topRow}
      <tr style="border-top:2px solid #e2e8f0;"><td style="padding:12px;font-weight:700;color:#0f172a;">Bachat (sale − expenses)</td><td style="padding:12px;font-weight:800;font-size:18px;color:${s.bachat >= 0 ? "#059669" : "#dc2626"};text-align:right;">${money(s.bachat)}</td></tr>
    </table>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;">You're receiving this because you have an active Kitchen POS account. Sent automatically at midnight (PKT).</p>
  </div>
</div></body></html>`;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject: `📊 ${shopName} — ${s.dateLabel}: Sale ${money(s.sale)}, Bachat ${money(s.bachat)}`,
    html,
  });
  return true;
}
