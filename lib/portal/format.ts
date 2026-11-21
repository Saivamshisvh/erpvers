const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Dates are calendar dates ("2026-11-21"), so they are parsed by hand: no time zone can shift them a day.
const parts = (iso: string) => iso.slice(0, 10).split("-").map(Number) as [number, number, number];

/** "2026-11-21" -> "21 Nov 2026" */
export function formatDate(isoDate: string) {
  const [y, m, d] = parts(isoDate);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-11" -> "Nov" */
export function formatMonth(monthKey: string) {
  return MONTHS[Number(monthKey.slice(5, 7)) - 1];
}

/** "2026-11" -> "November 2026" */
export function formatMonthYear(monthKey: string) {
  return `${MONTHS_LONG[Number(monthKey.slice(5, 7)) - 1]} ${monthKey.slice(0, 4)}`;
}

/** 12 -> "12", 7.5 -> "7.5", 7.25 -> "7.25" */
export function formatHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 100) / 100);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
