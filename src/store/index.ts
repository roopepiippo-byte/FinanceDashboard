import { create } from "zustand";
import type {
  Transaction,
  ImportedFile,
  CategoryMapEntry,
  Override,
  CategorySetting,
  CustomCategory,
  DisplaySettings,
  CategoryClass,
  Budget,
  WealthSnapshot,
  WealthAccount,
  WealthAccountKind,
} from "@/types";
import { transactionsRepo } from "@/data/repositories/transactions";
import { importedFilesRepo } from "@/data/repositories/importedFiles";
import { categoryMapRepo } from "@/data/repositories/categoryMap";
import { overridesRepo } from "@/data/repositories/overrides";
import { categorySettingsRepo } from "@/data/repositories/categorySettings";
import { customCategoriesRepo } from "@/data/repositories/customCategories";
import { settingsRepo } from "@/data/repositories/settings";
import { budgetRepo, DEFAULT_BUDGET } from "@/data/repositories/budget";
import { wealthRepo } from "@/data/repositories/wealth";
import {
  wealthAccountsRepo,
  sortAccounts,
} from "@/data/repositories/wealthAccounts";
import { newId } from "@/lib/id";
import { getDB } from "@/data/db";
import {
  BUILTIN_CATEGORIES,
  defaultColorOf,
  groupFromClass,
} from "@/domain/categories";
import { resolveAll, applyClassOverrides } from "@/domain/categorize";
import { mapNordeaCsv } from "@/domain/csv/mapNordea";
import {
  parseCategoryDbCsv,
  serializeCategoryDbCsv,
} from "@/domain/categoryDb";
import { computeRange, type DateRange } from "@/lib/dateRange";

export interface ImportSummary {
  filename: string;
  added: number;
  duplicates: number;
  errors: { row: number; reason: string }[];
}

interface AppState {
  hydrated: boolean;
  rawTransactions: Transaction[];
  /** Resolved (category applied) — derived from raw + map + overrides. */
  transactions: Transaction[];
  importedFiles: ImportedFile[];
  categoryMap: CategoryMapEntry[];
  overrides: Override[];
  categorySettings: CategorySetting[];
  customCategories: CustomCategory[];
  settings: DisplaySettings;
  budget: Budget;
  wealthSnapshots: WealthSnapshot[];
  wealthAccounts: WealthAccount[];
  range: DateRange;

  init: () => Promise<void>;
  setRange: (range: DateRange) => void;
  importCsv: (file: File) => Promise<ImportSummary>;
  deleteImportedFile: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveBudget: (budget: Budget) => Promise<void>;
  upsertWealth: (snapshot: WealthSnapshot) => Promise<void>;
  removeWealth: (month: string) => Promise<void>;
  addWealthAccount: (name: string, kind: WealthAccountKind) => Promise<void>;
  updateWealthAccount: (account: WealthAccount) => Promise<void>;
  removeWealthAccount: (id: string) => Promise<void>;
  moveWealthAccount: (id: string, direction: -1 | 1) => Promise<void>;
  reorderWealthAccounts: (orderedIds: string[]) => Promise<void>;
  toggleCategoryVisibility: (category: string) => Promise<void>;
  setCategoryColor: (category: string, color: string) => Promise<void>;
  setCategoryClass: (category: string, cls: CategoryClass) => Promise<void>;
  resetCategoryColors: () => Promise<void>;
  setQuickSpend: (categories: string[]) => Promise<void>;
  setCarChartHidden: (hidden: boolean) => Promise<void>;
  addCustomCategory: (
    name: string,
    cls: CategoryClass,
    color: string,
  ) => Promise<void>;
  deleteAllTransactions: () => Promise<void>;
  clearCategoryMap: () => Promise<void>;
  resetAll: () => Promise<void>;
  applyMerchantCategory: (
    pattern: string,
    category: string,
    cls: CategoryClass,
    display?: string,
  ) => Promise<void>;
  /** Delete a categorization rule; its transactions become uncategorized. */
  removeCategoryRule: (pattern: string) => Promise<void>;
  /** Mass-apply (e.g. "accept all suggestions"): one write, one recompute. */
  applyMerchantCategories: (
    items: {
      pattern: string;
      category: string;
      cls: CategoryClass;
      display?: string;
    }[],
  ) => Promise<void>;
  setOverride: (
    transactionId: string,
    category: string,
    cls: CategoryClass,
  ) => Promise<void>;
  importCategoryDb: (
    text: string,
    mode: "merge" | "replace",
  ) => Promise<CategoryDbImportSummary>;
  exportCategoryDb: () => string;
}

export interface CategoryDbImportSummary {
  imported: number;
  newCustomCategories: number;
  skipped: number;
}

function recompute(
  raw: Transaction[],
  map: CategoryMapEntry[],
  overrides: Override[],
  categorySettings: CategorySetting[],
): Transaction[] {
  const classOverrides = new Map(
    categorySettings
      .filter((s) => s.class)
      .map((s) => [s.category, s.class!] as const),
  );
  return applyClassOverrides(resolveAll(raw, map, overrides), classOverrides);
}

export const useStore = create<AppState>((set, get) => ({
  hydrated: false,
  rawTransactions: [],
  transactions: [],
  importedFiles: [],
  categoryMap: [],
  overrides: [],
  categorySettings: [],
  customCategories: [],
  settings: { quickSpendCategories: [], carChartHidden: false },
  budget: DEFAULT_BUDGET,
  wealthSnapshots: [],
  wealthAccounts: [],
  range: computeRange("last12"),

  async init() {
    const [
      rawTransactions,
      importedFiles,
      categoryMap,
      overrides,
      customCategories,
      loadedSettings,
      budget,
    ] = await Promise.all([
      transactionsRepo.getAll(),
      importedFilesRepo.list(),
      categoryMapRepo.getAll(),
      overridesRepo.getAll(),
      customCategoriesRepo.getAll(),
      settingsRepo.get(),
      budgetRepo.get(),
    ]);
    // Snapshots first: listing converts legacy records, which may CREATE
    // accounts — so accounts must be read after.
    const wealthSnapshots = await wealthRepo.list();
    const wealthAccounts = await wealthAccountsRepo.list();

    // Seed built-in category settings on first run.
    let categorySettings = await categorySettingsRepo.getAll();
    if (categorySettings.length === 0) {
      categorySettings = BUILTIN_CATEGORIES.map((c) => ({
        category: c.name,
        visible: true,
        color: c.color,
      }));
      await categorySettingsRepo.bulkSave(categorySettings);
    }

    // One-time default when class-based exclusions were removed: toggle
    // transfer-class categories off so the dashboard numbers keep their
    // previous meaning. From here on the Asetukset toggles alone decide.
    let settings = loadedSettings;
    if (!settings.transferDefaultApplied) {
      const transferNames = new Set([
        ...BUILTIN_CATEGORIES.filter((c) => c.class === "transfer").map(
          (c) => c.name,
        ),
        ...customCategories
          .filter((c) => c.class === "transfer")
          .map((c) => c.name),
      ]);
      categorySettings = categorySettings.map((s) =>
        transferNames.has(s.category) ? { ...s, visible: false } : s,
      );
      await categorySettingsRepo.bulkSave(categorySettings);
      settings = { ...settings, transferDefaultApplied: true };
      await settingsRepo.save(settings);
    }

    set({
      hydrated: true,
      rawTransactions,
      transactions: recompute(
        rawTransactions,
        categoryMap,
        overrides,
        categorySettings,
      ),
      importedFiles,
      categoryMap,
      overrides,
      categorySettings,
      customCategories,
      settings,
      budget,
      wealthSnapshots,
      wealthAccounts,
    });
  },

  setRange(range) {
    set({ range });
  },

  async importCsv(file) {
    const filename = file.name;
    const importedAt = new Date().toISOString();
    const fileId = filename; // filename-keyed: re-importing overwrites the entry
    const text = await file.text();

    const { transactions: mapped, errors } = mapNordeaCsv(text, fileId);

    const existingIds = new Set(get().rawTransactions.map((t) => t.id));
    const added = mapped.filter((t) => !existingIds.has(t.id)).length;

    await transactionsRepo.bulkUpsert(mapped);
    const importedFile: ImportedFile = {
      id: fileId,
      filename,
      importedAt,
      transactionCount: mapped.length,
    };
    await importedFilesRepo.add(importedFile);

    const rawTransactions = await transactionsRepo.getAll();
    const importedFiles = await importedFilesRepo.list();
    const { categoryMap, overrides } = get();
    set({
      rawTransactions,
      importedFiles,
      transactions: recompute(rawTransactions, categoryMap, overrides, get().categorySettings),
    });

    return { filename, added, duplicates: mapped.length - added, errors };
  },

  async deleteImportedFile(id) {
    await transactionsRepo.deleteBySourceFile(id); // cascade (FR-007)
    await importedFilesRepo.remove(id);
    const rawTransactions = await transactionsRepo.getAll();
    const importedFiles = await importedFilesRepo.list();
    const { categoryMap, overrides } = get();
    set({
      rawTransactions,
      importedFiles,
      transactions: recompute(rawTransactions, categoryMap, overrides, get().categorySettings),
    });
  },

  async applyMerchantCategory(pattern, category, cls, display) {
    const entry: CategoryMapEntry = {
      pattern,
      category,
      class: cls,
      display: display ?? pattern,
      group: groupFromClass(cls),
    };
    await categoryMapRepo.upsert(entry);
    // Update in memory — re-reading the whole rule table is wasted I/O.
    const { rawTransactions, overrides } = get();
    const categoryMap = [
      ...get().categoryMap.filter((e) => e.pattern !== entry.pattern),
      entry,
    ];
    set({
      categoryMap,
      transactions: recompute(rawTransactions, categoryMap, overrides, get().categorySettings),
    });
  },

  async removeCategoryRule(pattern) {
    await categoryMapRepo.remove(pattern);
    const categoryMap = get().categoryMap.filter((e) => e.pattern !== pattern);
    const { rawTransactions, overrides } = get();
    set({
      categoryMap,
      transactions: recompute(
        rawTransactions,
        categoryMap,
        overrides,
        get().categorySettings,
      ),
    });
  },

  async applyMerchantCategories(items) {
    if (items.length === 0) return;
    const entries: CategoryMapEntry[] = items.map((i) => ({
      pattern: i.pattern,
      category: i.category,
      class: i.cls,
      display: i.display ?? i.pattern,
      group: groupFromClass(i.cls),
    }));
    await categoryMapRepo.bulkUpsert(entries);
    const patterns = new Set(entries.map((e) => e.pattern));
    const categoryMap = [
      ...get().categoryMap.filter((e) => !patterns.has(e.pattern)),
      ...entries,
    ];
    const { rawTransactions, overrides } = get();
    set({
      categoryMap,
      transactions: recompute(
        rawTransactions,
        categoryMap,
        overrides,
        get().categorySettings,
      ),
    });
  },

  async importCategoryDb(text, mode) {
    const { entries, customCategories, skipped } = parseCategoryDbCsv(text);

    if (mode === "replace") {
      await categoryMapRepo.replaceAll(entries);
    } else {
      await categoryMapRepo.bulkUpsert(entries);
    }

    // Create category settings + custom-category records for any new names.
    const existingSettings = new Set(
      get().categorySettings.map((s) => s.category),
    );
    for (const c of customCategories) {
      await customCategoriesRepo.add(c);
      if (!existingSettings.has(c.name)) {
        await categorySettingsRepo.save({
          category: c.name,
          visible: true,
          color: c.color,
        });
      }
    }

    const [categoryMap, categorySettings, custom] = await Promise.all([
      categoryMapRepo.getAll(),
      categorySettingsRepo.getAll(),
      customCategoriesRepo.getAll(),
    ]);
    const { rawTransactions, overrides } = get();
    set({
      categoryMap,
      categorySettings,
      customCategories: custom,
      transactions: recompute(rawTransactions, categoryMap, overrides, get().categorySettings),
    });

    return {
      imported: entries.length,
      newCustomCategories: customCategories.length,
      skipped,
    };
  },

  exportCategoryDb() {
    return serializeCategoryDbCsv(get().categoryMap);
  },

  async setOverride(transactionId, category, cls) {
    await overridesRepo.set({ transactionId, category, class: cls });
    const overrides = await overridesRepo.getAll();
    const { rawTransactions, categoryMap } = get();
    set({
      overrides,
      transactions: recompute(rawTransactions, categoryMap, overrides, get().categorySettings),
    });
  },

  async deleteTransaction(id) {
    await transactionsRepo.delete(id);
    await overridesRepo.remove(id);
    const rawTransactions = await transactionsRepo.getAll();
    const { categoryMap } = get();
    const overrides = await overridesRepo.getAll();
    set({
      rawTransactions,
      overrides,
      transactions: recompute(rawTransactions, categoryMap, overrides, get().categorySettings),
    });
  },

  async saveBudget(budget) {
    await budgetRepo.save(budget);
    set({ budget });
  },

  async upsertWealth(snapshot) {
    await wealthRepo.upsert(snapshot);
    set({ wealthSnapshots: await wealthRepo.list() });
  },

  async removeWealth(month) {
    await wealthRepo.remove(month);
    set({ wealthSnapshots: await wealthRepo.list() });
  },

  async addWealthAccount(name, kind) {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Append at the end of the current display order and renumber so every
    // account carries an explicit sortOrder from here on.
    const renumbered = [
      ...get().wealthAccounts,
      { id: newId(), name: trimmed, kind },
    ].map((a, i) => ({ ...a, sortOrder: i }));
    await wealthAccountsRepo.bulkUpsert(renumbered);
    set({ wealthAccounts: renumbered });
  },

  async updateWealthAccount(account) {
    await wealthAccountsRepo.upsert(account);
    set({ wealthAccounts: await wealthAccountsRepo.list() });
  },

  async removeWealthAccount(id) {
    await wealthAccountsRepo.remove(id);
    set({
      wealthAccounts: sortAccounts(
        get().wealthAccounts.filter((a) => a.id !== id),
      ),
    });
  },

  async moveWealthAccount(id, direction) {
    const list = [...get().wealthAccounts];
    const i = list.findIndex((a) => a.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const renumbered = list.map((a, idx) => ({ ...a, sortOrder: idx }));
    await wealthAccountsRepo.bulkUpsert(renumbered);
    set({ wealthAccounts: renumbered });
  },

  async reorderWealthAccounts(orderedIds) {
    const byId = new Map(get().wealthAccounts.map((a) => [a.id, a]));
    const renumbered = orderedIds
      .map((id) => byId.get(id))
      .filter((a): a is WealthAccount => a !== undefined)
      .map((a, idx) => ({ ...a, sortOrder: idx }));
    if (renumbered.length !== byId.size) return; // ids out of sync — ignore
    await wealthAccountsRepo.bulkUpsert(renumbered);
    set({ wealthAccounts: renumbered });
  },

  async toggleCategoryVisibility(category) {
    const current = get().categorySettings.find((s) => s.category === category);
    const next: CategorySetting = current
      ? { ...current, visible: !current.visible }
      : { category, visible: false, color: "#94a3b8" };
    await categorySettingsRepo.save(next);
    set({ categorySettings: await categorySettingsRepo.getAll() });
  },

  async setCategoryColor(category, color) {
    const current = get().categorySettings.find((s) => s.category === category);
    await categorySettingsRepo.save(
      current ? { ...current, color } : { category, visible: true, color },
    );
    set({ categorySettings: await categorySettingsRepo.getAll() });
  },

  async setCategoryClass(category, cls) {
    const current = get().categorySettings.find((s) => s.category === category);
    await categorySettingsRepo.save(
      current
        ? { ...current, class: cls }
        : { category, visible: true, color: "#94a3b8", class: cls },
    );
    const categorySettings = await categorySettingsRepo.getAll();
    const { rawTransactions, categoryMap, overrides } = get();
    set({
      categorySettings,
      transactions: recompute(
        rawTransactions,
        categoryMap,
        overrides,
        categorySettings,
      ),
    });
  },

  async resetCategoryColors() {
    const updated = get().categorySettings.map((s) => {
      const def = defaultColorOf(s.category);
      return def ? { ...s, color: def } : s;
    });
    await categorySettingsRepo.bulkSave(updated);
    set({ categorySettings: await categorySettingsRepo.getAll() });
  },

  async setQuickSpend(categories) {
    const settings = { ...get().settings, quickSpendCategories: categories };
    await settingsRepo.save(settings);
    set({ settings });
  },

  async setCarChartHidden(hidden) {
    const settings = { ...get().settings, carChartHidden: hidden };
    await settingsRepo.save(settings);
    set({ settings });
  },

  async addCustomCategory(name, cls, color) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await customCategoriesRepo.add({ name: trimmed, class: cls, color });
    if (!get().categorySettings.some((s) => s.category === trimmed)) {
      await categorySettingsRepo.save({
        category: trimmed,
        visible: true,
        color,
      });
    }
    const [customCategories, categorySettings] = await Promise.all([
      customCategoriesRepo.getAll(),
      categorySettingsRepo.getAll(),
    ]);
    set({ customCategories, categorySettings });
  },

  async deleteAllTransactions() {
    await transactionsRepo.deleteAll();
    const db = await getDB();
    await db.clear("importedFiles");
    await db.clear("overrides");
    set({
      rawTransactions: [],
      transactions: [],
      importedFiles: [],
      overrides: [],
    });
  },

  async clearCategoryMap() {
    await categoryMapRepo.clear();
    const { rawTransactions, overrides } = get();
    set({
      categoryMap: [],
      transactions: recompute(rawTransactions, [], overrides, get().categorySettings),
    });
  },

  async resetAll() {
    const db = await getDB();
    await Promise.all([
      db.clear("transactions"),
      db.clear("importedFiles"),
      db.clear("categoryMap"),
      db.clear("overrides"),
      db.clear("budget"),
      db.clear("categorySettings"),
      db.clear("customCategories"),
      db.clear("wealthSnapshots"),
      db.clear("wealthAccounts"),
      db.clear("settings"),
    ]);
    await get().init();
  },
}));
