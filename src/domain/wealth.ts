import type { WealthSnapshot } from "@/types";
import { sumCents } from "@/domain/money";

export interface SnapshotTotals {
  assetsCents: number;
  debtsCents: number;
  netCents: number;
  liquidCents: number;
}

export function snapshotTotals(s: WealthSnapshot): SnapshotTotals {
  const assetsCents = sumCents(
    s.groups.flatMap((g) => g.entries.map((e) => e.amountCents)),
  );
  const debtsCents = sumCents(s.debts.map((d) => d.amountCents));
  const liquidCents = sumCents(
    s.groups
      .filter((g) => g.isLiquid)
      .flatMap((g) => g.entries.map((e) => e.amountCents)),
  );
  return {
    assetsCents,
    debtsCents,
    netCents: assetsCents - debtsCents,
    liquidCents,
  };
}

export interface NetWorthPoint {
  month: string;
  netCents: number;
}

export function netWorthSeries(snapshots: WealthSnapshot[]): NetWorthPoint[] {
  return snapshots.map((s) => ({
    month: s.month,
    netCents: snapshotTotals(s).netCents,
  }));
}

/** Per-month liquid total by group label (for a stacked bar). */
export interface LiquidPoint {
  month: string;
  groups: Record<string, number>;
}

export function liquidByGroupSeries(
  snapshots: WealthSnapshot[],
): { points: LiquidPoint[]; groupLabels: string[] } {
  const labels = new Set<string>();
  const points = snapshots.map((s) => {
    const groups: Record<string, number> = {};
    for (const g of s.groups) {
      if (!g.isLiquid) continue;
      labels.add(g.label);
      groups[g.label] =
        (groups[g.label] ?? 0) + sumCents(g.entries.map((e) => e.amountCents));
    }
    return { month: s.month, groups };
  });
  return { points, groupLabels: [...labels] };
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
): SavingsReturnsPoint[] {
  if (snapshots.length === 0) return [];
  const nets = snapshots.map((s) => snapshotTotals(s).netCents);
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

export interface GroupDelta {
  label: string;
  currentCents: number;
  deltaCents: number | null;
}

/** Latest snapshot's group/debt totals with delta from the previous month. */
export function latestGroupDeltas(snapshots: WealthSnapshot[]): GroupDelta[] {
  if (snapshots.length === 0) return [];
  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  const totalsFor = (s: WealthSnapshot | undefined) => {
    const m = new Map<string, number>();
    if (!s) return m;
    for (const g of s.groups) {
      m.set(g.label, sumCents(g.entries.map((e) => e.amountCents)));
    }
    for (const d of s.debts) {
      m.set(`${d.label} (velka)`, -d.amountCents);
    }
    return m;
  };

  const cur = totalsFor(latest);
  const prv = totalsFor(prev);
  return [...cur.entries()].map(([label, currentCents]) => ({
    label,
    currentCents,
    deltaCents: prev ? currentCents - (prv.get(label) ?? 0) : null,
  }));
}
