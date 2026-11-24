/** Shown instantly while a portal page loads its data, so switching tabs feels immediate. */
export default function PortalLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-8 h-px w-full bg-slate-200" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-slate-100" style={{ width: `${90 - i * 12}%` }} />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
