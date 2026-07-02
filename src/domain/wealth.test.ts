import { describe, it, expect } from "vitest";
import {
  snapshotTotals,
  netWorthSeries,
  savingsVsReturns,
  latestGroupDeltas,
} from "./wealth";
import type { WealthSnapshot } from "@/types";

const jan: WealthSnapshot = {
  id: "2024-01",
  month: "2024-01",
  groups: [
    {
      label: "Pankkitilit",
      isLiquid: true,
      entries: [
        { label: "Nordea", amountCents: 500000 },
        { label: "S-Pankki", amountCents: 200000 },
      ],
    },
    {
      label: "Sijoitukset",
      isLiquid: false,
      entries: [{ label: "Nordnet", amountCents: 1500000 }],
    },
  ],
  debts: [{ label: "Asuntolaina", amountCents: 18000000 }],
  savingsContributionCents: null,
};

const feb: WealthSnapshot = {
  id: "2024-02",
  month: "2024-02",
  groups: [
    {
      label: "Pankkitilit",
      isLiquid: true,
      entries: [{ label: "Nordea", amountCents: 750000 }],
    },
    {
      label: "Sijoitukset",
      isLiquid: false,
      entries: [{ label: "Nordnet", amountCents: 1600000 }],
    },
  ],
  debts: [{ label: "Asuntolaina", amountCents: 17900000 }],
  savingsContributionCents: 80000,
};

describe("snapshotTotals", () => {
  it("computes assets, debts, net worth, liquid", () => {
    const t = snapshotTotals(jan);
    expect(t.assetsCents).toBe(2200000);
    expect(t.debtsCents).toBe(18000000);
    expect(t.netCents).toBe(2200000 - 18000000);
    expect(t.liquidCents).toBe(700000); // only liquid group
  });
});

describe("netWorthSeries", () => {
  it("returns net worth per month", () => {
    const s = netWorthSeries([jan, feb]);
    expect(s[0].netCents).toBe(-15800000);
    expect(s[1].netCents).toBe(2350000 - 17900000);
  });
});

describe("savingsVsReturns", () => {
  it("splits net change into own contribution and market return", () => {
    const s = savingsVsReturns([jan, feb]);
    const netJan = -15800000;
    const netFeb = 2350000 - 17900000; // -15550000
    const change = netFeb - netJan; // 250000
    // own = baseline + contribution; returns = change - contribution
    expect(s[1].ownCents).toBe(netJan + 80000);
    expect(s[1].returnsCents).toBe(change - 80000);
    // own + returns reconstructs current net worth
    expect(s[1].ownCents + s[1].returnsCents).toBe(netFeb);
  });
});

describe("latestGroupDeltas", () => {
  it("shows latest group totals with delta from previous month", () => {
    const d = latestGroupDeltas([jan, feb]);
    const bank = d.find((x) => x.label === "Pankkitilit")!;
    expect(bank.currentCents).toBe(750000);
    expect(bank.deltaCents).toBe(750000 - 700000);
  });
});
