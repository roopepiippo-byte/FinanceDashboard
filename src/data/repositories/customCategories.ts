import { getDB } from "../db";
import type { CustomCategory } from "@/types";

export const customCategoriesRepo = {
  async getAll(): Promise<CustomCategory[]> {
    return (await getDB()).getAll("customCategories");
  },

  async add(c: CustomCategory): Promise<void> {
    await (await getDB()).put("customCategories", c);
  },

  async remove(name: string): Promise<void> {
    await (await getDB()).delete("customCategories", name);
  },
};
