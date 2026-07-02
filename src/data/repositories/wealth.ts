import { getDB } from "../db";
import type { WealthSnapshot } from "@/types";

export const wealthRepo = {
  async list(): Promise<WealthSnapshot[]> {
    const all = await (await getDB()).getAll("wealthSnapshots");
    return all.sort((a, b) => a.month.localeCompare(b.month));
  },

  async upsert(s: WealthSnapshot): Promise<void> {
    await (await getDB()).put("wealthSnapshots", s);
  },

  async remove(month: string): Promise<void> {
    await (await getDB()).delete("wealthSnapshots", month);
  },
};
