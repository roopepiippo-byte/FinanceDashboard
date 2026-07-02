import type { Transaction } from "@/types";
import { monthOf } from "@/lib/format";
import { divideCents, centsFromPct, pctOf } from "@/domain/money";

/** Only visible, categorized transactions participate (FR-028). */
function isCounted(t: Transaction, visible: Set<string>): boolean {
  return t.category !== null && visible.has(t.category);
}

/** Distinct YYYY-MM months present in the data. */
function monthsIn(txns: Transaction[]): string[] {
  return [...new Set(txns.map((t) => monthOf(t.date)))].sort();
}

/** Average monthly income in cents over the last `months` of available data. */
export function avgMonthlyIncomeCents(
  txns: Transaction[],
  visible: Set<string>,
  months = 12,
): number {
  const recent = new Set(monthsIn(txns).slice(-months));
  if (recent.size === 0) return 0;
  let income = 0;
  for (const t of txns) {
    if (!isCounted(t, visible)) continue;
    if (t.class === "income" && recent.has(monthOf(t.date))) {
      income += t.amountCents;
    }
  }
  return divideCents(income, recent.size);
}

export interface CategoryBudgetRow {
  category: string;
  /** 12-month average spend as % of average monthly income. */
  avgPct: number;
  /** Last month's spend as % of that month's income. */
  lastMonthPct: number;
}

/** Per-category history rows for the budget table (visible expense categories). */
export function budgetHistory(
  txns: Transaction[],
  visible: Set<string>,
  months = 12,
): CategoryBudgetRow[] {
  const allMonths = monthsIn(txns);
  const recentMonths = new Set(allMonths.slice(-months));
  const lastMonth = allMonths[allMonths.length - 1];

  const avgIncome = avgMonthlyIncomeCents(txns, visible, months);

  let lastMonthIncome = 0;
  const recentByCat = new Map<string, number>();
  const lastByCat = new Map<string, number>();

  for (const t of txns) {
    if (!isCounted(t, visible)) continue;
    const m = monthOf(t.date);
    if (t.class === "income" && m === lastMonth) lastMonthIncome += t.amountCents;
    if (t.class !== "expense") continue;
    if (recentMonths.has(m)) {
      recentByCat.set(t.category!, (recentByCat.get(t.category!) ?? 0) - t.amountCents);
    }
    if (m === lastMonth) {
      lastByCat.set(t.category!, (lastByCat.get(t.category!) ?? 0) - t.amountCents);
    }
  }

  const monthCount = recentMonths.size || 1;
  const categories = [...recentByCat.keys()].sort((a, b) =>
    (recentByCat.get(b) ?? 0) - (recentByCat.get(a) ?? 0),
  );

  return categories.map((category) => {
    const avgMonthlySpend = divideCents(recentByCat.get(category) ?? 0, monthCount);
    return {
      category,
      avgPct: pctOf(avgMonthlySpend, avgIncome),
      lastMonthPct: pctOf(lastByCat.get(category) ?? 0, lastMonthIncome),
    };
  });
}

/** Convert a target percentage to euros (cents) of average monthly income. */
export function pctToTargetCents(pct: number, avgIncomeCents: number): number {
  return centsFromPct(pct, avgIncomeCents);
}

/** Convert a target euro amount (cents) to a percentage of average income. */
export function targetCentsToPct(cents: number, avgIncomeCents: number): number {
  return pctOf(cents, avgIncomeCents);
}

/** Expense cents per category for a single YYYY-MM month (budget meters). */
export function monthSpendByCategory(
  txns: Transaction[],
  visible: Set<string>,
  month: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of txns) {
    if (!isCounted(t, visible)) continue;
    if (t.class !== "expense" || monthOf(t.date) !== month) continue;
    map.set(t.category!, (map.get(t.category!) ?? 0) - t.amountCents);
  }
  return map;
}

export interface Allocation {
  savingsPct: number;
  allocatedPct: number;
  unallocatedPct: number;
}

/** Income allocation breakdown: savings + category targets + unallocated. */
export function allocation(
  savingsGoalPct: number,
  categoryTargetPcts: number[],
): Allocation {
  const allocatedPct =
    Math.round(categoryTargetPcts.reduce((a, b) => a + b, 0) * 10) / 10;
  const unallocatedPct =
    Math.round((100 - savingsGoalPct - allocatedPct) * 10) / 10;
  return { savingsPct: savingsGoalPct, allocatedPct, unallocatedPct };
}
