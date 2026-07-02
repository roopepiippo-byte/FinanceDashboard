import { describe, it, expect } from "vitest";
import {
  avgMonthlyIncomeCents,
  budgetHistory,
  pctToTargetCents,
  targetCentsToPct,
  allocation,
  monthSpendByCategory,
} from "./budget";
import type { Transaction } from "@/types";

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(),
    date: "2024-01-10",
    amountCents: 0,
    merchant: "x",
    merchantLower: "x",
    balanceCents: null,
    isIncome: false,
    category: null,
    class: null,
    isManualOverride: false,
    sourceFileId: "f",
    ...p,
  };
}

const visible = new Set(["Palkka", "Ruoka"]);

// Two months of data: Jan and Feb 2024.
const data: Transaction[] = [
  tx({ date: "2024-01-05", amountCents: 300000, category: "Palkka", class: "income" }),
  tx({ date: "2024-01-20", amountCents: -60000, category: "Ruoka", class: "expense" }),
  tx({ date: "2024-02-05", amountCents: 300000, category: "Palkka", class: "income" }),
  tx({ date: "2024-02-20", amountCents: -40000, category: "Ruoka", class: "expense" }),
];

describe("avgMonthlyIncomeCents", () => {
  it("averages income across the months present", () => {
    expect(avgMonthlyIncomeCents(data, visible)).toBe(300000);
  });

  it("returns 0 with no data", () => {
    expect(avgMonthlyIncomeCents([], visible)).toBe(0);
  });
});

describe("budgetHistory", () => {
  it("computes avg % and last-month % per category", () => {
    const rows = budgetHistory(data, visible);
    const ruoka = rows.find((r) => r.category === "Ruoka")!;
    // avg monthly spend = (600 + 400)/2 = 500 -> 500/3000 = 16.7%
    expect(ruoka.avgPct).toBeCloseTo(16.7, 1);
    // last month (Feb) spend 400 / income 3000 = 13.3%
    expect(ruoka.lastMonthPct).toBeCloseTo(13.3, 1);
  });
});

describe("pct <-> target cents round-trip", () => {
  it("converts both directions consistently", () => {
    const avg = 300000;
    expect(pctToTargetCents(20, avg)).toBe(60000);
    expect(targetCentsToPct(60000, avg)).toBe(20);
  });
});

describe("monthSpendByCategory", () => {
  it("sums expense cents per category for one month only", () => {
    const spend = monthSpendByCategory(data, visible, "2024-02");
    expect(spend.get("Ruoka")).toBe(40000);
    expect(spend.has("Palkka")).toBe(false); // income excluded
    expect(monthSpendByCategory(data, visible, "2024-03").size).toBe(0);
  });
});

describe("allocation", () => {
  it("splits income into savings / allocated / unallocated", () => {
    expect(allocation(20, [15, 10, 5])).toEqual({
      savingsPct: 20,
      allocatedPct: 30,
      unallocatedPct: 50,
    });
  });
});
