import { getDB } from "../db";
import type { Transaction } from "@/types";

export const transactionsRepo = {
  async getAll(): Promise<Transaction[]> {
    return (await getDB()).getAll("transactions");
  },

  async getByDateRange(fromISO: string, toISO: string): Promise<Transaction[]> {
    const db = await getDB();
    return db.getAllFromIndex(
      "transactions",
      "date",
      IDBKeyRange.bound(fromISO, toISO),
    );
  },

  /** Insert or update by id (idempotent — dedup, FR-006). */
  async bulkUpsert(txns: Transaction[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("transactions", "readwrite");
    await Promise.all(txns.map((t) => tx.store.put(t)));
    await tx.done;
  },

  async delete(id: string): Promise<void> {
    await (await getDB()).delete("transactions", id);
  },

  async deleteBySourceFile(fileId: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("transactions", "readwrite");
    let cursor = await tx.store.openCursor();
    while (cursor) {
      if (cursor.value.sourceFileId === fileId) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  async deleteAll(): Promise<void> {
    await (await getDB()).clear("transactions");
  },
};
