import "server-only";
import { headers } from "next/headers";
import { buildHoursApprovalEmail, type ApprovalEmailEntry } from "@/lib/email/hoursApproval";
import { buildInviteEmail } from "@/lib/email/invite";
import { buildChangeRequestEmail, type ChangeEmailItem } from "@/lib/email/changeRequest";
import { isEmailConfigured, sendEmail } from "@/lib/email/mailer";
import { createClient } from "@/lib/supabase/server";

export type NotifyResult =
  | { sent: true; count: number; recipients: number }
  | { sent: false; reason: "nothing" | "not_configured" | "no_recipients" | "failed"; error?: string };

export async function portalUrl() {
  if (process.env.SITE_URL) return `${process.env.SITE_URL.replace(/\/$/, "")}/portal`;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}/portal`;
}

/**
 * Emails a client's people about hours waiting for their approval.
 * Normal mode sends only entries not emailed before, then marks them as sent.
 * Reminder mode re-sends everything still waiting.
 * Must be called by an admin (row level security enforces it).
 */
export async function notifyClient(clientId: string, { reminder = false } = {}): Promise<NotifyResult> {
  const supabase = await createClient();

  const [clientRes, membersRes, awaitingRes, purchasesRes, usedRes] = await Promise.all([
    supabase.from("clients").select("name").eq("id", clientId).single(),
    supabase.from("client_members").select("email").eq("client_id", clientId),
    supabase
      .from("time_entries")
      .select("id, work_date, consultant, description, hours, client_notified_at, task:tasks(title), change_request:change_requests(title)")
      .eq("client_id", clientId)
      .eq("status", "awaiting_client")
      .order("work_date")
      .order("created_at"),
    supabase.from("hour_purchases").select("hours").eq("client_id", clientId),
    supabase.from("time_entries").select("hours").eq("client_id", clientId).in("status", ["awaiting_client", "approved"]),
  ]);
  for (const r of [clientRes, membersRes, awaitingRes, purchasesRes, usedRes]) {
    if (r.error) return { sent: false, reason: "failed", error: r.error.message };
  }

  type Row = {
    id: string; work_date: string; consultant: string; description: string; hours: number; client_notified_at: string | null;
    task: { title: string } | null; change_request: { title: string } | null;
  };
  const awaiting = (awaitingRes.data ?? []) as unknown as Row[];
  const toSend = reminder ? awaiting : awaiting.filter((e) => !e.client_notified_at);
  if (toSend.length === 0) return { sent: false, reason: "nothing" };
  if (!isEmailConfigured()) return { sent: false, reason: "not_configured" };

  const recipients = [...new Set((membersRes.data ?? []).map((m) => m.email.toLowerCase()))];
  if (recipients.length === 0) return { sent: false, reason: "no_recipients" };

  const round = (n: number) => Math.round(n * 100) / 100;
  const purchased = (purchasesRes.data ?? []).reduce((s, p) => s + Number(p.hours), 0);
  const used = (usedRes.data ?? []).reduce((s, e) => s + Number(e.hours), 0);
  const entries: ApprovalEmailEntry[] = toSend.map((e) => ({
    work_date: e.work_date,
    consultant: e.consultant,
    description: e.description,
    hours: Number(e.hours),
    task_title: e.task?.title ?? null,
    change_request_title: e.change_request?.title ?? null,
  }));

  const email = buildHoursApprovalEmail({
    clientName: clientRes.data!.name,
    entries,
    totalAwaitingHours: round(awaiting.reduce((s, e) => s + Number(e.hours), 0)),
    remainingHours: round(purchased - used),
    portalUrl: await portalUrl(),
    supportEmail: process.env.MAIL_REPLY_TO ?? process.env.SMTP_USER ?? "support@erpvers.com",
    isReminder: reminder,
  });

  try {
    await sendEmail({ to: recipients, ...email });
  } catch (error) {
    return { sent: false, reason: "failed", error: error instanceof Error ? error.message : String(error) };
  }

  const ids = toSend.filter((e) => !e.client_notified_at).map((e) => e.id);
  if (ids.length) {
    await supabase.from("time_entries").update({ client_notified_at: new Date().toISOString() }).in("id", ids);
  }
  return { sent: true, count: toSend.length, recipients: recipients.length };
}

/** One sentence for the admin about what happened with the email. */
export function describeNotify(result: NotifyResult) {
  if (result.sent) return `Emailed ${result.recipients} ${result.recipients === 1 ? "person" : "people"} at the client to approve.`;
  switch (result.reason) {
    case "nothing":
      return "";
    case "not_configured":
      return "Email isn't set up yet, so no email went out. The client will see the hours when they sign in.";
    case "no_recipients":
      return "Nobody at this client has portal access yet, so no email went out.";
    case "failed":
      return `The email couldn't be sent (${result.error}). Use "Email client" on the client page to try again.`;
  }
}

/**
 * Emails someone that they've been given portal access, with a link to register
 * (or sign in, when they already have an account). Returns one sentence for the admin.
 */
export async function sendInviteEmail(input: {
  role: "freelancer" | "client";
  email: string;
  name?: string;
  clientName?: string;
  alreadyRegistered: boolean;
}): Promise<string> {
  if (!isEmailConfigured()) return "Email isn't set up yet, so no email went out. Send them the link yourself.";
  const email = buildInviteEmail({
    ...input,
    portalUrl: await portalUrl(),
    supportEmail: process.env.MAIL_REPLY_TO ?? process.env.SMTP_USER ?? "support@erpvers.com",
  });
  try {
    await sendEmail({ to: [input.email], ...email, mode: "direct" });
    return `We emailed ${input.email} with the link.`;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return `The email to ${input.email} couldn't be sent (${reason}). Use "Resend email" or send them the link yourself.`;
  }
}

const supportAddress = () => process.env.MAIL_REPLY_TO ?? process.env.SMTP_USER ?? "support@erpvers.com";

/**
 * Emails a client's people about change requests waiting for their approval.
 * Normal mode sends only ones not emailed before; reminder mode re-sends all that are waiting.
 * Must be called by an admin (row level security enforces it). Returns one sentence for the admin.
 */
export async function notifyClientChangeRequests(clientId: string, { reminder = false } = {}): Promise<string> {
  const supabase = await createClient();
  const [clientRes, membersRes, crRes] = await Promise.all([
    supabase.from("clients").select("name").eq("id", clientId).single(),
    supabase.from("client_members").select("email").eq("client_id", clientId),
    supabase
      .from("change_requests")
      .select("id, title, description, hours, client_notified_at, task:tasks!inner(title, client_id)")
      .eq("status", "pending_client")
      .eq("task.client_id", clientId)
      .order("created_at"),
  ]);
  for (const r of [clientRes, membersRes, crRes]) if (r.error) return `The client email couldn't be prepared (${r.error.message}).`;

  type Row = { id: string; title: string; description: string | null; hours: number; client_notified_at: string | null; task: { title: string } | null };
  const waiting = (crRes.data ?? []) as unknown as Row[];
  const toSend = reminder ? waiting : waiting.filter((c) => !c.client_notified_at);
  if (toSend.length === 0) return reminder ? "Nothing is waiting for the client's approval." : "";
  if (!isEmailConfigured()) return "Email isn't set up yet, so the client wasn't emailed. They'll see it when they sign in.";
  const recipients = [...new Set((membersRes.data ?? []).map((m) => m.email.toLowerCase()))];
  if (recipients.length === 0) return "Nobody at this client has portal access yet, so no email went out.";

  const items: ChangeEmailItem[] = toSend.map((c) => ({ task_title: c.task?.title ?? "Task", title: c.title, description: c.description, hours: Number(c.hours) }));
  const email = buildChangeRequestEmail({
    clientName: clientRes.data!.name,
    items,
    portalUrl: await portalUrl(),
    supportEmail: supportAddress(),
    isReminder: reminder,
  });
  try {
    await sendEmail({ to: recipients, ...email });
  } catch (error) {
    return `The client email couldn't be sent (${error instanceof Error ? error.message : String(error)}). Use "Email client" to try again.`;
  }
  const ids = toSend.filter((c) => !c.client_notified_at).map((c) => c.id);
  if (ids.length) await supabase.from("change_requests").update({ client_notified_at: new Date().toISOString() }).in("id", ids);
  return `Emailed ${recipients.length} ${recipients.length === 1 ? "person" : "people"} at the client to approve.`;
}

/** Tells ERP VERS (the support mailbox) that a freelancer asked for extra hours. Best effort. */
export async function notifyAdminOfChangeRequest(input: { freelancer: string; taskTitle: string; clientName: string; title: string; hours: number; reason: string }) {
  if (!isEmailConfigured()) return;
  const base = (await portalUrl()).replace(/\/$/, "");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const subject = `${input.freelancer} asked for ${input.hours} extra hours on ${input.taskTitle}`;
  const lines = [
    `${input.freelancer} asked for ${input.hours} extra hours.`,
    `Client: ${input.clientName}`,
    `Task: ${input.taskTitle}`,
    `Change: ${input.title}`,
    input.reason ? `Reason: ${input.reason}` : "",
    "",
    `Review it: ${base}/admin/review`,
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  try {
    await sendEmail({
      to: [supportAddress()],
      subject,
      text: lines.join("\n"),
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;line-height:1.6;color:#0f172a;">${lines
        .map((l) => (l.startsWith("Review it: ") ? `<p><a href="${esc(l.slice(11))}" style="color:#2563eb;font-weight:700;">Review it in the portal</a></p>` : `<div>${esc(l) || "&nbsp;"}</div>`))
        .join("")}</div>`,
      mode: "direct",
    });
  } catch {
    // The request is saved and shows in Admin -> To review either way.
  }
}
