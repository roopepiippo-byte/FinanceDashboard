import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Transaction,
  ImportedFile,
  CategoryMapEntry,
  Override,
  Budget,
  CategorySetting,
  CustomCategory,
  WealthSnapshot,
  DisplaySettings,
} from "@/types";

export const DB_NAME = "finance-dashboard-v3";
export const DB_VERSION = 1;

/** Fixed keys for singleton stores. */
export const BUDGET_KEY = "budget";
export const SETTINGS_KEY = "settings";

interface FinanceDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { date: string; category: string };
  };
  importedFiles: { key: string; value: ImportedFile };
  categoryMap: { key: string; value: CategoryMapEntry };
  overrides: { key: string; value: Override };
  budget: { key: string; value: Budget };
  categorySettings: { key: string; value: CategorySetting };
  customCategories: { key: string; value: CustomCategory };
  wealthSnapshots: { key: string; value: WealthSnapshot };
  settings: { key: string; value: DisplaySettings };
}

let dbPromise: Promise<IDBPDatabase<FinanceDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<FinanceDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FinanceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const tx = db.createObjectStore("transactions", { keyPath: "id" });
        tx.createIndex("date", "date");
        tx.createIndex("category", "category");

        db.createObjectStore("importedFiles", { keyPath: "id" });
        db.createObjectStore("categoryMap", { keyPath: "pattern" });
        db.createObjectStore("overrides", { keyPath: "transactionId" });
        db.createObjectStore("budget"); // singleton, out-of-line key
        db.createObjectStore("categorySettings", { keyPath: "category" });
        db.createObjectStore("customCategories", { keyPath: "name" });
        db.createObjectStore("wealthSnapshots", { keyPath: "id" });
        db.createObjectStore("settings"); // singleton, out-of-line key
      },
    });
  }
  return dbPromise;
}

export type { FinanceDB };
