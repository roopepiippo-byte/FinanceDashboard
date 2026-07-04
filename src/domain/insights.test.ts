import { describe, it, expect } from "vitest";
import {
  dataMonths,
  monthMovers,
  detectRecurring,
  yearComparison,
  categorySeries,
  topCategories,
  detectAnomalies,
  cumulativeNetByYear,
  dividendBreakdown,
} from "./insights";
import type { Transaction } from "@/types";

let seq = 0;
function tx(p: Partial<Transaction>): Transaction {
  return {
    id: `t${seq++}`,
    date: "2025-01-10",
    amountCents: -1000,
    merchant: "X",
    merchantLower: "x",
    balanceCents: null,
    isIncome: false,
    category: "Ruoka",
    class: "expense",
    isManualOverride: false,
    sourceFileId: "f",
    ...p,
  };
}

const visible = new Set(["Ruoka", "Digi", "Urheilu", "Palkka"]);

describe("dataMonths", () => {
  it("lists distinct included months sorted", () => {
    const months = dataMonths(
      [
        tx({ date: "2025-02-01" }),
        tx({ date: "2025-01-15" }),
        tx({ date: "2025-02-20" }),
        tx({ date: "2025-03-01", category: "Salattu" }), // not visible
      ],
      visible,
    );
    expect(months).toEqual(["2025-01", "2025-02"]);
  });
});

describe("monthMovers", () => {
  const txns = [
    tx({ date: "2025-01-05", amountCents: -10000 }), // Ruoka jan 100
    tx({ date: "2025-02-05", amountCents: -20000 }), // Ruoka feb 200
    tx({ date: "2025-03-05", amountCents: -40000 }), // Ruoka mar 400
    tx({ date: "2025-03-06", amountCents: -5000, category: "Digi" }),
  ];

  it("computes current vs previous month and vs window average", () => {
    const rows = monthMovers(txns, visible, "2025-03");
    const ruoka = rows.find((r) => r.category === "Ruoka")!;
    expect(ruoka.currentCents).toBe(40000);
    expect(ruoka.prevCents).toBe(20000);
    expect(ruoka.deltaPrevCents).toBe(20000);
    expect(ruoka.avgCents).toBe(15000); // (100+200)/2
    expect(ruoka.deltaAvgCents).toBe(25000);
    // Digi appears only in March: delta = full amount.
    const digi = rows.find((r) => r.category === "Digi")!;
    expect(digi.deltaPrevCents).toBe(5000);
  });
});

describe("detectRecurring", () => {
  const netflix = [
    tx({ date: "2025-01-05", amountCents: -1399, merchant: "Netflix", merchantLower: "netflix", category: "Digi" }),
    tx({ date: "2025-02-04", amountCents: -1399, merchant: "Netflix", merchantLower: "netflix", category: "Digi" }),
    tx({ date: "2025-03-06", amountCents: -1399, merchant: "Netflix", merchantLower: "netflix", category: "Digi" }),
    tx({ date: "2025-04-05", amountCents: -1399, merchant: "Netflix", merchantLower: "netflix", category: "Digi" }),
  ];
  const groceries = [
    tx({ date: "2025-01-02", amountCents: -2500, merchant: "Prisma", merchantLower: "prisma" }),
    tx({ date: "2025-01-05", amountCents: -1200, merchant: "Prisma", merchantLower: "prisma" }),
    tx({ date: "2025-01-09", amountCents: -4400, merchant: "Prisma", merchantLower: "prisma" }),
    tx({ date: "2025-01-15", amountCents: -800, merchant: "Prisma", merchantLower: "prisma" }),
  ];
  const padel = [
    tx({ date: "2025-01-10", amountCents: -7600, merchant: "Padel", merchantLower: "padel", category: "Urheilu" }),
    tx({ date: "2025-02-10", amountCents: -51300, merchant: "Padel", merchantLower: "padel", category: "Urheilu" }),
    tx({ date: "2025-03-12", amountCents: -14000, merchant: "Padel", merchantLower: "padel", category: "Urheilu" }),
  ];

  it("finds stable monthly charges and rejects irregular spending", () => {
    const found = detectRecurring([...netflix, ...groceries, ...padel]);
    expect(found.map((f) => f.merchantLower)).toEqual(["netflix"]);
    expect(found[0].monthlyCents).toBe(1399);
    expect(found[0].occurrences).toBe(4);
    expect(found[0].medianIntervalDays).toBeGreaterThanOrEqual(28);
  });

  it("includes categories excluded from KPI visibility (commitments)", () => {
    const vastike = [
      tx({ date: "2025-01-03", amountCents: -35074, merchant: "As Oy", merchantLower: "as oy", category: "Vastike" }),
      tx({ date: "2025-02-03", amountCents: -35074, merchant: "As Oy", merchantLower: "as oy", category: "Vastike" }),
      tx({ date: "2025-03-03", amountCents: -35074, merchant: "As Oy", merchantLower: "as oy", category: "Vastike" }),
    ];
    const found = detectRecurring(vastike);
    expect(found).toHaveLength(1);
    expect(found[0].category).toBe("Vastike");
  });
});

describe("yearComparison", () => {
  it("compares YTD windows of consecutive years", () => {
    const txns = [
      tx({ date: "2025-01-10", amountCents: -10000 }),
      tx({ date: "2025-02-10", amountCents: -10000 }),
      tx({ date: "2025-06-10", amountCents: -99900 }), // outside window (through Feb)
      tx({ date: "2026-01-10", amountCents: -15000 }),
      tx({ date: "2026-02-10", amountCents: -12000 }),
    ];
    const yc = yearComparison(txns, visible)!;
    expect(yc.year).toBe(2026);
    expect(yc.prevYear).toBe(2025);
    expect(yc.throughMonth).toBe(2);
    const ruoka = yc.rows.find((r) => r.category === "Ruoka")!;
    expect(ruoka.currentCents).toBe(27000);
    expect(ruoka.prevCents).toBe(20000); // June excluded from window
    expect(ruoka.deltaCents).toBe(7000);
  });

  it("returns null without previous-year data", () => {
    expect(yearComparison([tx({})], visible)).toBeNull();
  });
});

describe("detectAnomalies", () => {
  it("flags a month far above the category's own average", () => {
    // Ruoka steady 200/mo for 5 months, then a 900 month.
    const txns = [
      ...["01", "02", "03", "04", "05"].map((m) =>
        tx({ date: `2025-${m}-10`, amountCents: -20000 }),
      ),
      tx({ date: "2025-06-10", amountCents: -90000 }),
    ];
    const anomalies = detectAnomalies(txns, visible);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({ category: "Ruoka", month: "2025-06" });
    expect(anomalies[0].avgCents).toBe(20000);
    expect(anomalies[0].excessCents).toBe(70000);
  });

  it("ignores small excesses and short histories", () => {
    const small = [
      ...["01", "02", "03", "04", "05"].map((m) =>
        tx({ date: `2025-${m}-10`, amountCents: -2000 }),
      ),
      tx({ date: "2025-06-10", amountCents: -5000 }), // 2.5x but only 30 EUR over
    ];
    expect(detectAnomalies(small, visible)).toHaveLength(0);
    const short = [
      tx({ date: "2025-01-10", amountCents: -1000 }),
      tx({ date: "2025-02-10", amountCents: -90000 }),
    ];
    expect(detectAnomalies(short, visible)).toHaveLength(0);
  });
});

describe("cumulativeNetByYear", () => {
  it("accumulates signed net and nulls months after the latest data", () => {
    const txns = [
      tx({ date: "2026-01-05", amountCents: 300000, category: "Palkka", class: "income" }),
      tx({ date: "2026-01-20", amountCents: -100000 }),
      tx({ date: "2026-02-20", amountCents: -50000 }),
    ];
    const c = cumulativeNetByYear(txns, visible, 2026);
    expect(c[0]).toBe(200000);
    expect(c[1]).toBe(150000);
    expect(c[2]).toBeNull(); // after latest data month
    expect(c[11]).toBeNull();
  });

  it("fills a fully past year through December", () => {
    const txns = [
      tx({ date: "2025-03-10", amountCents: -10000 }),
      tx({ date: "2026-01-05", amountCents: -1000 }), // makes 2026-01 the latest
    ];
    const c = cumulativeNetByYear(txns, visible, 2025);
    expect(c[2]).toBe(-10000);
    expect(c[11]).toBe(-10000); // carried through year end, no nulls
  });
});

describe("dividendBreakdown", () => {
  it("sums per year and per payer, negatives included as-is", () => {
    const txns = [
      tx({ date: "2025-02-01", amountCents: 84, merchant: "NOKIA OYJ", merchantLower: "nokia oyj", category: "Osinko", class: "income" }),
      tx({ date: "2025-08-01", amountCents: 112, merchant: "NOKIA OYJ", merchantLower: "nokia oyj", category: "Osinko", class: "income" }),
      tx({ date: "2026-03-01", amountCents: 210, merchant: "FISKARS", merchantLower: "fiskars", category: "Osinko", class: "income" }),
      tx({ date: "2026-04-01", amountCents: -100, merchant: "FISKARS", merchantLower: "fiskars", category: "Osinko", class: "income" }),
    ];
    const d = dividendBreakdown(txns)!;
    expect(d.year).toBe(2026);
    expect(d.yearTotals).toEqual([
      { year: 2025, cents: 196 },
      { year: 2026, cents: 110 },
    ]);
    const fiskars = d.payers.find((p) => p.merchantLower === "fiskars")!;
    expect(fiskars.currentCents).toBe(110);
    expect(fiskars.prevCents).toBe(0);
    const nokia = d.payers.find((p) => p.merchantLower === "nokia oyj")!;
    expect(nokia.totalCents).toBe(196);
  });

  it("returns null when the category has no rows", () => {
    expect(dividendBreakdown([tx({})])).toBeNull();
  });
});

describe("categorySeries / topCategories", () => {
  const txns = [
    tx({ date: "2025-01-05", amountCents: -10000 }),
    tx({ date: "2025-02-05", amountCents: -30000 }),
    tx({ date: "2025-01-08", amountCents: -5000, category: "Digi" }),
    tx({ date: "2025-01-09", amountCents: 2000, category: "Ruoka" }), // refund reduces
  ];

  it("returns per-month series with missing months as 0", () => {
    expect(
      categorySeries(txns, visible, "Ruoka", ["2025-01", "2025-02", "2025-03"]),
    ).toEqual([8000, 30000, 0]);
  });

  it("ranks categories by total spend in the window", () => {
    expect(topCategories(txns, visible, ["2025-01", "2025-02"], 2)).toEqual([
      "Ruoka",
      "Digi",
    ]);
  });
});
