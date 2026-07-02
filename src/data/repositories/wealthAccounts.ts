import { getDB } from "../db";
import type { WealthAccount } from "@/types";

const KIND_ORDER = { liquid: 0, investment: 1, debt: 2 } as const;

export function sortAccounts(accounts: WealthAccount[]): WealthAccount[] {
  return [...accounts].sort((a, b) => {
    const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return (
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.name.localeCompare(b.name, "fi")
    );
  });
}

export const wealthAccountsRepo = {
  async list(): Promise<WealthAccount[]> {
    return sortAccounts(await (await getDB()).getAll("wealthAccounts"));
  },

  async upsert(account: WealthAccount): Promise<void> {
    await (await getDB()).put("wealthAccounts", account);
  },

  async bulkUpsert(accounts: WealthAccount[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("wealthAccounts", "readwrite");
    await Promise.all(accounts.map((a) => tx.store.put(a)));
    await tx.done;
  },

  async remove(id: string): Promise<void> {
    await (await getDB()).delete("wealthAccounts", id);
  },
};
