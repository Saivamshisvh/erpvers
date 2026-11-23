import "server-only";
import nodemailer from "nodemailer";

/**
 * Sends email from the ERP VERS support mailbox over SMTP. Works with any
 * provider that offers SMTP (Google Workspace, Zoho Mail, Microsoft 365, Resend).
 *
 * Environment variables:
 *   SMTP_HOST, SMTP_PORT (465 or 587), SMTP_USER, SMTP_PASS
 *   MAIL_FROM   e.g. "ERP VERS <support@erpvers.com>" (defaults to SMTP_USER)
 */
export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export type OutgoingEmail = {
  to: string[];
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(email: OutgoingEmail) {
  if (!isEmailConfigured()) throw new Error("Email is not set up yet (SMTP settings are missing).");
  if (email.to.length === 0) throw new Error("Nobody at this client has access yet, so there's nobody to email.");

  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const from = process.env.MAIL_FROM ?? `ERP VERS <${process.env.SMTP_USER}>`;
  await transport.sendMail({
    from,
    replyTo: process.env.MAIL_REPLY_TO ?? from,
    // Each recipient sees only their own address.
    to: from,
    bcc: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
