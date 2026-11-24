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
  /**
   * "bcc" (default): addressed to the support mailbox, recipients in BCC, so a group
   * of people each see only their own address.
   * "direct": addressed straight to the recipients, with a copy BCC'd to the support
   * mailbox for the record. Use for one-person emails such as invites.
   */
  mode?: "bcc" | "direct";
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
  const addressing =
    email.mode === "direct"
      ? // The recipient sees their own address; support keeps a copy (unless the email is to support).
        { to: email.to, bcc: email.to.some((t) => from.toLowerCase().includes(t.toLowerCase())) ? undefined : from }
      : { to: from, bcc: email.to }; // Each recipient sees only their own address.
  await transport.sendMail({
    from,
    replyTo: process.env.MAIL_REPLY_TO ?? from,
    ...addressing,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
