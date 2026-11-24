import type { EntryStatus } from "@/lib/portal/data";

type Audience = "client" | "freelancer" | "admin";

const labels: Record<Audience, Record<EntryStatus, string>> = {
  client: { pending: "In review", reviewed: "In review", awaiting_client: "Awaiting your approval", approved: "Approved", rejected: "Rejected" },
  freelancer: { pending: "Waiting review", reviewed: "Approved", awaiting_client: "Sent to client", approved: "Client approved", rejected: "Rejected" },
  admin: { pending: "Waiting review", reviewed: "Approved, not sent", awaiting_client: "Awaiting client", approved: "Client approved", rejected: "Rejected" },
};

const styles: Record<EntryStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  reviewed: "bg-violet-50 text-violet-700 ring-violet-200",
  awaiting_client: "bg-blue-50 text-blue-700 ring-blue-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

export default function StatusBadge({ status, audience = "admin" }: { status: EntryStatus; audience?: Audience }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}>
      {labels[audience][status]}
    </span>
  );
}
