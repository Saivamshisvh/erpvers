import { formatHours, formatMonth, formatMonthYear } from "@/lib/portal/format";
import type { MonthUsage } from "@/lib/portal/data";

/** Round the axis top up to a friendly number so gridlines land on clean values. */
function niceMax(value: number) {
  if (value <= 0) return 10;
  const steps = [10, 20, 30, 40, 50, 60, 80, 100, 120, 160, 200, 300, 400, 500, 600, 800, 1000];
  return steps.find((s) => s >= value) ?? Math.ceil(value / 200) * 200;
}

export default function UsageChart({ data }: { data: MonthUsage[] }) {
  const max = niceMax(Math.max(...data.map((d) => d.hours)));
  const gridlines = [max, max / 2, 0];
  const total = data.reduce((sum, d) => sum + d.hours, 0);

  return (
    <figure>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <figcaption className="text-base font-bold tracking-tight text-slate-950">Hours used per month</figcaption>
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{formatHours(total)}</span> hrs in the last {data.length} months
        </p>
      </div>

      <div className="mt-6 grid grid-cols-[auto_1fr] gap-x-3" aria-hidden="true">
        {/* Y axis labels */}
        <div className="relative h-44 w-8 text-right text-[11px] tabular-nums text-slate-400">
          {gridlines.map((g) => (
            <span key={g} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (g / max) * 100}%` }}>
              {formatHours(g)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative h-44">
          {gridlines.map((g) => (
            <div
              key={g}
              className={`absolute inset-x-0 border-t ${g === 0 ? "border-slate-300" : "border-dashed border-slate-200"}`}
              style={{ top: `${100 - (g / max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-2 sm:gap-4">
            {data.map((d, index) => {
              const pct = (d.hours / max) * 100;
              // Keep the tooltip inside the chart: early months open to the right, later months to the left.
              const align = index < data.length / 2 ? "left-0" : "right-0";
              return (
                <div key={d.month} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none">
                  {d.hours > 0 && (
                    <div
                      className="w-full max-w-12 rounded-t-[4px] bg-blue-600 transition-colors group-hover:bg-blue-700 group-focus-visible:bg-blue-700"
                      style={{ height: `max(${pct}%, 2px)` }}
                    />
                  )}
                  <div
                    className={`pointer-events-none absolute ${align} z-10 -translate-y-2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100`}
                    style={{ bottom: `${Math.max(pct, 0)}%` }}
                  >
                    {formatMonthYear(d.month)}: {formatHours(d.hours)} hrs
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X axis labels */}
        <div />
        <div className="mt-2 flex gap-2 sm:gap-4">
          {data.map((d) => (
            <span key={d.month} className="flex-1 text-center text-xs font-medium text-slate-500">
              {formatMonth(d.month)}
            </span>
          ))}
        </div>
      </div>

      {/* Same numbers as a table for screen readers */}
      <table className="sr-only">
        <caption>Hours used per month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Hours</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{formatMonthYear(d.month)}</td>
              <td>{formatHours(d.hours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
