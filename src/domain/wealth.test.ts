import { describe, it, expect } from "vitest";
import {
  snapshotTotals,
  netWorthSeries,
  liquidByAccountSeries,
  savingsVsReturns,
  latestAccountDeltas,
} from "./wealth";
import type { WealthAccount, WealthSnapshot } from "@/types";

const accounts: WealthAccount[] = [
  { id: "nordea", name: "Nordea Käyttötili", kind: "liquid" },
  { id: "spankki", name: "S-pankki Rahastotili", kind: "liquid" },
  { id: "nordnet", name: "Nordnet", kind: "investment" },
  { id: "laina", name: "Asuntolaina", kind: "debt" },
];

const jan: WealthSnapshot = {
  id: "2024-01",
  month: "2024-01",
  values: { nordea: 500000, spankki: 200000, nordnet: 1500000, laina: 18000000 },
  savingsContributionCents: null,
};

const feb: WealthSnapshot = {
  id: "2024-02",
  month: "2024-02",
  values: { nordea: 750000, nordnet: 1600000, laina: 17900000 },
  savingsContributionCents: 80000,
};

describe("snapshotTotals", () => {
  it("computes assets, debts, net worth, liquid over the accounts", () => {
    const t = snapshotTotals(jan, accounts);
    expect(t.assetsCents).toBe(2200000);
    expect(t.debtsCents).toBe(18000000);
    expect(t.netCents).toBe(2200000 - 18000000);
    expect(t.liquidCents).toBe(700000);
  });

  it("treats missing account values as 0 and ignores orphan values", () => {
    const t = snapshotTotals(
      { ...feb, values: { ...feb.values, deleted: 999999 } },
      accounts,
    );
    expect(t.assetsCents).toBe(2350000); // spankki missing -> 0, orphan ignored
  });
});

describe("netWorthSeries", () => {
  it("returns net worth per month", () => {
    const s = netWorthSeries([jan, feb], accounts);
    expect(s[0].netCents).toBe(-15800000);
    expect(s[1].netCents).toBe(2350000 - 17900000);
  });
});

describe("liquidByAccountSeries", () => {
  it("stacks liquid accounts by name", () => {
    const { points, labels } = liquidByAccountSeries([jan, feb], accounts);
    expect(labels).toEqual(["Nordea Käyttötili", "S-pankki Rahastotili"]);
    expect(points[0].values["Nordea Käyttötili"]).toBe(500000);
    expect(points[1].values["S-pankki Rahastotili"]).toBe(0);
  });
});

describe("savingsVsReturns", () => {
  it("splits net change into own contribution and market return", () => {
    const s = savingsVsReturns([jan, feb], accounts);
    const netJan = -15800000;
    const netFeb = 2350000 - 17900000; // -15550000
    const change = netFeb - netJan; // 250000
    expect(s[1].ownCents).toBe(netJan + 80000);
    expect(s[1].returnsCents).toBe(change - 80000);
    expect(s[1].ownCents + s[1].returnsCents).toBe(netFeb);
  });
});

describe("latestAccountDeltas", () => {
  it("shows latest values with delta from previous month", () => {
    const d = latestAccountDeltas([jan, feb], accounts);
    const nordea = d.find((x) => x.account.id === "nordea")!;
    expect(nordea.currentCents).toBe(750000);
    expect(nordea.deltaCents).toBe(250000);
    const laina = d.find((x) => x.account.id === "laina")!;
    expect(laina.deltaCents).toBe(-100000);
  });

  it("has null deltas for the first month", () => {
    const d = latestAccountDeltas([jan], accounts);
    expect(d[0].deltaCents).toBeNull();
  });
});
