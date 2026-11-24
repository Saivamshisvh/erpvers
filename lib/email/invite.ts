import { WHATSAPP_HREF } from "@/lib/whatsapp";

type Input = {
  /** "freelancer" logs hours on tasks; "client" sees a company dashboard. */
  role: "freelancer" | "client";
  email: string;
  /** Person's name, when we know it (freelancers). */
  name?: string;
  /** Company name, for client invites. */
  clientName?: string;
  /** True when the person already has a portal account, so they only need to sign in. */
  alreadyRegistered: boolean;
  /** Base portal URL, for example https://www.erpvers.com/portal */
  portalUrl: string;
  supportEmail: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Builds the email someone gets when ERP VERS gives them access to the client portal. */
export function buildInviteEmail(input: Input) {
  const { role, email, name, clientName, alreadyRegistered, portalUrl, supportEmail } = input;
  const base = portalUrl.replace(/\/$/, "");
  const actionUrl = alreadyRegistered ? `${base}/login` : `${base}/register?email=${encodeURIComponent(email)}`;
  const buttonLabel = alreadyRegistered ? "Sign in to the portal" : "Create your account";

  const subject =
    role === "freelancer"
      ? "You're invited to the ERP VERS work portal"
      : `You now have access to ${clientName ?? "your company"}'s ERP VERS client portal`;

  const greeting = name ? `Hi ${name},` : "Hello,";
  const what =
    role === "freelancer"
      ? "ERP VERS has invited you to its work portal, where you can see the tasks assigned to you and log your hours."
      : `ERP VERS has given you access to the client portal for ${clientName ?? "your company"}, where you can see your prepaid hours, tasks and work log, and approve hours.`;

  const steps = alreadyRegistered
    ? ["Sign in with your existing portal account. Your access is already active."]
    : [
        `Create your account using this exact email address: ${email}`,
        "Open the confirmation email we send you and click the button in it.",
        role === "freelancer" ? "Sign in and you'll see the tasks assigned to you." : "Sign in and you'll see your company's dashboard.",
      ];

  const stepsHtml = steps
    .map(
      (s, i) => `<tr>
  <td style="padding:0 12px 10px 0;vertical-align:top;width:24px;"><div style="width:22px;height:22px;line-height:22px;border-radius:11px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700;text-align:center;">${i + 1}</div></td>
  <td style="padding:2px 0 10px;vertical-align:top;font-size:14px;line-height:1.5;color:#334155;">${esc(s)}</td>
</tr>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;">${esc(what)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 32px 0;">
          <div style="font-size:18px;font-weight:800;letter-spacing:.06em;color:#1d4ed8;">ERP VERS</div>
          <h1 style="margin:20px 0 8px;font-size:22px;line-height:1.3;color:#0f172a;">${role === "freelancer" ? "Welcome to the ERP VERS work portal" : "Your client portal access"}</h1>
          <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#475569;">${esc(greeting)}</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">${esc(what)}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${stepsHtml}
          </table>
        </td></tr>
        <tr><td style="padding:12px 32px 0;">
          <a href="${esc(actionUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:10px;">${buttonLabel}</a>
        </td></tr>
        <tr><td style="padding:24px 32px 28px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
            Questions? Reply to this email, write to
            <a href="mailto:${esc(supportEmail)}" style="color:#2563eb;">${esc(supportEmail)}</a>, or
            <a href="${esc(WHATSAPP_HREF)}" style="color:#2563eb;">message us on WhatsApp</a>.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">You're receiving this because ERP VERS added ${esc(email)} to its portal. If you weren't expecting it, you can ignore this email.</p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    "",
    what,
    "",
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    `${buttonLabel}: ${actionUrl}`,
    "",
    `Questions? Reply to this email or write to ${supportEmail}.`,
  ].join("\n");

  return { subject, html, text };
}
