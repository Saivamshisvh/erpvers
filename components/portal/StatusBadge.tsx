import type { EntryStatus } from "@/lib/portal/data";

const styles: Record<EntryStatus, { label: string; cls: string }> = {
  pending: { label: "Waiting review", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 ring-red-200" },
};

export default function StatusBadge({ status }: { status: EntryStatus }) {
  const s = styles[status];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.cls}`}>{s.label}</span>;
}
