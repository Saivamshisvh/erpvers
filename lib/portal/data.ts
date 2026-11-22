import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isPortalConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type Client = { id: string; name: string; low_balance_hours: number; created_at: string };
export type Purchase = { id: string; hours: number; discount_pct: number; purchased_on: string; reference: string | null };
export type EntryStatus = "pending" | "approved" | "rejected";
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
export type ChangeRequest = { id: string; task_id: string; title: string; description: string | null; hours: number; requested_on: string };
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
  approvedHours: number;
  pendingHours: number;
  assignees: { user_id: string; full_name: string }[];
};
export type MonthUsage = { month: string; hours: number };

export type DashboardData = {
  client: Client;
  purchases: Purchase[];
  /** Approved entries only: what the client sees and what counts against the balance. */
  entries: TimeEntry[];
  members: Member[];
  tasks: Task[];
  summary: {
    purchased: number;
    used: number;
    remaining: number;
    usedPct: number;
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
    .select("id, client_id, title, description, estimate_hours, status, created_at, change_requests(id, task_id, title, description, hours, requested_on), task_assignments(user_id, freelancers(full_name))")
    .order("status")
    .order("created_at");
  if (clientId) taskQuery = taskQuery.eq("client_id", clientId);

  const [tasksRes, usageRes] = await Promise.all([taskQuery, supabase.rpc("task_usage", { p_client_id: clientId ?? null })]);
  if (tasksRes.error) throw tasksRes.error;
  if (usageRes.error) throw usageRes.error;

  const usage = new Map(
    ((usageRes.data ?? []) as { task_id: string; total_estimate: number; approved_hours: number; pending_hours: number }[]).map((u) => [u.task_id, u]),
  );

  type Row = {
    id: string; client_id: string; title: string; description: string | null; estimate_hours: number; status: "open" | "done"; created_at: string;
    change_requests: ChangeRequest[] | null;
    task_assignments: { user_id: string; freelancers: { full_name: string } | null }[] | null;
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
      approvedHours: Number(u?.approved_hours ?? 0),
      pendingHours: Number(u?.pending_hours ?? 0),
      assignees: (t.task_assignments ?? []).map((a) => ({ user_id: a.user_id, full_name: a.freelancers?.full_name ?? "Freelancer" })),
    };
  });
}

export async function getDashboardData(clientId: string): Promise<DashboardData | null> {
  const supabase = await createClient();
  const [clientRes, purchasesRes, entriesRes, membersRes, tasks] = await Promise.all([
    supabase.from("clients").select("id, name, low_balance_hours, created_at").eq("id", clientId).maybeSingle(),
    supabase
      .from("hour_purchases")
      .select("id, hours, discount_pct, purchased_on, reference")
      .eq("client_id", clientId)
      .order("purchased_on", { ascending: false }),
    supabase
      .from("time_entries")
      .select(ENTRY_COLUMNS)
      .eq("client_id", clientId)
      .eq("status", "approved")
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("client_members").select("user_id, email").eq("client_id", clientId).order("email"),
    getTasks(clientId),
  ]);

  for (const res of [clientRes, purchasesRes, entriesRes, membersRes]) if (res.error) throw res.error;
  if (!clientRes.data) return null;

  const client = { ...clientRes.data, low_balance_hours: Number(clientRes.data.low_balance_hours) };
  const purchases = (purchasesRes.data ?? []).map((p) => ({ ...p, hours: Number(p.hours), discount_pct: Number(p.discount_pct) }));
  const entries = ((entriesRes.data ?? []) as unknown as EntryRow[]).map(toEntry);
  const members = membersRes.data ?? [];

  const purchased = round(purchases.reduce((sum, p) => sum + p.hours, 0));
  const used = round(entries.reduce((sum, e) => sum + e.hours, 0));
  const remaining = round(purchased - used);

  return {
    client,
    purchases,
    entries,
    members,
    tasks,
    summary: {
      purchased,
      used,
      remaining,
      usedPct: purchased > 0 ? Math.min(100, Math.round((used / purchased) * 100)) : 0,
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

export type FreelancerTask = Task & { client_name: string };

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
  return {
    tasks: tasks.map((t) => ({ ...t, client_name: names.get(t.client_id) ?? "Client" })) as FreelancerTask[],
    entries: ((entriesRes.data ?? []) as unknown as EntryRow[]).map(toEntry),
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
    const approved = mine.filter((e) => e.status === "approved");
    const used = approved.reduce((s, e) => s + Number(e.hours), 0);
    const pendingHours = mine.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.hours), 0);
    const lastEntryDate = approved.map((e) => e.work_date).sort().at(-1) ?? null;
    return { ...c, purchased: round(purchased), used: round(used), remaining: round(purchased - used), pendingHours: round(pendingHours), lastEntryDate };
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

export type Freelancer = { user_id: string; email: string; full_name: string; active: boolean; openTasks: number };

export async function getFreelancers(): Promise<{ freelancers: Freelancer[]; invites: { email: string; full_name: string; created_at: string }[] }> {
  const supabase = await createClient();
  const [fRes, iRes, aRes] = await Promise.all([
    supabase.from("freelancers").select("user_id, email, full_name, active").order("full_name"),
    supabase.from("freelancer_invites").select("email, full_name, created_at").order("created_at", { ascending: false }),
    supabase.from("task_assignments").select("user_id, task:tasks(status)"),
  ]);
  for (const r of [fRes, iRes, aRes]) if (r.error) throw r.error;
  const open = new Map<string, number>();
  for (const a of (aRes.data ?? []) as unknown as { user_id: string; task: { status: string } | null }[]) {
    if (a.task?.status === "open") open.set(a.user_id, (open.get(a.user_id) ?? 0) + 1);
  }
  return {
    freelancers: (fRes.data ?? []).map((f) => ({ ...f, openTasks: open.get(f.user_id) ?? 0 })),
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
