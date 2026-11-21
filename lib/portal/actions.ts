"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { discountForHours } from "@/lib/prepaid";
import { getPendingRegistrations, requireAdmin, requireUser } from "@/lib/portal/data";
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
  if (company.length < 1 || company.length > 120) return fail("Enter your company name.");
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
    message: `We've sent a confirmation link to ${email}. Click it, then sign in. Your dashboard appears as soon as ERP VERS approves your account.`,
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
    return fail(`${email} hasn't registered yet. Ask them to create an account at erpvers.com/portal/register, then add them again.`);
  }

  const { error } = await supabase.from("client_members").insert({ client_id: clientId, user_id: userId, email });
  if (error?.code === "23505") return fail(`${email} already has access.`);
  if (error) return fail(`Could not add ${email}: ${error.message}`);

  refresh(clientId);
  return { ok: true, message: `${email} can now see this dashboard.` };
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

  const supabase = await createClient();
  const { error } = await supabase.from("hour_purchases").insert({
    client_id: clientId,
    hours,
    discount_pct: discount,
    purchased_on: purchasedOn,
    reference: reference || null,
  });
  if (error) return fail(`Could not record the purchase: ${error.message}`);

  refresh(clientId);
  return { ok: true, message: `Recorded ${hours} hours at ${discount}% discount.` };
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

  if (!DATE.test(workDate)) return fail("Pick the date the work was done.");
  if (consultant.length < 1 || consultant.length > 120) return fail("Enter the consultant's name.");
  if (description.length < 1 || description.length > 1000) return fail("Describe the work (up to 1,000 characters).");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return fail("Hours must be more than 0 and at most 24.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .insert({ client_id: clientId, work_date: workDate, consultant, description, hours });
  if (error) return fail(`Could not log the hours: ${error.message}`);

  refresh(clientId);
  return { ok: true, message: `Logged ${hours} hours.` };
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
