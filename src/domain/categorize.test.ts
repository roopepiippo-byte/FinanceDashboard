import { describe, it, expect } from "vitest";
import {
  resolveCategory,
  resolveAll,
  applyClassOverrides,
} from "./categorize";
import type {
  Transaction,
  CategoryMapEntry,
  Override,
  CategoryClass,
} from "@/types";

const map: CategoryMapEntry[] = [
  { pattern: "k*", category: "Muu", class: "expense" },
  { pattern: "k-supermarket*", category: "Ruoka", class: "expense" },
  { pattern: "nordea*", category: "Palkka", class: "income" },
];

describe("resolveCategory (priority FR-011)", () => {
  it("prefers a manual override over any map match", () => {
    const overrides = new Map<string, Override>([
      ["t1", { transactionId: "t1", category: "Alko", class: "expense" }],
    ]);
    const r = resolveCategory("k-supermarket kamppi", "t1", map, overrides);
    expect(r).toEqual({
      category: "Alko",
      class: "expense",
      isManualOverride: true,
    });
  });

  it("uses the longest matching glob when no override", () => {
    const r = resolveCategory("k-supermarket kamppi", "t2", map, new Map());
    expect(r.category).toBe("Ruoka");
    expect(r.isManualOverride).toBe(false);
  });

  it("returns uncategorized when nothing matches", () => {
    const r = resolveCategory("unknown shop", "t3", map, new Map());
    expect(r).toEqual({
      category: null,
      class: null,
      isManualOverride: false,
    });
  });
});

describe("applyClassOverrides", () => {
  const txns = [
    { id: "a", category: "Ginstia", class: "expense", amountCents: 100 },
    { id: "b", category: "Ruoka", class: "expense", amountCents: -200 },
    { id: "c", category: null, class: null, amountCents: -300 },
  ] as Transaction[];

  it("overrides class for matching categories only", () => {
    const out = applyClassOverrides(
      txns,
      new Map<string, CategoryClass>([["Ginstia", "income"]]),
    );
    expect(out[0].class).toBe("income");
    expect(out[1].class).toBe("expense");
    expect(out[2].class).toBeNull();
  });

  it("is a no-op without overrides (same array back)", () => {
    expect(applyClassOverrides(txns, new Map())).toBe(txns);
  });
});

describe("resolveAll at real data scale", () => {
  it("resolves 600 txns against 2000 rules quickly (indexed, not O(n*m))", () => {
    const bigMap: CategoryMapEntry[] = Array.from({ length: 2000 }, (_, i) => ({
      pattern: `merchant number ${i}`,
      category: "Ruoka",
      class: "expense" as const,
    }));
    bigMap.push({ pattern: "glob merchant*", category: "Bensa", class: "expense" });
    const txns = Array.from({ length: 600 }, (_, i) => ({
      id: `t${i}`,
      merchantLower:
        i % 3 === 0
          ? `merchant number ${i}` // exact hit
          : i % 3 === 1
            ? `glob merchant ${i}` // glob hit
            : `unknown shop ${i}`, // miss
    })) as Transaction[];

    const start = performance.now();
    const resolved = resolveAll(txns, bigMap, []);
    const elapsed = performance.now() - start;

    expect(resolved[0].category).toBe("Ruoka");
    expect(resolved[1].category).toBe("Bensa");
    expect(resolved[2].category).toBeNull();
    // Generous bound — the un-indexed version took seconds.
    expect(elapsed).toBeLessThan(500);
  });
});

describe("resolveAll", () => {
  it("resolves a batch of transactions", () => {
    const txns = [
      { id: "a", merchantLower: "k-supermarket kamppi" },
      { id: "b", merchantLower: "nordea palkka" },
      { id: "c", merchantLower: "mystery" },
    ] as Transaction[];
    const overrides: Override[] = [
      { transactionId: "c", category: "Muu", class: "expense" },
    ];
    const resolved = resolveAll(txns, map, overrides);
    expect(resolved[0].category).toBe("Ruoka");
    expect(resolved[1].category).toBe("Palkka");
    expect(resolved[1].class).toBe("income");
    expect(resolved[2].category).toBe("Muu");
    expect(resolved[2].isManualOverride).toBe(true);
  });
});
