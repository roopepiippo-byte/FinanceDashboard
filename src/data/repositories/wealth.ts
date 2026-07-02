import { getDB } from "../db";
import type {
  LegacyWealthSnapshot,
  WealthAccount,
  WealthSnapshot,
} from "@/types";
import { newId } from "@/lib/id";
import { wealthAccountsRepo } from "./wealthAccounts";

function isLegacy(
  s: WealthSnapshot | LegacyWealthSnapshot,
): s is LegacyWealthSnapshot {
  return Array.isArray((s as LegacyWealthSnapshot).groups);
}

/**
 * Convert pre-account snapshots ({groups, debts}) to the account-based shape:
 * every distinct entry label becomes a WealthAccount (created once, matched by
 * name), and the snapshot stores accountId -> cents.
 */
async function migrateLegacy(
  legacy: LegacyWealthSnapshot[],
  existingAccounts: WealthAccount[],
): Promise<void> {
  const byName = new Map(existingAccounts.map((a) => [a.name, a]));
  const newAccounts: WealthAccount[] = [];

  const accountFor = (name: string, kind: WealthAccount["kind"]) => {
    const label = name.trim() || "Tili";
    let acc = byName.get(label);
    if (!acc) {
      acc = { id: newId(), name: label, kind };
      byName.set(label, acc);
      newAccounts.push(acc);
    }
    return acc;
  };

  const converted: WealthSnapshot[] = legacy.map((s) => {
    const values: Record<string, number> = {};
    for (const g of s.groups) {
      for (const e of g.entries) {
        const acc = accountFor(e.label, g.isLiquid ? "liquid" : "investment");
        values[acc.id] = (values[acc.id] ?? 0) + e.amountCents;
      }
    }
    for (const d of s.debts) {
      const acc = accountFor(d.label, "debt");
      values[acc.id] = (values[acc.id] ?? 0) + d.amountCents;
    }
    return {
      id: s.id,
      month: s.month,
      values,
      savingsContributionCents: s.savingsContributionCents ?? null,
    };
  });

  if (newAccounts.length > 0) {
    await wealthAccountsRepo.bulkUpsert(newAccounts);
  }
  const db = await getDB();
  const tx = db.transaction("wealthSnapshots", "readwrite");
  await Promise.all(converted.map((s) => tx.store.put(s)));
  await tx.done;
}

export const wealthRepo = {
  /** List snapshots, converting any legacy-shape records first. */
  async list(): Promise<WealthSnapshot[]> {
    const db = await getDB();
    const all = (await db.getAll("wealthSnapshots")) as (
      | WealthSnapshot
      | LegacyWealthSnapshot
    )[];
    const legacy = all.filter(isLegacy);
    if (legacy.length > 0) {
      await migrateLegacy(legacy, await wealthAccountsRepo.list());
      return wealthRepo.list();
    }
    return (all as WealthSnapshot[]).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  },

  async upsert(s: WealthSnapshot): Promise<void> {
    await (await getDB()).put("wealthSnapshots", s);
  },

  async remove(month: string): Promise<void> {
    await (await getDB()).delete("wealthSnapshots", month);
  },
};
