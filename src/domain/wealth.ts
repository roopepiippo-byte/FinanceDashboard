import type { WealthAccount, WealthSnapshot } from "@/types";

export interface SnapshotTotals {
  assetsCents: number;
  debtsCents: number;
  netCents: number;
  liquidCents: number;
}

/** Totals for one month over the defined accounts (orphan values ignored). */
export function snapshotTotals(
  s: WealthSnapshot,
  accounts: WealthAccount[],
): SnapshotTotals {
  let assets = 0;
  let debts = 0;
  let liquid = 0;
  for (const a of accounts) {
    const v = s.values[a.id] ?? 0;
    if (a.kind === "debt") {
      debts += v;
    } else {
      assets += v;
      if (a.kind === "liquid") liquid += v;
    }
  }
  return {
    assetsCents: assets,
    debtsCents: debts,
    netCents: assets - debts,
    liquidCents: liquid,
  };
}

export interface NetWorthPoint {
  month: string;
  netCents: number;
}

export function netWorthSeries(
  snapshots: WealthSnapshot[],
  accounts: WealthAccount[],
): NetWorthPoint[] {
  return snapshots.map((s) => ({
    month: s.month,
    netCents: snapshotTotals(s, accounts).netCents,
  }));
}

/** Per-month liquid value by account name (stacked bar). */
export interface LiquidPoint {
  month: string;
  values: Record<string, number>; // account name -> cents
}

export function liquidByAccountSeries(
  snapshots: WealthSnapshot[],
  accounts: WealthAccount[],
): { points: LiquidPoint[]; labels: string[] } {
  const liquidAccounts = accounts.filter((a) => a.kind === "liquid");
  const points = snapshots.map((s) => ({
    month: s.month,
    values: Object.fromEntries(
      liquidAccounts.map((a) => [a.name, s.values[a.id] ?? 0]),
    ),
  }));
  return { points, labels: liquidAccounts.map((a) => a.name) };
}

export interface SavingsReturnsPoint {
  month: string;
  ownCents: number; // cumulative own contributions (incl. baseline)
  returnsCents: number; // cumulative back-calculated market returns
}

/**
 * Back-calculate cumulative own savings vs. market returns.
 * Baseline = first snapshot net worth (own). Each later month:
 *   marketReturn = netWorthChange - savingsContribution.
 */
export function savingsVsReturns(
  snapshots: WealthSnapshot[],
  accounts: WealthAccount[],
): SavingsReturnsPoint[] {
  if (snapshots.length === 0) return [];
  const nets = snapshots.map((s) => snapshotTotals(s, accounts).netCents);
  let own = nets[0];
  let returns = 0;
  const out: SavingsReturnsPoint[] = [
    { month: snapshots[0].month, ownCents: own, returnsCents: 0 },
  ];
  for (let i = 1; i < snapshots.length; i++) {
    const change = nets[i] - nets[i - 1];
    const contribution = snapshots[i].savingsContributionCents ?? 0;
    own += contribution;
    returns += change - contribution;
    out.push({ month: snapshots[i].month, ownCents: own, returnsCents: returns });
  }
  return out;
}

export interface AccountDelta {
  account: WealthAccount;
  currentCents: number;
  deltaCents: number | null;
}

/** Latest snapshot's per-account values with delta from the previous month. */
export function latestAccountDeltas(
  snapshots: WealthSnapshot[],
  accounts: WealthAccount[],
): AccountDelta[] {
  if (snapshots.length === 0) return [];
  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  return accounts.map((a) => {
    const currentCents = latest.values[a.id] ?? 0;
    return {
      account: a,
      currentCents,
      deltaCents: prev ? currentCents - (prev.values[a.id] ?? 0) : null,
    };
  });
}
