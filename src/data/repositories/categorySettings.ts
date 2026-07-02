import { getDB } from "../db";
import type { CategorySetting } from "@/types";

export const categorySettingsRepo = {
  async getAll(): Promise<CategorySetting[]> {
    return (await getDB()).getAll("categorySettings");
  },

  async save(s: CategorySetting): Promise<void> {
    await (await getDB()).put("categorySettings", s);
  },

  async bulkSave(settings: CategorySetting[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("categorySettings", "readwrite");
    await Promise.all(settings.map((s) => tx.store.put(s)));
    await tx.done;
  },
};
