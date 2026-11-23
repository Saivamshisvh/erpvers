import { formatDate, formatHours } from "@/lib/portal/format";
import { WHATSAPP_HREF } from "@/lib/whatsapp";

export type ApprovalEmailEntry = {
  work_date: string;
  consultant: string;
  description: string;
  hours: number;
  task_title: string | null;
  change_request_title: string | null;
};

type Input = {
  clientName: string;
  entries: ApprovalEmailEntry[];
  /** All hours still waiting for this client's approval, including these. */
  totalAwaitingHours: number;
  remainingHours: number;
  portalUrl: string;
  supportEmail: string;
  isReminder: boolean;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Builds the email clients get when hours are ready for them to approve. */
export function buildHoursApprovalEmail(input: Input) {
  const { clientName, entries, totalAwaitingHours, remainingHours, portalUrl, supportEmail, isReminder } = input;
  const newHours = entries.reduce((s, e) => s + e.hours, 0);
  const subject = isReminder
    ? `Reminder: ${formatHours(totalAwaitingHours)} hours waiting for your approval`
    : `${formatHours(newHours)} hours logged for ${clientName}: please review and approve`;
  const intro = isReminder
    ? `This is a reminder that ${formatHours(totalAwaitingHours)} hours of work for ${clientName} are waiting for your approval.`
    : `We've logged ${formatHours(newHours)} hours of work for ${clientName}. Please review the entries below and approve them in your client portal.`;

  const rows = entries
    .map((e) => {
      const task = [e.task_title, e.change_request_title ? `Change: ${e.change_request_title}` : null].filter(Boolean).join(" · ");
      return `<tr>
  <td style="padding:12px 12px 12px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;white-space:nowrap;color:#475569;font-size:14px;">${esc(formatDate(e.work_date))}</td>
  <td style="padding:12px 12px 12px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:14px;color:#0f172a;">
    ${esc(e.description)}
    <div style="margin-top:4px;font-size:12px;color:#64748b;">${esc(e.consultant)}${task ? ` · ${esc(task)}` : ""}</div>
  </td>
  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;text-align:right;white-space:nowrap;font-weight:700;font-size:14px;color:#0f172a;">${esc(formatHours(e.hours))} h</td>
</tr>`;
    })
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
          <h1 style="margin:20px 0 8px;font-size:22px;line-height:1.3;color:#0f172a;">${isReminder ? "Hours waiting for your approval" : "New hours to approve"}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">${esc(intro)}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <th align="left" style="padding:0 12px 8px 0;border-bottom:1px solid #cbd5e1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Date</th>
              <th align="left" style="padding:0 12px 8px 0;border-bottom:1px solid #cbd5e1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Work done</th>
              <th align="right" style="padding:0 0 8px;border-bottom:1px solid #cbd5e1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Hours</th>
            </tr>
            ${rows}
            <tr>
              <td colspan="2" style="padding:12px 12px 0 0;font-size:14px;font-weight:700;color:#0f172a;">${isReminder ? "Total waiting" : "Total in this email"}</td>
              <td style="padding:12px 0 0;text-align:right;font-size:14px;font-weight:800;color:#0f172a;">${esc(formatHours(isReminder ? totalAwaitingHours : newHours))} h</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:12px;">
            <tr><td style="padding:14px 16px;font-size:14px;color:#475569;">
              Prepaid hours remaining: <strong style="color:#0f172a;">${esc(formatHours(remainingHours))} h</strong>
              ${!isReminder && totalAwaitingHours > newHours ? `<br>Waiting for approval in total: <strong style="color:#0f172a;">${esc(formatHours(totalAwaitingHours))} h</strong>` : ""}
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 32px 0;">
          <a href="${esc(portalUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:10px;">Review and approve</a>
        </td></tr>
        <tr><td style="padding:24px 32px 28px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
            Something doesn't look right? Please don't approve it. Reply to this email, write to
            <a href="mailto:${esc(supportEmail)}" style="color:#2563eb;">${esc(supportEmail)}</a>, or
            <a href="${esc(WHATSAPP_HREF)}" style="color:#2563eb;">message us on WhatsApp</a>, and we'll sort it out with you.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">You're receiving this because you have access to ${esc(clientName)}'s ERP VERS client portal.</p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    isReminder ? "Hours waiting for your approval" : "New hours to approve",
    "",
    intro,
    "",
    ...entries.map((e) => {
      const task = [e.task_title, e.change_request_title ? `Change: ${e.change_request_title}` : null].filter(Boolean).join(" / ");
      return `- ${formatDate(e.work_date)}  ${formatHours(e.hours)} h  ${e.description} (${e.consultant}${task ? `, ${task}` : ""})`;
    }),
    "",
    `${isReminder ? "Total waiting" : "Total in this email"}: ${formatHours(isReminder ? totalAwaitingHours : newHours)} h`,
    `Prepaid hours remaining: ${formatHours(remainingHours)} h`,
    "",
    `Review and approve: ${portalUrl}`,
    "",
    `Something doesn't look right? Please don't approve it. Reply to this email or write to ${supportEmail} and we'll sort it out with you.`,
  ].join("\n");

  return { subject, html, text };
}
