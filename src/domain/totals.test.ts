import { describe, it, expect } from "vitest";
import {
  computeKpis,
  categorySpend,
  spendForCategory,
  monthlyFlows,
  topMerchants,
} from "./totals";
import type { Transaction } from "@/types";

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(),
    date: "2024-03-10",
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

const visible = new Set(["Palkka", "Ruoka", "Bensa", "Sijoitus"]);

const data: Transaction[] = [
  tx({ amountCents: 300000, category: "Palkka", class: "income" }),
  tx({ amountCents: -50000, category: "Ruoka", class: "expense" }),
  tx({ amountCents: -20000, category: "Bensa", class: "expense" }),
  // Included transfer: counts by SIGN (no class-based exclusion).
  tx({ amountCents: -100000, category: "Sijoitus", class: "transfer" }),
  // Not in the visible set -> excluded by the Asetukset toggle.
  tx({ amountCents: -9999, category: "Salattu", class: "expense" }),
];

describe("computeKpis", () => {
  it("computes income/expenses/net; only the visibility toggle excludes", () => {
    const k = computeKpis(data, visible);
    expect(k.incomeCents).toBe(300000);
    expect(k.expenseCents).toBe(170000); // 500 + 200 + 1000 (transfer by sign)
    expect(k.netCents).toBe(130000);
    expect(k.savingsRatePct).toBeCloseTo(43.3, 1);
  });

  it("excludes a transfer category when it is toggled off", () => {
    const withoutSijoitus = new Set(["Palkka", "Ruoka", "Bensa"]);
    const k = computeKpis(data, withoutSijoitus);
    expect(k.expenseCents).toBe(70000);
    expect(k.netCents).toBe(230000);
  });

  it("counts a positive transfer as income by sign", () => {
    const k = computeKpis(
      [tx({ amountCents: 50000, category: "Sijoitus", class: "transfer" })],
      visible,
    );
    expect(k.incomeCents).toBe(50000);
    expect(k.expenseCents).toBe(0);
  });

  it("handles empty income without dividing by zero", () => {
    const k = computeKpis([], visible);
    expect(k).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      savingsRatePct: 0,
    });
  });
});

describe("categorySpend", () => {
  it("aggregates expense-direction magnitude per included category", () => {
    const spend = categorySpend(data, visible);
    expect(spend).toEqual([
      { category: "Sijoitus", cents: 100000 },
      { category: "Ruoka", cents: 50000 },
      { category: "Bensa", cents: 20000 },
    ]);
  });
});

describe("spendForCategory", () => {
  it("sums expense spend for one category", () => {
    expect(spendForCategory(data, "Ruoka")).toBe(50000);
    expect(spendForCategory(data, "Palkka")).toBe(0);
  });
});

describe("monthlyFlows", () => {
  it("aggregates income/expense/net per month, sorted", () => {
    const series = monthlyFlows(
      [
        tx({ date: "2024-01-15", amountCents: 100000, category: "Palkka", class: "income" }),
        tx({ date: "2024-01-20", amountCents: -30000, category: "Ruoka", class: "expense" }),
        tx({ date: "2024-02-10", amountCents: -40000, category: "Ruoka", class: "expense" }),
      ],
      visible,
    );
    expect(series).toEqual([
      { month: "2024-01", incomeCents: 100000, expenseCents: 30000, netCents: 70000 },
      { month: "2024-02", incomeCents: 0, expenseCents: 40000, netCents: -40000 },
    ]);
  });
});

describe("topMerchants", () => {
  it("ranks merchants by expense magnitude with counts", () => {
    const txns = [
      tx({ amountCents: -2000, merchant: "Prisma", merchantLower: "prisma", category: "Ruoka", class: "expense" }),
      tx({ amountCents: -3000, merchant: "Prisma", merchantLower: "prisma", category: "Ruoka", class: "expense" }),
      tx({ amountCents: -4000, merchant: "Neste", merchantLower: "neste", category: "Bensa", class: "expense" }),
      tx({ amountCents: 100000, merchant: "Työ", merchantLower: "työ", category: "Palkka", class: "income" }),
    ];
    expect(topMerchants(txns, visible)).toEqual([
      { merchant: "Prisma", merchantLower: "prisma", count: 2, cents: 5000 },
      { merchant: "Neste", merchantLower: "neste", count: 1, cents: 4000 },
    ]);
  });

  it("respects the limit", () => {
    const txns = [
      tx({ amountCents: -100, merchant: "A", merchantLower: "a", category: "Ruoka", class: "expense" }),
      tx({ amountCents: -200, merchant: "B", merchantLower: "b", category: "Ruoka", class: "expense" }),
    ];
    expect(topMerchants(txns, visible, 1)).toHaveLength(1);
    expect(topMerchants(txns, visible, 1)[0].merchant).toBe("B");
  });
});
