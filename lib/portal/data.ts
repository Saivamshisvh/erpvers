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
/** reviewed: ERP VERS approved it but hasn't sent it to the client yet (the client can't see it). */
export type EntryStatus = "pending" | "reviewed" | "awaiting_client" | "approved" | "rejected";
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
/** reviewed: ERP VERS approved it but hasn't sent it to the client yet. */
export type ChangeRequestStatus = "requested" | "reviewed" | "pending_client" | "approved" | "rejected";
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
/** draft: being prepared (clients can't see it). pending_client: sent for approval. approved: the client agreed. */
export type BudgetStatus = "draft" | "pending_client" | "approved";
export type Task = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  estimate_hours: number;
  status: "open" | "done";
  budget_status: BudgetStatus;
  budget_notified_at: string | null;
  created_at: string;
  changeRequests: ChangeRequest[];
  totalEstimate: number;
  /** Hours ERP VERS has approved. Clients only count what was sent to them; admins and freelancers also count approved hours not sent yet. */
  reviewedHours: number;
  /** Freelancer hours not yet reviewed by ERP VERS. Zero for clients. */
  pendingHours: number;
  /** Extra hours asked for but not approved by the client yet. Clients see only what was sent to them. */
  waitingChangeHours: number;
  /** Admins see everyone with their rate and hours; a freelancer sees only themselves; clients see nobody. */
  assignees: { user_id: string; full_name: string; hourly_rate_inr: number | null; allocated_hours: number }[];
  /** Hours handed out to freelancers (admin view: everyone; freelancer view: their own). */
  allocatedHours: number;
};
export type MonthUsage = { month: string; hours: number };
export type BillingBasis = "logged" | "budget";
export type ClientRates = {
  currency: string;
  hourly_rate: number | null;
  inr_per_unit: number | null;
  /** Tax deducted at source, as a percentage of what the client pays. */
  tds_pct: number;
  /** budget: the client pays for the approved budget. logged: for hours logged. */
  billing_basis: BillingBasis;
};

export type DashboardData = {
  client: Client;
  purchases: Purchase[];
  /** Hour budgets across tasks: approved by the client, waiting for them, and used. */
  budget: { approved: number; waiting: number; used: number; remaining: number; tasks: number };
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

export const LOGIN_PATHS = {
  client: "/portal/login",
  employee: "/portal/login/employee",
  admin: "/portal/login/admin",
} as const;
export type LoginAudience = keyof typeof LOGIN_PATHS;

export async function requireUser(audience: LoginAudience = "client") {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATHS[audience]);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("admin");
  if (!(await getIsAdmin())) redirect("/portal");
  return user;
}

export async function requireFreelancer() {
  await requireUser("employee");
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
      "id, client_id, title, description, estimate_hours, status, budget_status, budget_notified_at, created_at, " +
        "change_requests(id, task_id, title, description, hours, requested_on, status, requested_by_name, review_note, client_notified_at), " +
        "task_assignments(user_id, hourly_rate_inr, allocated_hours, freelancers(full_name))",
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
    id: string; client_id: string; title: string; description: string | null; estimate_hours: number; status: "open" | "done";
    budget_status: BudgetStatus; budget_notified_at: string | null; created_at: string;
    change_requests: ChangeRequest[] | null;
    task_assignments: { user_id: string; hourly_rate_inr: number | null; allocated_hours: number; freelancers: { full_name: string } | null }[] | null;
  };

  return ((tasksRes.data ?? []) as unknown as Row[]).map((t) => {
    const u = usage.get(t.id);
    const assignees = (t.task_assignments ?? []).map((a) => ({
      user_id: a.user_id,
      full_name: a.freelancers?.full_name ?? "Freelancer",
      hourly_rate_inr: a.hourly_rate_inr == null ? null : Number(a.hourly_rate_inr),
      allocated_hours: Number(a.allocated_hours ?? 0),
    }));
    return {
      id: t.id,
      client_id: t.client_id,
      title: t.title,
      description: t.description,
      estimate_hours: Number(t.estimate_hours),
      status: t.status,
      budget_status: t.budget_status,
      budget_notified_at: t.budget_notified_at,
      created_at: t.created_at,
      changeRequests: (t.change_requests ?? [])
        .map((c) => ({ ...c, hours: Number(c.hours) }))
        .sort((a, b) => a.requested_on.localeCompare(b.requested_on)),
      totalEstimate: Number(u?.total_estimate ?? t.estimate_hours),
      reviewedHours: Number(u?.reviewed_hours ?? 0),
      pendingHours: Number(u?.pending_hours ?? 0),
      waitingChangeHours: Number(u?.waiting_change_hours ?? 0),
      assignees,
      allocatedHours: round(assignees.reduce((s, a) => s + a.allocated_hours, 0)),
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
  const approvedTasks = tasks.filter((t) => t.budget_status === "approved");
  const approvedBudget = round(approvedTasks.reduce((s, t) => s + t.totalEstimate, 0));
  const budgetUsed = round(approvedTasks.reduce((s, t) => s + t.reviewedHours, 0));

  return {
    client,
    purchases,
    budget: {
      approved: approvedBudget,
      waiting: round(tasks.filter((t) => t.budget_status === "pending_client").reduce((s, t) => s + t.totalEstimate, 0)),
      used: budgetUsed,
      remaining: round(approvedBudget - budgetUsed),
      tasks: approvedTasks.length,
    },
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
  /** Hours ERP VERS gave this freelancer on the task, and how many they have left. */
  myAllocatedHours: number;
  myRemainingHours: number;
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
    const allocated = t.assignees.find((a) => a.user_id === user.id)?.allocated_hours ?? 0;
    return {
      ...t,
      client_name: names.get(t.client_id) ?? "Client",
      myAllocatedHours: allocated,
      myRemainingHours: round(Math.max(allocated - accepted - waiting, 0)),
      rateInr: rate,
      myAcceptedHours: accepted,
      myWaitingHours: waiting,
      earnedInr: rate == null ? null : round(accepted * rate),
      waitingInr: rate == null ? null : round(waiting * rate),
    };
  });
  const sumOf = (k: "earnedInr" | "waitingInr") => round(myTasks.reduce((s, t) => s + (t[k] ?? 0), 0));
  const requestsRes = await supabase
    .from("hour_requests")
    .select("id, task_id, hours, reason, status, granted_hours, review_note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (requestsRes.error) throw requestsRes.error;
  return {
    tasks: myTasks as FreelancerTask[],
    hourRequests: (requestsRes.data ?? []).map((r) => ({
      ...r,
      hours: Number(r.hours),
      granted_hours: r.granted_hours == null ? null : Number(r.granted_hours),
    })) as HourRequest[],
    entries,
    earnings: {
      earnedInr: sumOf("earnedInr"),
      waitingInr: sumOf("waitingInr"),
      missingRate: myTasks.some((t) => t.rateInr == null && t.myAcceptedHours + t.myWaitingHours > 0),
    },
  };
}

export type HourRequest = {
  id: string;
  task_id: string;
  hours: number;
  reason: string;
  status: "requested" | "granted" | "declined";
  granted_hours: number | null;
  review_note: string | null;
  created_at: string;
};
export type HourRequestReview = HourRequest & {
  user_id: string;
  freelancer_name: string;
  task_title: string;
  client_id: string;
  client_name: string;
  /** The freelancer's current hours on the task, and what ERP VERS has not handed out yet. */
  allocated: number;
  reserve: number;
};

/** Freelancers asking ERP VERS for more hours. Admin-only through RLS. */
export const getHourRequestQueue = cache(async (): Promise<HourRequestReview[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hour_requests")
    .select("id, task_id, user_id, hours, reason, status, granted_hours, review_note, created_at, freelancers(full_name), task:tasks(title, client_id, client:clients(name))")
    .eq("status", "requested")
    .order("created_at");
  if (error) throw error;
  type Row = HourRequest & {
    user_id: string;
    freelancers: { full_name: string } | null;
    task: { title: string; client_id: string; client: { name: string } | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];
  const taskIds = [...new Set(rows.map((r) => r.task_id))];
  const [tasks, assignments] = await Promise.all([
    getTasks().then((all) => all.filter((t) => taskIds.includes(t.id))),
    supabase.from("task_assignments").select("task_id, user_id, allocated_hours").in("task_id", taskIds),
  ]);
  if (assignments.error) throw assignments.error;
  return rows.map(({ freelancers, task, ...r }) => {
    const t = tasks.find((x) => x.id === r.task_id);
    const mine = (assignments.data ?? []).find((a) => a.task_id === r.task_id && a.user_id === r.user_id);
    return {
      ...r,
      hours: Number(r.hours),
      granted_hours: r.granted_hours == null ? null : Number(r.granted_hours),
      freelancer_name: freelancers?.full_name ?? "Freelancer",
      task_title: task?.title ?? "Task",
      client_id: task?.client_id ?? "",
      client_name: task?.client?.name ?? "Client",
      allocated: Number(mine?.allocated_hours ?? 0),
      reserve: t ? round(t.totalEstimate - t.allocatedHours) : 0,
    };
  });
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type ClientOverview = Client & {
  purchased: number;
  used: number;
  remaining: number;
  pendingHours: number;
  /** Approved by ERP VERS, not sent to the client yet. */
  readyToSendHours: number;
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
      readyToSendHours: round(sum("reviewed")),
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
export const getReviewQueue = cache(async (): Promise<ReviewEntry[]> => entriesWithStatus("pending"));

/** Hours ERP VERS approved but hasn't sent to the client yet. */
export const getReadyToSend = cache(async (): Promise<ReviewEntry[]> => entriesWithStatus("reviewed"));

async function entriesWithStatus(status: EntryStatus): Promise<ReviewEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select(`${ENTRY_COLUMNS}, client_id, created_at, client:clients(name)`)
    .eq("status", status)
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
}

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
export const getChangeRequestQueue = cache(async (): Promise<ChangeRequestReview[]> => changeRequestsWithStatus("requested"));

/** Extra hours ERP VERS approved but hasn't sent to the client yet. */
export const getChangesReadyToSend = cache(async (): Promise<ChangeRequestReview[]> => changeRequestsWithStatus("reviewed"));

async function changeRequestsWithStatus(status: ChangeRequestStatus): Promise<ChangeRequestReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("change_requests")
    .select("id, task_id, title, description, hours, requested_on, status, requested_by_name, review_note, client_notified_at, task:tasks(title, client_id, client:clients(name))")
    .eq("status", status)
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
}

/** A client's currency, hourly rate and exchange rate. Admin-only through RLS. */
export async function getClientRates(clientId: string): Promise<ClientRates> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_rates")
    .select("currency, hourly_rate, inr_per_unit, tds_pct, billing_basis")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return {
    currency: data?.currency ?? "USD",
    hourly_rate: data?.hourly_rate == null ? null : Number(data.hourly_rate),
    inr_per_unit: data?.inr_per_unit == null ? null : Number(data.inr_per_unit),
    tds_pct: Number(data?.tds_pct ?? 0),
    billing_basis: data?.billing_basis === "budget" ? "budget" : "logged",
  };
}

export type MoneyRow = {
  /** Hours the client pays for: the approved budget, or hours logged, depending on the billing basis. */
  billedHours: number;
  clientAmount: number | null;
  clientAmountInr: number | null;
  tdsInr: number | null;
  /** Freelancer hours ERP VERS approved, and what they cost at each freelancer's rate on the task. */
  freelancerHours: number;
  freelancerCostInr: number;
  /** Freelancer hours with no rate on the task, so their cost is unknown. */
  unratedHours: number;
  profitInr: number | null;
};
export type TaskMoney = MoneyRow & {
  task_id: string;
  title: string;
  budgetStatus: BudgetStatus | null;
  budgetHours: number;
  allocatedHours: number;
  /** Budget hours not handed out to freelancers: ERP VERS's reserve. */
  reserveHours: number;
  /** Profit once the budget is used: client pays for the budget, freelancers use all their hours. */
  expectedProfitInr: number | null;
};

export type ClientMoney = {
  rates: ClientRates;
  /** Client's price per hour after prepaid discounts (weighted over purchases), in their currency. */
  netRate: number | null;
  prepaidAmount: number | null;
  tasks: TaskMoney[];
  totals: MoneyRow & { budgetHours: number; allocatedHours: number; reserveHours: number; expectedProfitInr: number | null };
};

/**
 * What ERP VERS earns on a client. Revenue is the approved budget or the hours logged (billing basis),
 * at the client's rate; TDS comes off that; freelancer cost is approved hours at each freelancer's rate.
 * Admin-only (reads rates).
 */
export async function getClientMoney(clientId: string, purchases: Purchase[], tasks: Task[]): Promise<ClientMoney> {
  const supabase = await createClient();
  const [rates, entriesRes] = await Promise.all([
    getClientRates(clientId),
    supabase
      .from("time_entries")
      .select("task_id, hours, created_by")
      .eq("client_id", clientId)
      .in("status", ["reviewed", "awaiting_client", "approved"]),
  ]);
  if (entriesRes.error) throw entriesRes.error;

  const priced = purchases.filter((p) => p.hourly_rate != null);
  const pricedHours = priced.reduce((s, p) => s + p.hours, 0);
  const prepaidAmount = priced.length ? round(priced.reduce((s, p) => s + p.hours * p.hourly_rate! * (1 - p.discount_pct / 100), 0)) : null;
  const netRate = pricedHours > 0 ? prepaidAmount! / pricedHours : rates.hourly_rate;
  const toInr = (amount: number | null) => (amount == null || rates.inr_per_unit == null ? null : round(amount * rates.inr_per_unit));
  const tdsOf = (inr: number | null) => (inr == null ? null : round((inr * rates.tds_pct) / 100));

  const rateFor = new Map<string, number | null>();
  for (const t of tasks) for (const a of t.assignees) rateFor.set(`${t.id}:${a.user_id}`, a.hourly_rate_inr);

  const logged = new Map<string, { hours: number; freelancerHours: number; cost: number; unrated: number }>();
  for (const e of (entriesRes.data ?? []) as { task_id: string | null; hours: number; created_by: string | null }[]) {
    const key = e.task_id ?? "none";
    const row = logged.get(key) ?? { hours: 0, freelancerHours: 0, cost: 0, unrated: 0 };
    const hours = Number(e.hours);
    row.hours += hours;
    // Entries you log yourself (or whose author isn't on the task) have no freelancer cost.
    const rate = e.task_id && e.created_by ? rateFor.get(`${e.task_id}:${e.created_by}`) : undefined;
    if (rate !== undefined) {
      row.freelancerHours += hours;
      if (rate == null) row.unrated += hours;
      else row.cost += hours * rate;
    }
    logged.set(key, row);
  }

  const row = (billedHours: number, l: { freelancerHours: number; cost: number; unrated: number }): MoneyRow => {
    const clientAmount = netRate == null ? null : round(billedHours * netRate);
    const clientAmountInr = toInr(clientAmount);
    const tdsInr = tdsOf(clientAmountInr);
    return {
      billedHours: round(billedHours),
      clientAmount,
      clientAmountInr,
      tdsInr,
      freelancerHours: round(l.freelancerHours),
      freelancerCostInr: round(l.cost),
      unratedHours: round(l.unrated),
      profitInr: clientAmountInr == null ? null : round(clientAmountInr - (tdsInr ?? 0) - l.cost),
    };
  };

  const empty = { hours: 0, freelancerHours: 0, cost: 0, unrated: 0 };
  const rows: TaskMoney[] = tasks.map((t) => {
    const l = logged.get(t.id) ?? empty;
    const budgetHours = t.budget_status === "approved" ? t.totalEstimate : 0;
    const billed = rates.billing_basis === "budget" ? budgetHours : l.hours;
    // Expected: the client pays for the whole budget and every freelancer uses all their hours.
    const plannedCost = t.assignees.reduce((s, a) => s + a.allocated_hours * (a.hourly_rate_inr ?? 0), 0);
    const budgetInr = toInr(netRate == null ? null : round(t.totalEstimate * netRate));
    return {
      task_id: t.id,
      title: t.title,
      budgetStatus: t.budget_status,
      budgetHours: t.totalEstimate,
      allocatedHours: t.allocatedHours,
      reserveHours: round(t.totalEstimate - t.allocatedHours),
      expectedProfitInr: budgetInr == null ? null : round(budgetInr - (tdsOf(budgetInr) ?? 0) - plannedCost),
      ...row(billed, l),
    };
  });
  const none = logged.get("none");
  if (none && rates.billing_basis === "logged") {
    rows.push({
      task_id: "none",
      title: "Not linked to a task",
      budgetStatus: null,
      budgetHours: 0,
      allocatedHours: 0,
      reserveHours: 0,
      expectedProfitInr: null,
      ...row(none.hours, none),
    });
  }

  const sum = (k: "billedHours" | "freelancerHours" | "freelancerCostInr" | "unratedHours" | "budgetHours" | "allocatedHours" | "reserveHours") =>
    round(rows.reduce((s, r) => s + r[k], 0));
  const sumNullable = (k: "clientAmount" | "clientAmountInr" | "tdsInr" | "profitInr" | "expectedProfitInr") =>
    rows.some((r) => r[k] == null && (k !== "expectedProfitInr" || r.task_id !== "none")) ? null : round(rows.reduce((s, r) => s + (r[k] ?? 0), 0));
  return {
    rates,
    netRate: netRate == null ? null : round(netRate),
    prepaidAmount,
    tasks: rows,
    totals: {
      billedHours: sum("billedHours"),
      clientAmount: sumNullable("clientAmount"),
      clientAmountInr: sumNullable("clientAmountInr"),
      tdsInr: sumNullable("tdsInr"),
      freelancerHours: sum("freelancerHours"),
      freelancerCostInr: sum("freelancerCostInr"),
      unratedHours: sum("unratedHours"),
      profitInr: sumNullable("profitInr"),
      budgetHours: sum("budgetHours"),
      allocatedHours: sum("allocatedHours"),
      reserveHours: sum("reserveHours"),
      expectedProfitInr: sumNullable("expectedProfitInr"),
    },
  };
}
