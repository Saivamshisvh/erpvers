import { formatHours } from "@/lib/portal/format";
import { WHATSAPP_HREF } from "@/lib/whatsapp";

export type ChangeEmailItem = { task_title: string; title: string; description: string | null; hours: number };

type Input = {
  /** "change": extra hours on a task. "estimate": a new task's hour budget. */
  kind?: "change" | "estimate";
  clientName: string;
  items: ChangeEmailItem[];
  portalUrl: string;
  supportEmail: string;
  isReminder: boolean;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Builds the email clients get when an estimate, or extra hours on a task, need their approval. */
export function buildChangeRequestEmail({ kind = "change", clientName, items, portalUrl, supportEmail, isReminder }: Input) {
  const total = items.reduce((s, i) => s + i.hours, 0);
  const n = items.length;
  const estimate = kind === "estimate";
  const noun = estimate ? (n === 1 ? "estimate" : "estimates") : n === 1 ? "change request" : "change requests";
  const subject = isReminder
    ? `Reminder: ${n === 1 ? `an ${estimate ? "estimate" : "change request"} is` : `${n} ${noun} are`} waiting for your approval`
    : estimate
      ? `Estimate for ${clientName}: ${formatHours(total)} hours to approve`
      : `Change request for ${clientName}: ${formatHours(total)} extra hours to approve`;
  const intro = estimate
    ? `Here is our hour estimate for the work for ${clientName}. Please review the ${noun} below. We'll start the work once you approve.`
    : `Some of the work for ${clientName} needs more time than first estimated. Please review the ${noun} below. We'll start the extra work once you approve.`;
  const heading = `${noun.charAt(0).toUpperCase()}${noun.slice(1)} to approve`;
  const sign = estimate ? "" : "+";

  const rows = items
    .map(
      (i) => `<tr>
  <td style="padding:12px 12px 12px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:14px;color:#0f172a;">
    <strong>${esc(i.title)}</strong>
    ${i.description ? `<div style="margin-top:4px;color:#475569;">${esc(i.description)}</div>` : ""}
    ${estimate ? "" : `<div style="margin-top:4px;font-size:12px;color:#64748b;">Task: ${esc(i.task_title)}</div>`}
  </td>
  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;text-align:right;white-space:nowrap;font-weight:700;font-size:14px;color:#0f172a;">${sign}${esc(formatHours(i.hours))} h</td>
</tr>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;">${esc(intro)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 32px 0;">
          <div style="font-size:18px;font-weight:800;letter-spacing:.06em;color:#1d4ed8;">ERP VERS</div>
          <h1 style="margin:20px 0 8px;font-size:22px;line-height:1.3;color:#0f172a;">${esc(heading)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">${esc(intro)}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <th align="left" style="padding:0 12px 8px 0;border-bottom:1px solid #cbd5e1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">${estimate ? "Work" : "Change"}</th>
              <th align="right" style="padding:0 0 8px;border-bottom:1px solid #cbd5e1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">${estimate ? "Hours" : "Extra hours"}</th>
            </tr>
            ${rows}
            <tr>
              <td style="padding:12px 12px 0 0;font-size:14px;font-weight:700;color:#0f172a;">Total</td>
              <td style="padding:12px 0 0;text-align:right;font-size:14px;font-weight:800;color:#0f172a;">${sign}${esc(formatHours(total))} h</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 32px 0;">
          <a href="${esc(portalUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:10px;">Review and approve</a>
        </td></tr>
        <tr><td style="padding:24px 32px 28px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
            Not sure about ${estimate ? "an estimate" : "a change"}? Please don't approve it. Reply to this email, write to
            <a href="mailto:${esc(supportEmail)}" style="color:#2563eb;">${esc(supportEmail)}</a>, or
            <a href="${esc(WHATSAPP_HREF)}" style="color:#2563eb;">message us on WhatsApp</a>, and we'll talk it through.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">You're receiving this because you have access to ${esc(clientName)}'s ERP VERS client portal.</p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    heading,
    "",
    intro,
    "",
    ...items.map((i) => `- ${i.title}${estimate ? "" : ` (task: ${i.task_title})`}: ${sign}${formatHours(i.hours)} h${i.description ? `\n  ${i.description}` : ""}`),
    "",
    `Total: ${sign}${formatHours(total)} h`,
    "",
    `Review and approve: ${portalUrl}`,
    "",
    `Not sure about ${estimate ? "an estimate" : "a change"}? Please don't approve it. Reply to this email or write to ${supportEmail}.`,
  ].join("\n");

  return { subject, html, text };
}
