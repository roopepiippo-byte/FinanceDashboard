import type { Transaction } from "@/types";
import { monthOf } from "@/lib/format";
import { flowDirection } from "@/domain/totals";
import { divideCents } from "@/domain/money";

/**
 * Analysis helpers for the Analyysi page. All money in integer cents.
 * "Included" = categorized + visible (same inclusion rule as the KPIs),
 * except where noted (recurring detection looks at ALL categorized rows —
 * commitments like vastike matter even when excluded from KPI math).
 */

function isIncluded(t: Transaction, visible: Set<string>): boolean {
  return t.category !== null && visible.has(t.category);
}

/** Distinct sorted YYYY-MM months among included transactions. */
export function dataMonths(
  txns: Transaction[],
  visible: Set<string>,
): string[] {
  const s = new Set<string>();
  for (const t of txns) if (isIncluded(t, visible)) s.add(monthOf(t.date));
  return [...s].sort();
}

/** Expense-direction cents per category for one month. */
function monthSpend(
  txns: Transaction[],
  visible: Set<string>,
  month: string,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of txns) {
    if (!isIncluded(t, visible)) continue;
    if (monthOf(t.date) !== month) continue;
    if (flowDirection(t) !== "expense") continue;
    m.set(t.category!, (m.get(t.category!) ?? 0) - t.amountCents);
  }
  return m;
}

export interface MoverRow {
  category: string;
  currentCents: number;
  prevCents: number;
  avgCents: number; // mean over up to `avgWindow` data months before `month`
  deltaPrevCents: number; // current - prev
  deltaAvgCents: number; // current - avg
}

/**
 * Month-over-month movers: per-category expense for `month` compared to the
 * previous data month and to the average of preceding data months.
 */
export function monthMovers(
  txns: Transaction[],
  visible: Set<string>,
  month: string,
  avgWindow = 12,
): MoverRow[] {
  const months = dataMonths(txns, visible);
  const idx = months.indexOf(month);
  const prevMonth = idx > 0 ? months[idx - 1] : null;
  const windowMonths = months.slice(Math.max(0, idx - avgWindow), idx);

  const current = monthSpend(txns, visible, month);
  const prev = prevMonth
    ? monthSpend(txns, visible, prevMonth)
    : new Map<string, number>();

  const windowTotals = new Map<string, number>();
  for (const m of windowMonths) {
    for (const [cat, cents] of monthSpend(txns, visible, m)) {
      windowTotals.set(cat, (windowTotals.get(cat) ?? 0) + cents);
    }
  }

  const cats = new Set([
    ...current.keys(),
    ...prev.keys(),
    ...windowTotals.keys(),
  ]);
  return [...cats]
    .map((category) => {
      const currentCents = current.get(category) ?? 0;
      const prevCents = prev.get(category) ?? 0;
      const avgCents =
        windowMonths.length > 0
          ? divideCents(windowTotals.get(category) ?? 0, windowMonths.length)
          : 0;
      return {
        category,
        currentCents,
        prevCents,
        avgCents,
        deltaPrevCents: currentCents - prevCents,
        deltaAvgCents: currentCents - avgCents,
      };
    })
    .sort((a, b) => b.deltaPrevCents - a.deltaPrevCents);
}

export interface RecurringCharge {
  merchant: string;
  merchantLower: string;
  category: string;
  occurrences: number;
  medianIntervalDays: number;
  lastDate: string;
  lastAmountCents: number;
  /** Estimated monthly cost (median charge). */
  monthlyCents: number;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Detect monthly recurring charges: same merchant, ~monthly cadence,
 * stable amount. Considers ALL categorized expense-direction transactions
 * (visibility toggles don't hide commitments like vastike or loan payments).
 */
export function detectRecurring(txns: Transaction[]): RecurringCharge[] {
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of txns) {
    if (t.category === null) continue;
    if (flowDirection(t) !== "expense") continue;
    const list = byMerchant.get(t.merchantLower) ?? [];
    list.push(t);
    byMerchant.set(t.merchantLower, list);
  }

  const out: RecurringCharge[] = [];
  for (const list of byMerchant.values()) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const times = sorted.map((t) => new Date(t.date).getTime());
    const intervals: number[] = [];
    for (let i = 1; i < times.length; i++) {
      intervals.push(Math.round((times[i] - times[i - 1]) / DAY));
    }
    const medInterval = median(intervals);
    if (medInterval < 24 || medInterval > 45) continue;
    // Cadence regularity: most intervals near the median.
    const regular =
      intervals.filter((d) => Math.abs(d - medInterval) <= 10).length /
      intervals.length;
    if (regular < 0.6) continue;
    // Amount stability: median absolute deviation within 30 % of median.
    const amounts = sorted.map((t) => Math.abs(t.amountCents));
    const medAmount = median(amounts);
    if (medAmount === 0) continue;
    const mad = median(amounts.map((a) => Math.abs(a - medAmount)));
    if (mad / medAmount > 0.3) continue;

    const last = sorted[sorted.length - 1];
    out.push({
      merchant: last.merchant,
      merchantLower: last.merchantLower,
      category: last.category!,
      occurrences: sorted.length,
      medianIntervalDays: medInterval,
      lastDate: last.date,
      lastAmountCents: Math.abs(last.amountCents),
      monthlyCents: medAmount,
    });
  }
  return out.sort((a, b) => b.monthlyCents - a.monthlyCents);
}

export interface YearComparison {
  year: number;
  prevYear: number;
  /** Months compared (1..N of both years). */
  throughMonth: number;
  rows: {
    category: string;
    currentCents: number;
    prevCents: number;
    deltaCents: number;
  }[];
  currentTotal: number;
  prevTotal: number;
}

/**
 * Year-to-date expense comparison: latest data year Jan..M vs the same
 * months of the previous year. Null when the previous year has no data.
 */
export function yearComparison(
  txns: Transaction[],
  visible: Set<string>,
): YearComparison | null {
  const months = dataMonths(txns, visible);
  if (months.length === 0) return null;
  const latest = months[months.length - 1];
  const year = Number(latest.slice(0, 4));
  const throughMonth = Number(latest.slice(5, 7));
  const prevYear = year - 1;
  if (!months.some((m) => m.startsWith(String(prevYear)))) return null;

  const inWindow = (t: Transaction, y: number) => {
    const ty = Number(t.date.slice(0, 4));
    const tm = Number(t.date.slice(5, 7));
    return ty === y && tm <= throughMonth;
  };

  const current = new Map<string, number>();
  const prev = new Map<string, number>();
  for (const t of txns) {
    if (!isIncluded(t, visible)) continue;
    if (flowDirection(t) !== "expense") continue;
    const cents = -t.amountCents;
    if (inWindow(t, year)) {
      current.set(t.category!, (current.get(t.category!) ?? 0) + cents);
    } else if (inWindow(t, prevYear)) {
      prev.set(t.category!, (prev.get(t.category!) ?? 0) + cents);
    }
  }

  const cats = new Set([...current.keys(), ...prev.keys()]);
  const rows = [...cats]
    .map((category) => {
      const currentCents = current.get(category) ?? 0;
      const prevCents = prev.get(category) ?? 0;
      return { category, currentCents, prevCents, deltaCents: currentCents - prevCents };
    })
    .sort((a, b) => Math.abs(b.deltaCents) - Math.abs(a.deltaCents));

  return {
    year,
    prevYear,
    throughMonth,
    rows,
    currentTotal: rows.reduce((a, r) => a + r.currentCents, 0),
    prevTotal: rows.reduce((a, r) => a + r.prevCents, 0),
  };
}

/** Expense-direction cents for one category across the given months. */
export function categorySeries(
  txns: Transaction[],
  visible: Set<string>,
  category: string,
  months: string[],
): number[] {
  const byMonth = new Map<string, number>();
  for (const t of txns) {
    if (t.category !== category || !visible.has(category)) continue;
    if (flowDirection(t) !== "expense") continue;
    const m = monthOf(t.date);
    byMonth.set(m, (byMonth.get(m) ?? 0) - t.amountCents);
  }
  return months.map((m) => byMonth.get(m) ?? 0);
}

export interface Anomaly {
  category: string;
  month: string;
  cents: number;
  /** Average of the OTHER months in the window. */
  avgCents: number;
  excessCents: number;
}

/**
 * Flag category-months that clearly break the category's own pattern:
 * spend >= `factor` x the average of the other window months AND the excess
 * is at least `minExcessCents` (ignores small-euro noise).
 */
export function detectAnomalies(
  txns: Transaction[],
  visible: Set<string>,
  window = 12,
  factor = 2,
  minExcessCents = 10000,
): Anomaly[] {
  const months = dataMonths(txns, visible).slice(-window);
  if (months.length < 4) return []; // too little history to call anything odd

  const perMonth = months.map((m) => monthSpend(txns, visible, m));
  const cats = new Set<string>();
  for (const m of perMonth) for (const c of m.keys()) cats.add(c);

  const out: Anomaly[] = [];
  for (const category of cats) {
    const series = perMonth.map((m) => m.get(category) ?? 0);
    const total = series.reduce((a, b) => a + b, 0);
    series.forEach((cents, i) => {
      if (cents <= 0) return;
      const avgOthers = divideCents(total - cents, months.length - 1);
      if (cents >= factor * avgOthers && cents - avgOthers >= minExcessCents) {
        out.push({
          category,
          month: months[i],
          cents,
          avgCents: avgOthers,
          excessCents: cents - avgOthers,
        });
      }
    });
  }
  return out.sort((a, b) => b.excessCents - a.excessCents);
}

/**
 * Cumulative included net (income - expense) per calendar month of `year`.
 * Index 0 = January. Months after the latest data month are null (so the
 * current year's line stops where the data stops).
 */
export function cumulativeNetByYear(
  txns: Transaction[],
  visible: Set<string>,
  year: number,
): (number | null)[] {
  const months = dataMonths(txns, visible);
  const latest = months[months.length - 1] ?? "";
  const perMonth = Array(12).fill(0) as number[];
  for (const t of txns) {
    if (!isIncluded(t, visible)) continue;
    if (Number(t.date.slice(0, 4)) !== year) continue;
    const m = Number(t.date.slice(5, 7)) - 1;
    // Net is the signed sum: income adds, expense subtracts, refunds and
    // negative income rows land correctly by sign.
    perMonth[m] += t.amountCents;
  }
  const out: (number | null)[] = [];
  let cum = 0;
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, "0")}`;
    if (latest && key > latest) {
      out.push(null);
      continue;
    }
    cum += perMonth[m];
    out.push(cum);
  }
  return out;
}

export interface PayerRow {
  merchant: string;
  merchantLower: string;
  /** Cents per year — one entry for every year in the dataset. */
  byYear: Record<number, number>;
  totalCents: number;
  count: number;
}

export interface DividendBreakdown {
  /** Every year present in the category's data, ascending. */
  years: number[];
  yearTotals: { year: number; cents: number }[];
  totalCents: number;
  payers: PayerRow[];
}

/**
 * Per-payer breakdown of a (dividend) category, all signs summed as-is.
 * Yhteensä always equals the sum of the per-year columns — every year in
 * the data gets a column.
 */
export function dividendBreakdown(
  txns: Transaction[],
  category = "Osinko",
): DividendBreakdown | null {
  const rows = txns.filter((t) => t.category === category);
  if (rows.length === 0) return null;

  const years = [...new Set(rows.map((t) => Number(t.date.slice(0, 4))))].sort();

  const byPayer = new Map<string, PayerRow>();
  for (const t of rows) {
    const cur = byPayer.get(t.merchantLower) ?? {
      merchant: t.merchant,
      merchantLower: t.merchantLower,
      byYear: Object.fromEntries(years.map((y) => [y, 0])),
      totalCents: 0,
      count: 0,
    };
    const y = Number(t.date.slice(0, 4));
    cur.byYear[y] += t.amountCents;
    cur.totalCents += t.amountCents;
    cur.count += 1;
    byPayer.set(t.merchantLower, cur);
  }

  const yearTotals = years.map((y) => ({
    year: y,
    cents: rows
      .filter((t) => Number(t.date.slice(0, 4)) === y)
      .reduce((a, t) => a + t.amountCents, 0),
  }));

  return {
    years,
    yearTotals,
    totalCents: yearTotals.reduce((a, y) => a + y.cents, 0),
    payers: [...byPayer.values()].sort((a, b) => b.totalCents - a.totalCents),
  };
}

/** Top-N expense categories over the given months (by total spend). */
export function topCategories(
  txns: Transaction[],
  visible: Set<string>,
  months: string[],
  n: number,
): string[] {
  const window = new Set(months);
  const totals = new Map<string, number>();
  for (const t of txns) {
    if (!isIncluded(t, visible)) continue;
    if (flowDirection(t) !== "expense") continue;
    if (!window.has(monthOf(t.date))) continue;
    totals.set(t.category!, (totals.get(t.category!) ?? 0) - t.amountCents);
  }
  return [...totals.entries()]
    .filter(([, cents]) => cents > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([c]) => c);
}
