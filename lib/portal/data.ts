import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isPortalConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type Client = { id: string; name: string; low_balance_hours: number; created_at: string };
export type Purchase = {
  id: string;
  hours: number;
  discount_pct: number;
  purchased_on: string;
  reference: string | null;
  /** Rate per hour before discount, in `currency`. Null for purchases recorded before rates existed. */
  hourly_rate: number | null;
  currency: string | null;
};
export type EntryStatus = "pending" | "awaiting_client" | "approved" | "rejected";
export type TimeEntry = {
  id: string;
  work_date: string;
  consultant: string;
  description: string;
  hours: number;
  status: EntryStatus;
  review_note: string | null;
  task_id: string | null;
  task_title: string | null;
  change_request_title: string | null;
};
export type Member = { user_id: string; email: string };
export type ChangeRequestStatus = "requested" | "pending_client" | "approved" | "rejected";
export type ChangeRequest = {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  hours: number;
  requested_on: string;
  status: ChangeRequestStatus;
  requested_by_name: string | null;
  review_note: string | null;
  client_notified_at: string | null;
};
export type Task = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  estimate_hours: number;
  status: "open" | "done";
  created_at: string;
  changeRequests: ChangeRequest[];
  totalEstimate: number;
  /** Hours ERP VERS has reviewed and sent to the client (awaiting their approval or approved). */
  reviewedHours: number;
  /** Freelancer hours not yet reviewed by ERP VERS. Zero for clients. */
  pendingHours: number;
  /** Extra hours asked for but not approved by the client yet. Clients see only what was sent to them. */
  waitingChangeHours: number;
  /** Admins see everyone with their rate; a freelancer sees only themselves; clients see nobody. */
  assignees: { user_id: string; full_name: string; hourly_rate_inr: number | null }[];
};
export type MonthUsage = { month: string; hours: number };
export type ClientRates = { currency: string; hourly_rate: number | null; inr_per_unit: number | null };

export type DashboardData = {
  client: Client;
  purchases: Purchase[];
  /** Entries sent to the client (awaiting their approval, or approved). These count against the balance. */
  entries: TimeEntry[];
  /** The subset still waiting for the client to approve. */
  awaiting: TimeEntry[];
  members: Member[];
  tasks: Task[];
  summary: {
    purchased: number;
    used: number;
    remaining: number;
    usedPct: number;
    awaitingHours: number;
    isLow: boolean;
    isOverdrawn: boolean;
    lastEntryDate: string | null;
  };
  monthly: MonthUsage[];
};

const round = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Who is signed in, and what are they
// ---------------------------------------------------------------------------

/** The signed-in user, or null. Cached per request so layout and page share one lookup. */
export const getCurrentUser = cache(async () => {
  // Portal pages are always rendered per request, never prebuilt.
  await connection();
  if (!isPortalConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const meta = (data.claims.user_metadata ?? {}) as { full_name?: string; company?: string };
  return {
    id: data.claims.sub as string,
    email: (data.claims.email as string | undefined) ?? "",
    fullName: meta.full_name?.trim() || null,
    company: meta.company?.trim() || null,
  };
});

export const getIsAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return Boolean(data);
});

/** The signed-in person's freelancer profile, if they are an active freelancer. */
export const getFreelancerProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("freelancers")
    .select("user_id, full_name, email, active")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.active ? data : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!(await getIsAdmin())) redirect("/portal");
  return user;
}

export async function requireFreelancer() {
  await requireUser();
  const profile = await getFreelancerProfile();
  if (!profile) redirect("/portal");
  return profile;
}

// ---------------------------------------------------------------------------
// Clients and dashboards
// ---------------------------------------------------------------------------

/** Companies the current user can see. Row level security does the filtering. */
export async function getVisibleClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("id, name, low_balance_hours, created_at").order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, low_balance_hours: Number(c.low_balance_hours) }));
}

type EntryRow = {
  id: string;
  work_date: string;
  consultant: string;
  description: string;
  hours: number;
  status: EntryStatus;
  review_note: string | null;
  task_id: string | null;
  task: { title: string } | null;
  change_request: { title: string } | null;
};

const ENTRY_COLUMNS =
  "id, work_date, consultant, description, hours, status, review_note, task_id, task:tasks(title), change_request:change_requests(title)";

function toEntry(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    work_date: row.work_date,
    consultant: row.consultant,
    description: row.description,
    hours: Number(row.hours),
    status: row.status,
    review_note: row.review_note,
    task_id: row.task_id,
    task_title: row.task?.title ?? null,
    change_request_title: row.change_request?.title ?? null,
  };
}

/** Tasks for one client (or every visible task), with change requests and hours used. */
export async function getTasks(clientId?: string): Promise<Task[]> {
  const supabase = await createClient();
  let taskQuery = supabase
    .from("tasks")
    .select(
      "id, client_id, title, description, estimate_hours, status, created_at, " +
        "change_requests(id, task_id, title, description, hours, requested_on, status, requested_by_name, review_note, client_notified_at), " +
        "task_assignments(user_id, hourly_rate_inr, freelancers(full_name))",
    )
    .order("status")
    .order("created_at");
  if (clientId) taskQuery = taskQuery.eq("client_id", clientId);

  const [tasksRes, usageRes] = await Promise.all([taskQuery, supabase.rpc("task_usage", { p_client_id: clientId ?? null })]);
  if (tasksRes.error) throw tasksRes.error;
  if (usageRes.error) throw usageRes.error;

  const usage = new Map(
    (
      (usageRes.data ?? []) as { task_id: string; total_estimate: number; reviewed_hours: number; pending_hours: number; waiting_change_hours: number }[]
    ).map((u) => [u.task_id, u]),
  );

  type Row = {
    id: string; client_id: string; title: string; description: string | null; estimate_hours: number; status: "open" | "done"; created_at: string;
    change_requests: ChangeRequest[] | null;
    task_assignments: { user_id: string; hourly_rate_inr: number | null; freelancers: { full_name: string } | null }[] | null;
  };

  return ((tasksRes.data ?? []) as unknown as Row[]).map((t) => {
    const u = usage.get(t.id);
    return {
      id: t.id,
      client_id: t.client_id,
      title: t.title,
      description: t.description,
      estimate_hours: Number(t.estimate_hours),
      status: t.status,
      created_at: t.created_at,
      changeRequests: (t.change_requests ?? [])
        .map((c) => ({ ...c, hours: Number(c.hours) }))
        .sort((a, b) => a.requested_on.localeCompare(b.requested_on)),
      totalEstimate: Number(u?.total_estimate ?? t.estimate_hours),
      reviewedHours: Number(u?.reviewed_hours ?? 0),
      pendingHours: Number(u?.pending_hours ?? 0),
      waitingChangeHours: Number(u?.waiting_change_hours ?? 0),
      assignees: (t.task_assignments ?? []).map((a) => ({
        user_id: a.user_id,
        full_name: a.freelancers?.full_name ?? "Freelancer",
        hourly_rate_inr: a.hourly_rate_inr == null ? null : Number(a.hourly_rate_inr),
      })),
    };
  });
}

export async function getDashboardData(clientId: string): Promise<DashboardData | null> {
  const supabase = await createClient();
  const [clientRes, purchasesRes, entriesRes, membersRes, tasks] = await Promise.all([
    supabase.from("clients").select("id, name, low_balance_hours, created_at").eq("id", clientId).maybeSingle(),
    supabase
      .from("hour_purchases")
      .select("id, hours, discount_pct, purchased_on, reference, hourly_rate, currency")
      .eq("client_id", clientId)
      .order("purchased_on", { ascending: false }),
    supabase
      .from("time_entries")
      .select(ENTRY_COLUMNS)
      .eq("client_id", clientId)
      .in("status", ["awaiting_client", "approved"])
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("client_members").select("user_id, email").eq("client_id", clientId).order("email"),
    getTasks(clientId),
  ]);

  for (const res of [clientRes, purchasesRes, entriesRes, membersRes]) if (res.error) throw res.error;
  if (!clientRes.data) return null;

  const client = { ...clientRes.data, low_balance_hours: Number(clientRes.data.low_balance_hours) };
  const purchases = (purchasesRes.data ?? []).map((p) => ({
    ...p,
    hours: Number(p.hours),
    discount_pct: Number(p.discount_pct),
    hourly_rate: p.hourly_rate == null ? null : Number(p.hourly_rate),
  }));
  const entries = ((entriesRes.data ?? []) as unknown as EntryRow[]).map(toEntry);
  const members = membersRes.data ?? [];

  const purchased = round(purchases.reduce((sum, p) => sum + p.hours, 0));
  const used = round(entries.reduce((sum, e) => sum + e.hours, 0));
  const remaining = round(purchased - used);
  const awaiting = entries.filter((e) => e.status === "awaiting_client");

  return {
    client,
    purchases,
    entries,
    awaiting,
    members,
    tasks,
    summary: {
      purchased,
      used,
      remaining,
      usedPct: purchased > 0 ? Math.min(100, Math.round((used / purchased) * 100)) : 0,
      awaitingHours: round(awaiting.reduce((sum, e) => sum + e.hours, 0)),
      isLow: purchased > 0 && remaining > 0 && remaining <= client.low_balance_hours,
      isOverdrawn: remaining < 0,
      lastEntryDate: entries[0]?.work_date ?? null,
    },
    monthly: monthlyUsage(entries, 6),
  };
}

/** Hours per calendar month for the last `months` months, oldest first, including empty months. */
export function monthlyUsage(entries: Pick<TimeEntry, "work_date" | "hours">[], months: number, now = new Date()): MonthUsage[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const e of entries) {
    const key = e.work_date.slice(0, 7);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + e.hours);
  }
  return keys.map((month) => ({ month, hours: round(totals.get(month) ?? 0) }));
}

// ---------------------------------------------------------------------------
// Freelancers
// ---------------------------------------------------------------------------

export type FreelancerTask = Task & {
  client_name: string;
  /** The freelancer's own rate on this task, in INR per hour. */
  rateInr: number | null;
  /** Their hours ERP VERS has accepted (sent to the client or approved). */
  myAcceptedHours: number;
  /** Their hours still waiting for ERP VERS to review. */
  myWaitingHours: number;
  earnedInr: number | null;
  waitingInr: number | null;
};

/** Tasks assigned to the signed-in freelancer, and the hours they have logged. */
export async function getFreelancerWork() {
  const supabase = await createClient();
  const user = await requireUser();
  const [tasks, clientsRes, entriesRes] = await Promise.all([
    getTasks(),
    supabase.from("clients").select("id, name"),
    supabase
      .from("time_entries")
      .select(ENTRY_COLUMNS)
      .eq("created_by", user.id)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (clientsRes.error) throw clientsRes.error;
  if (entriesRes.error) throw entriesRes.error;

  const names = new Map((clientsRes.data ?? []).map((c) => [c.id, c.name]));
  const entries = ((entriesRes.data ?? []) as unknown as EntryRow[]).map(toEntry);
  const myTasks = tasks.map((t) => {
    // Row level security returns only the freelancer's own assignment, so this is their rate.
    const rate = t.assignees.find((a) => a.user_id === user.id)?.hourly_rate_inr ?? null;
    const mine = entries.filter((e) => e.task_id === t.id && e.status !== "rejected");
    const accepted = round(mine.filter((e) => e.status !== "pending").reduce((s, e) => s + e.hours, 0));
    const waiting = round(mine.filter((e) => e.status === "pending").reduce((s, e) => s + e.hours, 0));
    return {
      ...t,
      client_name: names.get(t.client_id) ?? "Client",
      rateInr: rate,
      myAcceptedHours: accepted,
      myWaitingHours: waiting,
      earnedInr: rate == null ? null : round(accepted * rate),
      waitingInr: rate == null ? null : round(waiting * rate),
    };
  });
  const sumOf = (k: "earnedInr" | "waitingInr") => round(myTasks.reduce((s, t) => s + (t[k] ?? 0), 0));
  return {
    tasks: myTasks as FreelancerTask[],
    entries,
    earnings: {
      earnedInr: sumOf("earnedInr"),
      waitingInr: sumOf("waitingInr"),
      missingRate: myTasks.some((t) => t.rateInr == null && t.myAcceptedHours + t.myWaitingHours > 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type ClientOverview = Client & {
  purchased: number;
  used: number;
  remaining: number;
  pendingHours: number;
  awaitingClientHours: number;
  lastEntryDate: string | null;
};

/** Every client with their balance, for the admin list. Admin-only through RLS. */
export async function getAdminOverview(): Promise<ClientOverview[]> {
  const supabase = await createClient();
  const [clients, purchasesRes, entriesRes] = await Promise.all([
    getVisibleClients(),
    supabase.from("hour_purchases").select("client_id, hours"),
    supabase.from("time_entries").select("client_id, hours, work_date, status").neq("status", "rejected"),
  ]);
  if (purchasesRes.error) throw purchasesRes.error;
  if (entriesRes.error) throw entriesRes.error;

  return clients.map((c) => {
    const purchased = (purchasesRes.data ?? []).filter((p) => p.client_id === c.id).reduce((s, p) => s + Number(p.hours), 0);
    const mine = (entriesRes.data ?? []).filter((e) => e.client_id === c.id);
    const sent = mine.filter((e) => e.status === "approved" || e.status === "awaiting_client");
    const used = sent.reduce((s, e) => s + Number(e.hours), 0);
    const sum = (status: string) => mine.filter((e) => e.status === status).reduce((s, e) => s + Number(e.hours), 0);
    const lastEntryDate = sent.map((e) => e.work_date).sort().at(-1) ?? null;
    return {
      ...c,
      purchased: round(purchased),
      used: round(used),
      remaining: round(purchased - used),
      pendingHours: round(sum("pending")),
      awaitingClientHours: round(sum("awaiting_client")),
      lastEntryDate,
    };
  });
}

export type PendingRegistration = {
  user_id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  registered_at: string;
  email_confirmed: boolean;
};

/** Accounts waiting for approval. The database returns nothing unless the caller is an admin. */
export const getPendingRegistrations = cache(async (): Promise<PendingRegistration[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pending_registrations");
  if (error) throw error;
  return (data ?? []) as PendingRegistration[];
});

export type ReviewEntry = TimeEntry & { client_id: string; client_name: string; created_at: string };

/** Freelancer hours waiting for review. */
export const getReviewQueue = cache(async (): Promise<ReviewEntry[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select(`${ENTRY_COLUMNS}, client_id, created_at, client:clients(name)`)
    .eq("status", "pending")
    .order("work_date")
    .order("created_at");
  if (error) throw error;
  type Row = EntryRow & { client_id: string; created_at: string; client: { name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...toEntry(r),
    client_id: r.client_id,
    client_name: r.client?.name ?? "Client",
    created_at: r.created_at,
  }));
});

export type Freelancer = { user_id: string; email: string; full_name: string; active: boolean; openTasks: number; default_rate_inr: number | null };

export async function getFreelancers(): Promise<{ freelancers: Freelancer[]; invites: { email: string; full_name: string; created_at: string }[] }> {
  const supabase = await createClient();
  const [fRes, iRes, aRes] = await Promise.all([
    supabase.from("freelancers").select("user_id, email, full_name, active, default_rate_inr").order("full_name"),
    supabase.from("freelancer_invites").select("email, full_name, created_at").order("created_at", { ascending: false }),
    supabase.from("task_assignments").select("user_id, task:tasks(status)"),
  ]);
  for (const r of [fRes, iRes, aRes]) if (r.error) throw r.error;
  const open = new Map<string, number>();
  for (const a of (aRes.data ?? []) as unknown as { user_id: string; task: { status: string } | null }[]) {
    if (a.task?.status === "open") open.set(a.user_id, (open.get(a.user_id) ?? 0) + 1);
  }
  return {
    freelancers: (fRes.data ?? []).map((f) => ({
      ...f,
      default_rate_inr: f.default_rate_inr == null ? null : Number(f.default_rate_inr),
      openTasks: open.get(f.user_id) ?? 0,
    })),
    invites: iRes.data ?? [],
  };
}

/** Domains and invited emails that give access to a client. */
export async function getClientAccess(clientId: string) {
  const supabase = await createClient();
  const [domains, invites] = await Promise.all([
    supabase.from("client_domains").select("domain").eq("client_id", clientId).order("domain"),
    supabase.from("client_invites").select("email").eq("client_id", clientId).order("email"),
  ]);
  if (domains.error) throw domains.error;
  if (invites.error) throw invites.error;
  return { domains: (domains.data ?? []).map((d) => d.domain), invites: (invites.data ?? []).map((i) => i.email) };
}

/** Email status of hours waiting for a client's approval (admin view). */
export async function getClientEmailState(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select("hours, client_notified_at")
    .eq("client_id", clientId)
    .eq("status", "awaiting_client");
  if (error) throw error;
  const rows = data ?? [];
  const unsent = rows.filter((r) => !r.client_notified_at);
  const lastSent = rows.map((r) => r.client_notified_at).filter(Boolean).sort().at(-1) ?? null;
  return {
    awaitingCount: rows.length,
    unsentCount: unsent.length,
    unsentHours: round(unsent.reduce((s, r) => s + Number(r.hours), 0)),
    lastSentAt: lastSent as string | null,
  };
}

// ---------------------------------------------------------------------------
// Change requests and money (admin)
// ---------------------------------------------------------------------------

export type ChangeRequestReview = ChangeRequest & { client_id: string; client_name: string; task_title: string };

/** Extra hours freelancers have asked for, waiting for ERP VERS. */
export const getChangeRequestQueue = cache(async (): Promise<ChangeRequestReview[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("change_requests")
    .select("id, task_id, title, description, hours, requested_on, status, requested_by_name, review_note, client_notified_at, task:tasks(title, client_id, client:clients(name))")
    .eq("status", "requested")
    .order("created_at");
  if (error) throw error;
  type Row = ChangeRequest & { task: { title: string; client_id: string; client: { name: string } | null } | null };
  return ((data ?? []) as unknown as Row[]).map(({ task, ...cr }) => ({
    ...cr,
    hours: Number(cr.hours),
    task_title: task?.title ?? "Task",
    client_id: task?.client_id ?? "",
    client_name: task?.client?.name ?? "Client",
  }));
});

/** A client's currency, hourly rate and exchange rate. Admin-only through RLS. */
export async function getClientRates(clientId: string): Promise<ClientRates> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("client_rates").select("currency, hourly_rate, inr_per_unit").eq("client_id", clientId).maybeSingle();
  if (error) throw error;
  return {
    currency: data?.currency ?? "USD",
    hourly_rate: data?.hourly_rate == null ? null : Number(data.hourly_rate),
    inr_per_unit: data?.inr_per_unit == null ? null : Number(data.inr_per_unit),
  };
}

export type TaskMoney = {
  task_id: string;
  title: string;
  billedHours: number;
  clientAmount: number | null;
  clientAmountInr: number | null;
  freelancerCostInr: number;
  /** Hours from entries whose freelancer has no rate on this task, so their cost is unknown. */
  unratedHours: number;
  marginInr: number | null;
};

export type ClientMoney = {
  rates: ClientRates;
  /** Client's price per hour after prepaid discounts (weighted over purchases), in their currency. */
  netRate: number | null;
  prepaidAmount: number | null;
  tasks: TaskMoney[];
  totals: { billedHours: number; clientAmount: number | null; clientAmountInr: number | null; freelancerCostInr: number; unratedHours: number; marginInr: number | null };
};

/**
 * What ERP VERS earns on a client: client amount for hours sent to the client, minus what
 * the freelancers who logged those hours are paid. Admin-only (reads rates).
 */
export async function getClientMoney(clientId: string, purchases: Purchase[], tasks: Task[]): Promise<ClientMoney> {
  const supabase = await createClient();
  const [rates, entriesRes] = await Promise.all([
    getClientRates(clientId),
    supabase
      .from("time_entries")
      .select("task_id, hours, created_by")
      .eq("client_id", clientId)
      .in("status", ["awaiting_client", "approved"]),
  ]);
  if (entriesRes.error) throw entriesRes.error;

  const priced = purchases.filter((p) => p.hourly_rate != null);
  const pricedHours = priced.reduce((s, p) => s + p.hours, 0);
  const prepaidAmount = priced.length ? round(priced.reduce((s, p) => s + p.hours * p.hourly_rate! * (1 - p.discount_pct / 100), 0)) : null;
  const netRate = pricedHours > 0 ? prepaidAmount! / pricedHours : rates.hourly_rate;
  const toInr = (amount: number | null) => (amount == null || rates.inr_per_unit == null ? null : round(amount * rates.inr_per_unit));

  const rateFor = new Map<string, number | null>();
  for (const t of tasks) for (const a of t.assignees) rateFor.set(`${t.id}:${a.user_id}`, a.hourly_rate_inr);

  const byTask = new Map<string, { hours: number; cost: number; unrated: number }>();
  for (const e of (entriesRes.data ?? []) as { task_id: string | null; hours: number; created_by: string | null }[]) {
    const key = e.task_id ?? "none";
    const row = byTask.get(key) ?? { hours: 0, cost: 0, unrated: 0 };
    const hours = Number(e.hours);
    row.hours += hours;
    const rate = e.task_id && e.created_by ? rateFor.get(`${e.task_id}:${e.created_by}`) : undefined;
    if (rate == null) row.unrated += hours;
    else row.cost += hours * rate;
    byTask.set(key, row);
  }

  const rows: TaskMoney[] = [...tasks.map((t) => ({ id: t.id, title: t.title })), { id: "none", title: "Not linked to a task" }]
    .filter((t) => t.id !== "none" || byTask.has("none"))
    .map((t) => {
      const r = byTask.get(t.id) ?? { hours: 0, cost: 0, unrated: 0 };
      const clientAmount = netRate == null ? null : round(r.hours * netRate);
      const clientAmountInr = toInr(clientAmount);
      return {
        task_id: t.id,
        title: t.title,
        billedHours: round(r.hours),
        clientAmount,
        clientAmountInr,
        freelancerCostInr: round(r.cost),
        unratedHours: round(r.unrated),
        marginInr: clientAmountInr == null ? null : round(clientAmountInr - r.cost),
      };
    });

  const sum = (k: "billedHours" | "freelancerCostInr" | "unratedHours") => round(rows.reduce((s, r) => s + r[k], 0));
  const clientAmount = netRate == null ? null : round(rows.reduce((s, r) => s + (r.clientAmount ?? 0), 0));
  const clientAmountInr = toInr(clientAmount);
  return {
    rates,
    netRate: netRate == null ? null : round(netRate),
    prepaidAmount,
    tasks: rows,
    totals: {
      billedHours: sum("billedHours"),
      clientAmount,
      clientAmountInr,
      freelancerCostInr: sum("freelancerCostInr"),
      unratedHours: sum("unratedHours"),
      marginInr: clientAmountInr == null ? null : round(clientAmountInr - sum("freelancerCostInr")),
    },
  };
}
