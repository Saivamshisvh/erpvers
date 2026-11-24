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

/** 1234.5, "USD" -> "$1,234.50"; INR uses Indian grouping ("₹1,23,456"). */
export function formatMoney(amount: number, currency: string) {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Currencies offered for client rates. */
export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "THB"] as const;
