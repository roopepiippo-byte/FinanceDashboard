import { getDB, BUDGET_KEY } from "../db";
import type { Budget } from "@/types";

export const DEFAULT_BUDGET: Budget = {
  savingsGoalPct: 20,
  categories: {},
};

export const budgetRepo = {
  async get(): Promise<Budget> {
    const stored = await (await getDB()).get("budget", BUDGET_KEY);
    return stored ?? DEFAULT_BUDGET;
  },

  async save(b: Budget): Promise<void> {
    await (await getDB()).put("budget", b, BUDGET_KEY);
  },
};
