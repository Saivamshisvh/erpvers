/** Prepaid hour discount tiers, as advertised on the Services page. */
export const PREPAID_TIERS = [
  { minHours: 201, discountPct: 20, label: "200+ hrs" },
  { minHours: 200, discountPct: 18, label: "200 hrs" },
  { minHours: 150, discountPct: 15, label: "150 hrs" },
  { minHours: 100, discountPct: 10, label: "100 hrs" },
] as const;

/** Discount for a prepaid block of `hours`. Blocks under 100 hours get no discount. */
export function discountForHours(hours: number) {
  return PREPAID_TIERS.find((tier) => hours >= tier.minHours)?.discountPct ?? 0;
}
