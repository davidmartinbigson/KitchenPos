import nodemailer from "nodemailer";

/**
 * Optional SMTP mailer. Configure these env vars to email password reset links:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * If SMTP is not configured the API falls back to showing the reset link
 * directly on screen, so the feature always works.
 */
export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!smtpConfigured()) return false;

  const port = Number(process.env.SMTP_PORT ?? 587) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@kitchen-pos.app";

  await transporter.sendMail({
    from,
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
