import type { Transaction } from "@/types";
import { monthOf } from "@/lib/format";

export interface Kpis {
  incomeCents: number;
  expenseCents: number; // positive magnitude
  netCents: number;
  savingsRatePct: number;
}

/** Only visible, categorized transactions participate (FR-028). */
function isCounted(t: Transaction, visible: Set<string>): boolean {
  return t.category !== null && visible.has(t.category);
}

/**
 * Income/expense/net/savings-rate KPIs (FR-013). Income = income-class sums,
 * expenses = expense-class magnitude; transfers and uncategorized excluded.
 */
export function computeKpis(
  txns: Transaction[],
  visible: Set<string>,
): Kpis {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const t of txns) {
    if (!isCounted(t, visible)) continue;
    if (t.class === "income") incomeCents += t.amountCents;
    else if (t.class === "expense") expenseCents += -t.amountCents;
  }
  const netCents = incomeCents - expenseCents;
  const savingsRatePct =
    incomeCents > 0
      ? Math.round((netCents / incomeCents) * 1000) / 10
      : 0;
  return { incomeCents, expenseCents, netCents, savingsRatePct };
}

export interface CategorySpend {
  category: string;
  cents: number; // positive magnitude
}

/** Expense spend per category (donut + quick-spend), visible only. */
export function categorySpend(
  txns: Transaction[],
  visible: Set<string>,
): CategorySpend[] {
  const map = new Map<string, number>();
  for (const t of txns) {
    if (!isCounted(t, visible)) continue;
    if (t.class !== "expense") continue;
    map.set(t.category!, (map.get(t.category!) ?? 0) + -t.amountCents);
  }
  return [...map.entries()]
    .map(([category, cents]) => ({ category, cents }))
    .sort((a, b) => b.cents - a.cents);
}

/** Spend for a single category over the given transactions (quick-spend). */
export function spendForCategory(
  txns: Transaction[],
  category: string,
): number {
  let cents = 0;
  for (const t of txns) {
    if (t.category === category && t.class === "expense") {
      cents += -t.amountCents;
    }
  }
  return cents;
}

export interface MonthlyFlow {
  month: string; // YYYY-MM
  incomeCents: number; // positive
  expenseCents: number; // positive magnitude
  netCents: number; // income - expense (signed)
}

/** Monthly income/expense/net series (cash-flow chart, FR-015). */
export function monthlyFlows(
  txns: Transaction[],
  visible: Set<string>,
): MonthlyFlow[] {
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const t of txns) {
    if (!isCounted(t, visible)) continue;
    if (t.class !== "income" && t.class !== "expense") continue;
    const m = monthOf(t.date);
    const row = byMonth.get(m) ?? { income: 0, expense: 0 };
    if (t.class === "income") row.income += t.amountCents;
    else row.expense += -t.amountCents;
    byMonth.set(m, row);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, { income, expense }]) => ({
      month,
      incomeCents: income,
      expenseCents: expense,
      netCents: income - expense,
    }));
}

export interface MerchantSpend {
  merchant: string;
  merchantLower: string;
  count: number;
  cents: number; // positive magnitude
}

/** Top merchants by expense magnitude within the given transactions. */
export function topMerchants(
  txns: Transaction[],
  visible: Set<string>,
  limit = 10,
): MerchantSpend[] {
  const map = new Map<string, MerchantSpend>();
  for (const t of txns) {
    if (!isCounted(t, visible)) continue;
    if (t.class !== "expense") continue;
    const row = map.get(t.merchantLower);
    if (row) {
      row.count += 1;
      row.cents += -t.amountCents;
    } else {
      map.set(t.merchantLower, {
        merchant: t.merchant,
        merchantLower: t.merchantLower,
        count: 1,
        cents: -t.amountCents,
      });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.cents - a.cents)
    .slice(0, limit);
}
