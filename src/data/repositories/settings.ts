import { getDB, SETTINGS_KEY } from "../db";
import type { DisplaySettings } from "@/types";
import { DEFAULT_QUICK_SPEND } from "@/domain/categories";

export const DEFAULT_SETTINGS: DisplaySettings = {
  quickSpendCategories: DEFAULT_QUICK_SPEND,
  carChartHidden: false,
};

export const settingsRepo = {
  async get(): Promise<DisplaySettings> {
    const stored = await (await getDB()).get("settings", SETTINGS_KEY);
    return stored ?? DEFAULT_SETTINGS;
  },

  async save(s: DisplaySettings): Promise<void> {
    await (await getDB()).put("settings", s, SETTINGS_KEY);
  },
};
