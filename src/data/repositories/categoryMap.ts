import { getDB } from "../db";
import type { CategoryMapEntry } from "@/types";

export const categoryMapRepo = {
  async getAll(): Promise<CategoryMapEntry[]> {
    return (await getDB()).getAll("categoryMap");
  },

  async upsert(entry: CategoryMapEntry): Promise<void> {
    await (await getDB()).put("categoryMap", entry);
  },

  async remove(pattern: string): Promise<void> {
    await (await getDB()).delete("categoryMap", pattern);
  },

  /** Upsert many entries in a single transaction (imports). */
  async bulkUpsert(entries: CategoryMapEntry[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("categoryMap", "readwrite");
    await Promise.all(entries.map((e) => tx.store.put(e)));
    await tx.done;
  },

  async replaceAll(entries: CategoryMapEntry[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("categoryMap", "readwrite");
    await tx.store.clear();
    await Promise.all(entries.map((e) => tx.store.put(e)));
    await tx.done;
  },

  async clear(): Promise<void> {
    await (await getDB()).clear("categoryMap");
  },
};
