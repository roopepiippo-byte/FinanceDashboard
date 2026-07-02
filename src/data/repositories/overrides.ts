import { getDB } from "../db";
import type { Override } from "@/types";

export const overridesRepo = {
  async getAll(): Promise<Override[]> {
    return (await getDB()).getAll("overrides");
  },

  async set(o: Override): Promise<void> {
    await (await getDB()).put("overrides", o);
  },

  async remove(transactionId: string): Promise<void> {
    await (await getDB()).delete("overrides", transactionId);
  },
};
