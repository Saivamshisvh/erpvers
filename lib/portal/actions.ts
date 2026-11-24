"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { discountForHours } from "@/lib/prepaid";
import { getPendingRegistrations, requireAdmin, requireFreelancer, requireUser } from "@/lib/portal/data";
import { describeNotify, notifyAdminOfChangeRequest, notifyClient, notifyClientChangeRequests, sendInviteEmail } from "@/lib/portal/notify";
import { CURRENCIES } from "@/lib/portal/format";
import { isPortalConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** `email` is set when the person needs to confirm their address before signing in. */
export type ActionState = { ok: boolean; message: string; email?: string } | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_PASSWORD = 8;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const num = (form: FormData, key: string) => {
  const raw = text(form, key);
  return raw === "" ? NaN : Number(raw);
};
const fail = (message: string, extra: Partial<NonNullable<ActionState>> = {}): ActionState => ({ ok: false, message, ...extra });
const NOT_CONFIGURED = "The client portal is not switched on yet.";
const SERVICE_DOWN = "We couldn't reach the sign-in service. Please try again in a few minutes.";

function clientIdFrom(form: FormData) {
  const id = text(form, "clientId");
  if (!UUID.test(id)) throw new Error("Invalid client id");
  return id;
}

function refresh(clientId?: string) {
  revalidatePath("/portal", "layout");
  if (clientId) revalidatePath(`/portal/admin/clients/${clientId}`);
}

async function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

function checkPassword(password: string, confirm?: string) {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
  if (password.length > 72) return "Use 72 characters or fewer for your password.";
  if (confirm !== undefined && password !== confirm) return "The two passwords don't match.";
  return null;
}

const isServiceError = (error: { status?: number } | null) => Boolean(error && (!error.status || error.status >= 500));

// ---------------------------------------------------------------------------
// Account: register, sign in, passwords
// ---------------------------------------------------------------------------

export async function register(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!isPortalConfigured()) return fail(NOT_CONFIGURED);

  const fullName = text(form, "fullName");
  const company = text(form, "company");
  const email = text(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");

  if (fullName.length < 1 || fullName.length > 120) return fail("Enter your full name.");
  if (company.length > 120) return fail("Company name is too long (120 characters max).");
  if (!EMAIL.test(email) || email.length > 254) return fail("Enter a valid email address.");
  const passwordProblem = checkPassword(password, confirm);
  if (passwordProblem) return fail(passwordProblem);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/portal`,
      data: { full_name: fullName, company },
    },
  });

  if (error?.status === 429) return fail("Too many attempts. Please wait a few minutes and try again.");
  if (error?.code === "weak_password") return fail(error.message);
  if (isServiceError(error)) return fail(SERVICE_DOWN);

  // Email confirmation switched off in Supabase: the person is signed in already.
  if (data.session) redirect("/portal");

  // Same reply whether or not the email was already registered, so this form
  // can't be used to find out who has an account.
  return {
    ok: true,
    message: `We've sent a confirmation link to ${email}. Click it, then sign in. If your company or ERP VERS has already given your email access, your dashboard is ready straight away.`,
  };
}

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!isPortalConfigured()) return fail(NOT_CONFIGURED);

  const email = text(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!EMAIL.test(email) || !password) return fail("Enter your email and password.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error?.code === "email_not_confirmed") {
    return fail("Please confirm your email address first. Check your inbox for the confirmation link.", { email });
  }
  if (error?.status === 429) return fail("Too many sign-in attempts. Please wait a few minutes and try again.");
  if (isServiceError(error)) return fail(SERVICE_DOWN);
  if (error) return fail("Email or password is incorrect.");

  redirect("/portal");
}

export async function resendConfirmation(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!isPortalConfigured()) return fail(NOT_CONFIGURED);
  const email = text(form, "email").toLowerCase();
  if (!EMAIL.test(email)) return fail("Enter a valid email address.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/portal` },
  });
  if (error?.status === 429) return fail("Please wait a minute before asking for another email.");
  if (isServiceError(error)) return fail(SERVICE_DOWN);
  return { ok: true, message: `If ${email} is waiting for confirmation, a new link is on its way.` };
}

export async function requestPasswordReset(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!isPortalConfigured()) return fail(NOT_CONFIGURED);
  const email = text(form, "email").toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return fail("Enter a valid email address.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/portal/reset-password`,
  });
  if (error?.status === 429) return fail("Too many requests. Please wait a few minutes and try again.");
  if (isServiceError(error)) return fail(SERVICE_DOWN);

  return { ok: true, message: `If ${email} has an account, we've sent a link to set a new password. It expires in one hour.` };
}

export async function updatePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");
  const problem = checkPassword(password, confirm);
  if (problem) return fail(problem);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error?.code === "same_password") return fail("Choose a password you haven't used here before.");
  if (error?.code === "weak_password") return fail(error.message);
  if (error) return fail(isServiceError(error) ? SERVICE_DOWN : error.message);

  redirect("/portal");
}

export async function signOut() {
  if (isPortalConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/portal/login");
}

// ---------------------------------------------------------------------------
// Admin: registrations
// ---------------------------------------------------------------------------

export async function approveRegistrationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = text(form, "userId");
  const target = text(form, "target");
  if (!UUID.test(userId)) return fail("Invalid registration.");

  // Re-read the registration from the database rather than trusting the form.
  const pending = (await getPendingRegistrations()).find((r) => r.user_id === userId);
  if (!pending) return fail("This registration was already handled. Refresh the page.");

  const supabase = await createClient();

  if (target === "freelancer") {
    const fullName = pending.full_name || pending.email.split("@")[0];
    const { error } = await supabase.from("freelancers").insert({ user_id: userId, email: pending.email, full_name: fullName.slice(0, 120) });
    if (error) return fail(`Could not approve: ${error.message}`);
    refresh();
    return { ok: true, message: `${pending.email} is now a freelancer. Assign them tasks from a client page.` };
  }

  let clientId = target;
  if (target === "new") {
    const name = text(form, "newClientName") || pending.company || pending.email.split("@")[1] || pending.email;
    if (name.length > 120) return fail("Company name is too long (120 characters max).");
    const created = await supabase.from("clients").insert({ name }).select("id").single();
    if (created.error) return fail(`Could not create the client: ${created.error.message}`);
    clientId = created.data.id;
  } else if (!UUID.test(target)) {
    return fail("Choose which client this person belongs to.");
  }

  const { error } = await supabase.from("client_members").insert({ client_id: clientId, user_id: userId, email: pending.email });
  if (error) return fail(`Could not approve: ${error.message}`);

  refresh(clientId);
  return { ok: true, message: `Approved. ${pending.email} will see their dashboard the next time they open the portal.` };
}

export async function declineRegistrationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = text(form, "userId");
  if (!UUID.test(userId)) return fail("Invalid registration.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decline_registration", { p_user_id: userId });
  if (error) return fail(`Could not decline: ${error.message}`);
  if (!data) return fail("This registration was already handled. Refresh the page.");

  refresh();
  return { ok: true, message: "Registration declined and the account removed." };
}

// ---------------------------------------------------------------------------
// Admin: clients
// ---------------------------------------------------------------------------

export async function createClientAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = text(form, "name");
  if (name.length < 1 || name.length > 120) return fail("Enter a company name (up to 120 characters).");

  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").insert({ name }).select("id").single();
  if (error) return fail(`Could not create the client: ${error.message}`);

  refresh();
  redirect(`/portal/admin/clients/${data.id}`);
}

export async function updateClientAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const name = text(form, "name");
  const threshold = num(form, "lowBalanceHours");
  if (name.length < 1 || name.length > 120) return fail("Enter a company name (up to 120 characters).");
  if (!Number.isFinite(threshold) || threshold < 0) return fail("Low-balance alert must be 0 hours or more.");

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ name, low_balance_hours: threshold }).eq("id", clientId);
  if (error) return fail(`Could not save: ${error.message}`);

  refresh(clientId);
  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Admin: who can see a client's dashboard
// ---------------------------------------------------------------------------

async function clientName(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("name").eq("id", clientId).maybeSingle();
  return data?.name as string | undefined;
}

export async function resendClientInviteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const email = text(form, "email").toLowerCase();
  if (!EMAIL.test(email)) return fail("Enter a valid email address.");
  const supabase = await createClient();
  const { data } = await supabase.from("client_invites").select("email").eq("client_id", clientId).eq("email", email).maybeSingle();
  if (!data) return fail("This invite no longer exists. Refresh the page.");
  return { ok: true, message: await sendInviteEmail({ role: "client", email, clientName: await clientName(clientId), alreadyRegistered: false }) };
}


export async function addMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const email = text(form, "email").toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return fail("Enter a valid email address.");

  const supabase = await createClient();
  const found = await supabase.rpc("find_registered_user", { p_email: email });
  if (found.error) return fail(`Could not add ${email}: ${found.error.message}`);
  const userId = found.data as string | null;
  if (!userId) {
    const { error } = await supabase.from("client_invites").insert({ client_id: clientId, email });
    if (error?.code === "23505") return fail(`${email} is already invited.`);
    if (error) return fail(`Could not invite ${email}: ${error.message}`);
    refresh(clientId);
    const sent = await sendInviteEmail({ role: "client", email, clientName: await clientName(clientId), alreadyRegistered: false });
    return { ok: true, message: `Invited. ${email} gets access as soon as they register and confirm their email. ${sent}` };
  }

  const { error } = await supabase.from("client_members").insert({ client_id: clientId, user_id: userId, email });
  if (error?.code === "23505") return fail(`${email} already has access.`);
  if (error) return fail(`Could not add ${email}: ${error.message}`);

  refresh(clientId);
  const sent = await sendInviteEmail({ role: "client", email, clientName: await clientName(clientId), alreadyRegistered: true });
  return { ok: true, message: `${email} can now see this dashboard. ${sent}` };
}

export async function removeMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const userId = text(form, "userId");
  if (!UUID.test(userId)) return fail("Invalid contact.");

  const supabase = await createClient();
  const { error } = await supabase.from("client_members").delete().eq("client_id", clientId).eq("user_id", userId);
  if (error) return fail(`Could not remove access: ${error.message}`);

  refresh(clientId);
  return { ok: true, message: "Access removed." };
}

// ---------------------------------------------------------------------------
// Admin: prepaid purchases
// ---------------------------------------------------------------------------

export async function addPurchaseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const hours = num(form, "hours");
  const discountRaw = text(form, "discountPct");
  const purchasedOn = text(form, "purchasedOn");
  const reference = text(form, "reference");

  if (!Number.isFinite(hours) || hours <= 0) return fail("Hours must be more than 0.");
  const discount = discountRaw === "" ? discountForHours(hours) : Number(discountRaw);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) return fail("Discount must be between 0 and 100.");
  if (!DATE.test(purchasedOn)) return fail("Pick the purchase date.");
  if (reference.length > 120) return fail("Reference is too long (120 characters max).");
  const rateRaw = text(form, "hourlyRate");
  const rateInput = rateRaw === "" ? null : Number(rateRaw);
  if (rateInput != null && (!Number.isFinite(rateInput) || rateInput < 0)) return fail("Rate must be 0 or more.");

  const supabase = await createClient();
  const rates = await supabase.from("client_rates").select("currency, hourly_rate").eq("client_id", clientId).maybeSingle();
  const hourlyRate = rateInput ?? (rates.data?.hourly_rate == null ? null : Number(rates.data.hourly_rate));
  const currency = rates.data?.currency ?? "USD";
  const { error } = await supabase.from("hour_purchases").insert({
    client_id: clientId,
    hours,
    discount_pct: discount,
    purchased_on: purchasedOn,
    reference: reference || null,
    hourly_rate: hourlyRate,
    currency: hourlyRate == null ? null : currency,
  });
  if (error) return fail(`Could not record the purchase: ${error.message}`);

  refresh(clientId);
  const amount = hourlyRate == null ? "" : ` (${currency} ${(Math.round(hours * hourlyRate * (1 - discount / 100) * 100) / 100).toLocaleString("en-US")})`;
  return {
    ok: true,
    message: `Recorded ${hours} hours at ${discount}% discount${amount}.${hourlyRate == null ? " Set the client's hourly rate to see amounts." : ""}`,
  };
}

export async function deletePurchaseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const id = text(form, "id");
  if (!UUID.test(id)) return fail("Invalid purchase.");

  const supabase = await createClient();
  const { error } = await supabase.from("hour_purchases").delete().eq("id", id).eq("client_id", clientId);
  if (error) return fail(`Could not delete: ${error.message}`);

  refresh(clientId);
  return { ok: true, message: "Purchase deleted." };
}

// ---------------------------------------------------------------------------
// Admin: hours worked
// ---------------------------------------------------------------------------

export async function addEntryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const workDate = text(form, "workDate");
  const consultant = text(form, "consultant");
  const description = text(form, "description");
  const hours = num(form, "hours");
  const taskId = text(form, "taskId") || null;
  if (taskId && !UUID.test(taskId)) return fail("Invalid task.");

  if (!DATE.test(workDate)) return fail("Pick the date the work was done.");
  if (consultant.length < 1 || consultant.length > 120) return fail("Enter the consultant's name.");
  if (description.length < 1 || description.length > 1000) return fail("Describe the work (up to 1,000 characters).");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return fail("Hours must be more than 0 and at most 24.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .insert({ client_id: clientId, task_id: taskId, work_date: workDate, consultant, description, hours, status: "awaiting_client" });
  if (error) return fail(`Could not log the hours: ${error.message}`);

  const email = describeNotify(await notifyClient(clientId));
  refresh(clientId);
  return { ok: true, message: `Logged ${hours} hours and sent them to the client to approve. ${email}`.trim() };
}

export async function deleteEntryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const id = text(form, "id");
  if (!UUID.test(id)) return fail("Invalid entry.");

  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").delete().eq("id", id).eq("client_id", clientId);
  if (error) return fail(`Could not delete: ${error.message}`);

  refresh(clientId);
  return { ok: true, message: "Entry deleted." };
}

// ---------------------------------------------------------------------------
// Admin: who can see a client's dashboard (domains and invites)
// ---------------------------------------------------------------------------

const DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export async function addDomainAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const domain = text(form, "domain").toLowerCase().replace(/^@/, "").replace(/^www\./, "");
  if (!DOMAIN.test(domain) || domain.length > 253) return fail("Enter a domain like acme-mfg.com (without the @).");

  const supabase = await createClient();
  const { error } = await supabase.from("client_domains").insert({ domain, client_id: clientId });
  if (error?.code === "23514") return fail(`${domain} is a personal email provider, so it can't be a company domain. Invite people by their exact email instead.`);
  if (error?.code === "23505") return fail(`${domain} is already linked to a client.`);
  if (error) return fail(`Could not add the domain: ${error.message}`);

  const linked = await supabase.rpc("link_existing_users");
  const n = Number(linked.data ?? 0);
  refresh(clientId);
  return {
    ok: true,
    message: `Anyone who confirms an @${domain} email now joins automatically.${n > 0 ? ` ${n} existing ${n === 1 ? "account was" : "accounts were"} linked.` : ""}`,
  };
}

export async function removeDomainAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const domain = text(form, "domain");
  const supabase = await createClient();
  const { error } = await supabase.from("client_domains").delete().eq("domain", domain).eq("client_id", clientId);
  if (error) return fail(`Could not remove: ${error.message}`);
  refresh(clientId);
  return { ok: true, message: "Domain removed. People already linked keep access until you remove them." };
}

export async function removeInviteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const email = text(form, "email");
  const supabase = await createClient();
  const { error } = await supabase.from("client_invites").delete().eq("client_id", clientId).eq("email", email);
  if (error) return fail(`Could not remove: ${error.message}`);
  refresh(clientId);
  return { ok: true, message: "Invite removed." };
}

// ---------------------------------------------------------------------------
// Admin: tasks and change requests
// ---------------------------------------------------------------------------

function taskIdFrom(form: FormData) {
  const id = text(form, "taskId");
  if (!UUID.test(id)) throw new Error("Invalid task id");
  return id;
}

/** Per-assignee rates from inputs named rate_<userId>. Empty means "no rate yet". */
function readAssigneeRates(form: FormData, userIds: string[]): Map<string, number | null> | { error: string } {
  const rates = new Map<string, number | null>();
  for (const id of userIds) {
    const raw = text(form, `rate_${id}`);
    if (raw === "") {
      rates.set(id, null);
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return { error: "Freelancer rates must be 0 or more (INR per hour)." };
    rates.set(id, n);
  }
  return rates;
}

function readTaskFields(form: FormData) {
  const title = text(form, "title");
  const description = text(form, "description");
  const estimate = num(form, "estimateHours");
  const assignees = form.getAll("assignees").map(String).filter((id) => UUID.test(id));
  if (title.length < 1 || title.length > 160) return { error: "Give the task a title (up to 160 characters)." };
  if (description.length > 2000) return { error: "Description is too long (2,000 characters max)." };
  if (!Number.isFinite(estimate) || estimate < 0) return { error: "Estimate must be 0 hours or more." };
  return { title, description: description || null, estimate, assignees };
}

export async function createTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const fields = readTaskFields(form);
  if ("error" in fields) return fail(fields.error!);
  const rates = readAssigneeRates(form, fields.assignees);
  if ("error" in rates) return fail(rates.error as string);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ client_id: clientId, title: fields.title, description: fields.description, estimate_hours: fields.estimate })
    .select("id")
    .single();
  if (error) return fail(`Could not create the task: ${error.message}`);

  if (fields.assignees.length > 0) {
    const assign = await supabase
      .from("task_assignments")
      .insert(fields.assignees.map((user_id) => ({ task_id: data.id, user_id, hourly_rate_inr: rates.get(user_id) ?? null })));
    if (assign.error) return fail(`Task created, but assigning failed: ${assign.error.message}`);
  }

  refresh(clientId);
  return { ok: true, message: `Task created with a ${fields.estimate}-hour estimate.` };
}

export async function updateTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const taskId = taskIdFrom(form);
  const fields = readTaskFields(form);
  if ("error" in fields) return fail(fields.error!);
  const status = text(form, "status") === "done" ? "done" : "open";
  const rates = readAssigneeRates(form, fields.assignees);
  if ("error" in rates) return fail(rates.error as string);

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ title: fields.title, description: fields.description, estimate_hours: fields.estimate, status })
    .eq("id", taskId)
    .eq("client_id", clientId);
  if (error) return fail(`Could not save the task: ${error.message}`);

  // Replace assignments with the boxes that are ticked.
  const current = await supabase.from("task_assignments").select("user_id, hourly_rate_inr").eq("task_id", taskId);
  if (current.error) return fail(current.error.message);
  const have = new Set((current.data ?? []).map((a) => a.user_id));
  const want = new Set(fields.assignees);
  const remove = [...have].filter((id) => !want.has(id));
  const add = [...want].filter((id) => !have.has(id));
  if (remove.length) {
    const r = await supabase.from("task_assignments").delete().eq("task_id", taskId).in("user_id", remove);
    if (r.error) return fail(r.error.message);
  }
  if (add.length) {
    const a = await supabase.from("task_assignments").insert(add.map((user_id) => ({ task_id: taskId, user_id, hourly_rate_inr: rates.get(user_id) ?? null })));
    if (a.error) return fail(a.error.message);
  }
  for (const row of current.data ?? []) {
    if (!want.has(row.user_id)) continue;
    const next = rates.get(row.user_id) ?? null;
    const prev = row.hourly_rate_inr == null ? null : Number(row.hourly_rate_inr);
    if (next !== prev) {
      const u = await supabase.from("task_assignments").update({ hourly_rate_inr: next }).eq("task_id", taskId).eq("user_id", row.user_id);
      if (u.error) return fail(u.error.message);
    }
  }

  refresh(clientId);
  return { ok: true, message: "Task saved." };
}

export async function deleteTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const taskId = taskIdFrom(form);
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("client_id", clientId);
  if (error?.code === "23503") return fail("This task has hours logged against it, so it can't be deleted. Mark it done instead.");
  if (error) return fail(`Could not delete: ${error.message}`);
  refresh(clientId);
  return { ok: true, message: "Task deleted." };
}

export async function addChangeRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const taskId = taskIdFrom(form);
  const title = text(form, "title");
  const description = text(form, "description");
  const hours = num(form, "hours");
  const requestedOn = text(form, "requestedOn");
  if (title.length < 1 || title.length > 160) return fail("Describe the change in a short title.");
  if (description.length > 2000) return fail("Description is too long (2,000 characters max).");
  if (!Number.isFinite(hours) || hours <= 0) return fail("Additional hours must be more than 0.");
  if (!DATE.test(requestedOn)) return fail("Pick the date the change was requested.");

  const supabase = await createClient();
  const sendNow = text(form, "approved") !== "yes";
  const user = await requireUser();
  const { error } = await supabase.from("change_requests").insert({
    task_id: taskId,
    title,
    description: description || null,
    hours,
    requested_on: requestedOn,
    status: sendNow ? "pending_client" : "approved",
    ...(sendNow ? {} : { client_approved_by: user.id, client_approved_at: new Date().toISOString() }),
  });
  if (error) return fail(`Could not add the change request: ${error.message}`);

  if (!sendNow) {
    // Already agreed with the client: re-open a finished task so the extra work can be logged.
    await supabase.from("tasks").update({ status: "open" }).eq("id", taskId).eq("client_id", clientId);
    refresh(clientId);
    return { ok: true, message: `Change request added and approved: +${hours} hours.` };
  }
  const email = await notifyClientChangeRequests(clientId);
  refresh(clientId);
  return { ok: true, message: `Change request sent to the client for approval: +${hours} hours. ${email}`.trim() };
}

export async function deleteChangeRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const id = text(form, "id");
  if (!UUID.test(id)) return fail("Invalid change request.");
  const supabase = await createClient();
  const { error } = await supabase.from("change_requests").delete().eq("id", id);
  if (error?.code === "23503") return fail("Hours are logged against this change request, so it can't be deleted.");
  if (error) return fail(`Could not delete: ${error.message}`);
  refresh(clientId);
  return { ok: true, message: "Change request deleted." };
}

// ---------------------------------------------------------------------------
// Admin: reviewing freelancer hours
// ---------------------------------------------------------------------------

export async function reviewEntryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = text(form, "id");
  const decision = text(form, "decision");
  const note = text(form, "note");
  const hoursRaw = text(form, "hours");
  if (!UUID.test(id)) return fail("Invalid entry.");
  if (decision !== "approve" && decision !== "reject") return fail("Choose approve or reject.");
  if (note.length > 500) return fail("Note is too long (500 characters max).");
  if (decision === "reject" && !note) return fail("Add a short reason so the freelancer knows what to fix.");

  const update: Record<string, unknown> = {
    status: decision === "approve" ? "awaiting_client" : "rejected",
    review_note: note || null,
    reviewed_by: admin.id,
    reviewed_at: new Date().toISOString(),
  };
  if (decision === "approve" && hoursRaw !== "") {
    const hours = Number(hoursRaw);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return fail("Hours must be more than 0 and at most 24.");
    update.hours = hours;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("time_entries").update(update).eq("id", id).eq("status", "pending").select("client_id").maybeSingle();
  if (error) return fail(`Could not save: ${error.message}`);
  if (!data) return fail("This entry was already reviewed. Refresh the page.");

  if (decision === "reject") {
    refresh(data.client_id);
    return { ok: true, message: "Rejected. The freelancer can see your note." };
  }
  const email = describeNotify(await notifyClient(data.client_id));
  refresh(data.client_id);
  return { ok: true, message: `Sent to the client to approve. ${email}`.trim() };
}

// ---------------------------------------------------------------------------
// Admin: freelancers
// ---------------------------------------------------------------------------

export async function inviteFreelancerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = text(form, "email").toLowerCase();
  const fullName = text(form, "fullName");
  if (!EMAIL.test(email) || email.length > 254) return fail("Enter a valid email address.");
  if (fullName.length < 1 || fullName.length > 120) return fail("Enter the freelancer's name. Clients see it in their work log.");

  const supabase = await createClient();
  const { error } = await supabase.from("freelancer_invites").insert({ email, full_name: fullName });
  if (error?.code === "23505") return fail(`${email} is already invited.`);
  if (error) return fail(`Could not invite: ${error.message}`);

  const linked = await supabase.rpc("link_existing_users");
  refresh();
  revalidatePath("/portal/admin/freelancers");
  const alreadyRegistered = Number(linked.data ?? 0) > 0;
  const sent = await sendInviteEmail({ role: "freelancer", email, name: fullName, alreadyRegistered });
  return alreadyRegistered
    ? { ok: true, message: `${fullName} already had an account and is now a freelancer. ${sent}` }
    : { ok: true, message: `Invited. ${fullName} becomes a freelancer as soon as they register with ${email}. ${sent}` };
}

export async function resendFreelancerInviteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = text(form, "email").toLowerCase();
  const supabase = await createClient();
  const { data } = await supabase.from("freelancer_invites").select("email, full_name").eq("email", email).maybeSingle();
  if (!data) return fail("This invite no longer exists. Refresh the page.");
  return { ok: true, message: await sendInviteEmail({ role: "freelancer", email, name: data.full_name ?? undefined, alreadyRegistered: false }) };
}

export async function revokeFreelancerInviteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = text(form, "email");
  const supabase = await createClient();
  const { error } = await supabase.from("freelancer_invites").delete().eq("email", email);
  if (error) return fail(`Could not remove: ${error.message}`);
  revalidatePath("/portal/admin/freelancers");
  return { ok: true, message: "Invite removed." };
}

export async function setFreelancerActiveAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = text(form, "userId");
  const active = text(form, "active") === "true";
  if (!UUID.test(userId)) return fail("Invalid freelancer.");
  const supabase = await createClient();
  const { error } = await supabase.from("freelancers").update({ active }).eq("user_id", userId);
  if (error) return fail(`Could not save: ${error.message}`);
  refresh();
  revalidatePath("/portal/admin/freelancers");
  return { ok: true, message: active ? "Access restored." : "Access removed. Their past hours stay on record." };
}

// ---------------------------------------------------------------------------
// Freelancers: logging hours
// ---------------------------------------------------------------------------

function friendlyEntryError(message: string) {
  const exceeded = message.match(/ESTIMATE_EXCEEDED:([\d.]+)/);
  if (exceeded) {
    const left = Number(exceeded[1]);
    return left > 0
      ? `Only ${left} hours are left on this task's estimate. If the work needs more, request extra hours on the task.`
      : "This task's hours are used up. Request extra hours on the task if more work is needed.";
  }
  if (message.includes("TASK_CLOSED")) return "This task is marked done, so hours can't be logged on it.";
  if (message.includes("CHANGE_REQUEST_MISMATCH")) return "That change request belongs to a different task.";
  if (message.includes("CHANGE_REQUEST_NOT_APPROVED")) return "That change request isn't approved by the client yet, so hours can't be logged on it.";
  if (message.includes("row-level security")) return "You're not assigned to this task.";
  return `Could not log the hours: ${message}`;
}

export async function logHoursAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireFreelancer();
  const taskId = text(form, "taskId");
  const changeRequestId = text(form, "changeRequestId") || null;
  const workDate = text(form, "workDate");
  const description = text(form, "description");
  const hours = num(form, "hours");

  if (!UUID.test(taskId)) return fail("Pick a task.");
  if (changeRequestId && !UUID.test(changeRequestId)) return fail("Invalid change request.");
  if (!DATE.test(workDate)) return fail("Pick the date you did the work.");
  const tomorrow = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10);
  if (workDate > tomorrow) return fail("You can't log hours for a future date.");
  if (description.length < 1 || description.length > 1000) return fail("Describe the work (up to 1,000 characters).");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return fail("Hours must be more than 0 and at most 24.");

  const supabase = await createClient();
  const task = await supabase.from("tasks").select("client_id").eq("id", taskId).maybeSingle();
  if (!task.data) return fail("You're not assigned to this task.");

  const user = await requireUser();
  const { error } = await supabase.from("time_entries").insert({
    client_id: task.data.client_id,
    task_id: taskId,
    change_request_id: changeRequestId,
    work_date: workDate,
    description,
    hours,
    consultant: "-",
    status: "pending",
    created_by: user.id,
  });
  if (error) return fail(friendlyEntryError(error.message));

  revalidatePath("/portal/work");
  revalidatePath("/portal", "layout");
  return { ok: true, message: `Logged ${hours} hours. ERP VERS will review them before they go to the client.` };
}

export async function deleteMyEntryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireFreelancer();
  const id = text(form, "id");
  if (!UUID.test(id)) return fail("Invalid entry.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("time_entries").delete().eq("id", id).eq("status", "pending").select("id");
  if (error) return fail(`Could not delete: ${error.message}`);
  if (!data?.length) return fail("Only entries still waiting for review can be deleted.");
  revalidatePath("/portal/work");
  return { ok: true, message: "Entry deleted." };
}

// ---------------------------------------------------------------------------
// Admin: sending hours to the client
// ---------------------------------------------------------------------------

/** Approve every freelancer entry waiting for review for one client, and email the client once. */
export async function approveAllForClientAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const clientId = clientIdFrom(form);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .update({ status: "awaiting_client", reviewed_by: admin.id, reviewed_at: new Date().toISOString(), review_note: null })
    .eq("client_id", clientId)
    .eq("status", "pending")
    .select("id");
  if (error) return fail(`Could not approve: ${error.message}`);
  if (!data?.length) return fail("Nothing is waiting for review for this client.");

  const email = describeNotify(await notifyClient(clientId));
  refresh(clientId);
  return { ok: true, message: `Sent ${data.length} ${data.length === 1 ? "entry" : "entries"} to the client to approve. ${email}`.trim() };
}

/** Email the client now: new hours if any haven't been emailed yet, otherwise a reminder of everything waiting. */
export async function emailClientAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  let result = await notifyClient(clientId);
  let reminder = false;
  if (!result.sent && result.reason === "nothing") {
    result = await notifyClient(clientId, { reminder: true });
    reminder = true;
  }
  refresh(clientId);
  if (result.sent) return { ok: true, message: reminder ? `Reminder sent. ${describeNotify(result)}` : describeNotify(result) };
  if (result.reason === "nothing") return fail("Nothing is waiting for the client's approval.");
  return fail(describeNotify(result));
}

/** For when a client approves by email or phone instead of in the portal. */
export async function markClientApprovedAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const clientId = clientIdFrom(form);
  const id = text(form, "id");
  if (id && !UUID.test(id)) return fail("Invalid entry.");

  const supabase = await createClient();
  let query = supabase
    .from("time_entries")
    .update({ status: "approved", client_approved_by: admin.id, client_approved_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("status", "awaiting_client");
  if (id) query = query.eq("id", id);
  const { data, error } = await query.select("id");
  if (error) return fail(`Could not save: ${error.message}`);
  if (!data?.length) return fail("Nothing was waiting for approval.");

  refresh(clientId);
  return { ok: true, message: `Marked ${data.length} ${data.length === 1 ? "entry" : "entries"} as approved by the client.` };
}

// ---------------------------------------------------------------------------
// Clients: approving hours (approve only; to dispute, they contact ERP VERS)
// ---------------------------------------------------------------------------

export async function clientApproveAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const clientId = clientIdFrom(form);
  const ids = form.getAll("entryId").map(String).filter((v) => UUID.test(v));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("client_approve_entries", {
    p_client_id: clientId,
    p_entry_ids: ids.length ? ids : null,
  });
  if (error) return fail("Something went wrong saving your approval. Please try again, or contact us.");
  const n = Number(data ?? 0);
  if (n === 0) return fail("These hours were already approved. Refresh the page to see the latest.");

  revalidatePath("/portal", "layout");
  return { ok: true, message: `Thank you. ${n} ${n === 1 ? "entry" : "entries"} approved.` };
}

// ---------------------------------------------------------------------------
// Change requests: freelancer asks, ERP VERS reviews, client approves
// ---------------------------------------------------------------------------

export async function requestChangeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const profile = await requireFreelancer();
  const taskId = text(form, "taskId");
  const title = text(form, "title");
  const reason = text(form, "description");
  const hours = num(form, "hours");
  if (!UUID.test(taskId)) return fail("Pick a task.");
  if (title.length < 1 || title.length > 160) return fail("Say in a few words what the extra work is.");
  if (reason.length < 1 || reason.length > 2000) return fail("Explain why the extra hours are needed (up to 2,000 characters).");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 1000) return fail("Extra hours must be more than 0.");

  const supabase = await createClient();
  const task = await supabase.from("tasks").select("title, client:clients(name)").eq("id", taskId).maybeSingle();
  if (!task.data) return fail("You're not assigned to this task.");
  const { error } = await supabase.from("change_requests").insert({
    task_id: taskId,
    title,
    description: reason,
    hours,
    status: "requested",
    requested_by: profile.user_id,
  });
  if (error) {
    if (error.message.includes("TASK_CLOSED")) return fail("This task is marked done. Contact ERP VERS if more work is needed.");
    return fail(`Could not send the request: ${error.message}`);
  }

  await notifyAdminOfChangeRequest({
    freelancer: profile.full_name,
    taskTitle: task.data.title,
    clientName: (task.data.client as unknown as { name: string } | null)?.name ?? "Client",
    title,
    hours,
    reason,
  });
  revalidatePath("/portal/work");
  return { ok: true, message: `Sent. ERP VERS will review your request for ${hours} extra hours, then the client approves it. You can log the extra hours once it's approved.` };
}

/** Admin: approve a freelancer's request (optionally changing the hours) and send it to the client, or decline it. */
export async function reviewChangeRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = text(form, "id");
  const decision = text(form, "decision");
  if (!UUID.test(id)) return fail("Invalid change request.");
  const supabase = await createClient();
  const cr = await supabase.from("change_requests").select("id, status, task:tasks(client_id)").eq("id", id).maybeSingle();
  if (!cr.data || cr.data.status !== "requested") return fail("This request was already handled. Refresh the page.");
  const clientId = (cr.data.task as unknown as { client_id: string } | null)?.client_id;
  if (!clientId) return fail("Task not found.");

  if (decision === "reject") {
    const note = text(form, "note");
    if (note.length < 1 || note.length > 500) return fail("Give a short reason (the freelancer sees it).");
    const { error } = await supabase
      .from("change_requests")
      .update({ status: "rejected", review_note: note, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return fail(`Could not save: ${error.message}`);
    refresh(clientId);
    revalidatePath("/portal/admin/review");
    return { ok: true, message: "Declined. The freelancer can see your reason." };
  }

  const hours = num(form, "hours");
  const title = text(form, "title");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 1000) return fail("Extra hours must be more than 0.");
  if (title.length < 1 || title.length > 160) return fail("Give the change a short title (the client sees it).");
  const { error } = await supabase
    .from("change_requests")
    .update({ status: "pending_client", hours, title, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail(`Could not save: ${error.message}`);
  const email = await notifyClientChangeRequests(clientId);
  refresh(clientId);
  revalidatePath("/portal/admin/review");
  return { ok: true, message: `Sent to the client to approve (+${hours} h). ${email}`.trim() };
}

/** Admin: the client approved by phone or email. */
export async function markChangeApprovedAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const clientId = clientIdFrom(form);
  const id = text(form, "id");
  if (!UUID.test(id)) return fail("Invalid change request.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("change_requests")
    .update({ status: "approved", client_approved_by: admin.id, client_approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_client")
    .select("task_id")
    .maybeSingle();
  if (error) return fail(`Could not save: ${error.message}`);
  if (!data) return fail("This change request isn't waiting for the client.");
  await supabase.from("tasks").update({ status: "open" }).eq("id", data.task_id).eq("client_id", clientId);
  refresh(clientId);
  return { ok: true, message: "Marked as approved by the client. The freelancer can now log the extra hours." };
}

/** Admin: send (or re-send) the change-request email to the client. */
export async function emailClientChangesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const message = await notifyClientChangeRequests(clientId, { reminder: true });
  refresh(clientId);
  return { ok: !/couldn't|isn't set up|Nobody|Nothing/.test(message), message };
}

/** Client: approve change requests (one, or all waiting). */
export async function clientApproveChangesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const clientId = clientIdFrom(form);
  const ids = form.getAll("changeId").map(String).filter((v) => UUID.test(v));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("client_approve_change_requests", { p_client_id: clientId, p_ids: ids.length ? ids : null });
  if (error) return fail("Something went wrong saving your approval. Please try again, or contact us.");
  const n = Number(data ?? 0);
  if (n === 0) return fail("Already approved. Refresh the page to see the latest.");
  revalidatePath("/portal", "layout");
  return { ok: true, message: `Thank you. ${n === 1 ? "The change request is" : `${n} change requests are`} approved and the work can go ahead.` };
}

// ---------------------------------------------------------------------------
// Rates
// ---------------------------------------------------------------------------

export async function setClientRatesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const clientId = clientIdFrom(form);
  const currency = text(form, "currency").toUpperCase();
  const rateRaw = text(form, "hourlyRate");
  const fxRaw = text(form, "inrPerUnit");
  if (!(CURRENCIES as readonly string[]).includes(currency)) return fail("Pick a currency.");
  const hourlyRate = rateRaw === "" ? null : Number(rateRaw);
  if (hourlyRate != null && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) return fail("Hourly rate must be 0 or more.");
  const inrPerUnit = currency === "INR" ? 1 : fxRaw === "" ? null : Number(fxRaw);
  if (inrPerUnit != null && (!Number.isFinite(inrPerUnit) || inrPerUnit <= 0)) return fail("Exchange rate must be more than 0.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_rates")
    .upsert({ client_id: clientId, currency, hourly_rate: hourlyRate, inr_per_unit: inrPerUnit, updated_at: new Date().toISOString() });
  if (error) return fail(`Could not save rates: ${error.message}`);
  refresh(clientId);
  return { ok: true, message: "Rates saved. New purchases use this rate; earlier purchases keep theirs." };
}

export async function setFreelancerRateAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = text(form, "userId");
  const raw = text(form, "rate");
  if (!UUID.test(userId)) return fail("Invalid freelancer.");
  const rate = raw === "" ? null : Number(raw);
  if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 1_000_000)) return fail("Rate must be 0 or more (INR per hour).");
  const supabase = await createClient();
  const { error } = await supabase.from("freelancers").update({ default_rate_inr: rate }).eq("user_id", userId);
  if (error) return fail(`Could not save: ${error.message}`);
  revalidatePath("/portal/admin/freelancers");
  return { ok: true, message: "Default rate saved. It's filled in when you assign them to a task." };
}
