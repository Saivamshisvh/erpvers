import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isPortalConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type Client = { id: string; name: string; low_balance_hours: number; created_at: string };
export type Purchase = { id: string; hours: number; discount_pct: number; purchased_on: string; reference: string | null };
export type TimeEntry = { id: string; work_date: string; consultant: string; description: string; hours: number };
export type Member = { user_id: string; email: string };

export type MonthUsage = { month: string; hours: number };

export type DashboardData = {
  client: Client;
  purchases: Purchase[];
  entries: TimeEntry[];
  members: Member[];
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

/** Companies the current user can see. Row level security does the filtering. */
export async function getVisibleClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("id, name, low_balance_hours, created_at").order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, low_balance_hours: Number(c.low_balance_hours) }));
}

const toNumber = <T extends { hours: number }>(row: T) => ({ ...row, hours: Number(row.hours) });

export async function getDashboardData(clientId: string): Promise<DashboardData | null> {
  const supabase = await createClient();
  const [clientRes, purchasesRes, entriesRes, membersRes] = await Promise.all([
    supabase.from("clients").select("id, name, low_balance_hours, created_at").eq("id", clientId).maybeSingle(),
    supabase
      .from("hour_purchases")
      .select("id, hours, discount_pct, purchased_on, reference")
      .eq("client_id", clientId)
      .order("purchased_on", { ascending: false }),
    supabase
      .from("time_entries")
      .select("id, work_date, consultant, description, hours")
      .eq("client_id", clientId)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("client_members").select("user_id, email").eq("client_id", clientId).order("email"),
  ]);

  for (const res of [clientRes, purchasesRes, entriesRes, membersRes]) if (res.error) throw res.error;
  if (!clientRes.data) return null;

  const client = { ...clientRes.data, low_balance_hours: Number(clientRes.data.low_balance_hours) };
  const purchases = (purchasesRes.data ?? []).map((p) => ({ ...toNumber(p), discount_pct: Number(p.discount_pct) }));
  const entries = (entriesRes.data ?? []).map(toNumber);
  const members = membersRes.data ?? [];

  const round = (n: number) => Math.round(n * 100) / 100;
  const purchased = round(purchases.reduce((sum, p) => sum + p.hours, 0));
  const used = round(entries.reduce((sum, e) => sum + e.hours, 0));
  const remaining = round(purchased - used);

  return {
    client,
    purchases,
    entries,
    members,
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
  return keys.map((month) => ({ month, hours: Math.round((totals.get(month) ?? 0) * 100) / 100 }));
}

export type ClientOverview = Client & { purchased: number; used: number; remaining: number; lastEntryDate: string | null };

/** Every client with their balance, for the admin list. Admin-only through RLS. */
export async function getAdminOverview(): Promise<ClientOverview[]> {
  const supabase = await createClient();
  const [clients, purchasesRes, entriesRes] = await Promise.all([
    getVisibleClients(),
    supabase.from("hour_purchases").select("client_id, hours"),
    supabase.from("time_entries").select("client_id, hours, work_date"),
  ]);
  if (purchasesRes.error) throw purchasesRes.error;
  if (entriesRes.error) throw entriesRes.error;

  return clients.map((c) => {
    const purchased = (purchasesRes.data ?? []).filter((p) => p.client_id === c.id).reduce((s, p) => s + Number(p.hours), 0);
    const mine = (entriesRes.data ?? []).filter((e) => e.client_id === c.id);
    const used = mine.reduce((s, e) => s + Number(e.hours), 0);
    const lastEntryDate = mine.map((e) => e.work_date).sort().at(-1) ?? null;
    const round = (n: number) => Math.round(n * 100) / 100;
    return { ...c, purchased: round(purchased), used: round(used), remaining: round(purchased - used), lastEntryDate };
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
