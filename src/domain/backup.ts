import type {
  Transaction,
  ImportedFile,
  CategoryMapEntry,
  Override,
  CategorySetting,
  CustomCategory,
  DisplaySettings,
  Budget,
  WealthSnapshot,
  WealthAccount,
} from "@/types";

export const BACKUP_VERSION = 1;
const APP_ID = "finance-dashboard";

export interface BackupData {
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
}

export interface FullBackup extends BackupData {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
}

const REQUIRED_ARRAY_KEYS = [
  "transactions",
  "importedFiles",
  "categoryMap",
  "overrides",
  "categorySettings",
  "customCategories",
  "wealthSnapshots",
  "wealthAccounts",
] as const;

export function serializeBackup(data: BackupData): string {
  const backup: FullBackup = {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  return JSON.stringify(backup, null, 2);
}

/** Parse and validate a backup file's shape. Throws with a Finnish message on failure. */
export function parseBackup(text: string): FullBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Tiedosto ei ole kelvollista JSON-muotoa.");
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Varmuuskopiotiedosto on virheellinen.");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== APP_ID) {
    throw new Error("Tiedosto ei ole tämän sovelluksen varmuuskopio.");
  }
  if (typeof obj.version !== "number" || obj.version > BACKUP_VERSION) {
    throw new Error(
      "Varmuuskopio on uudempaa versiota kuin tämä sovellus tukee.",
    );
  }
  for (const key of REQUIRED_ARRAY_KEYS) {
    if (!Array.isArray(obj[key])) {
      throw new Error(`Varmuuskopiosta puuttuu kenttä "${key}".`);
    }
  }
  if (typeof obj.settings !== "object" || obj.settings === null) {
    throw new Error('Varmuuskopiosta puuttuu kenttä "settings".');
  }
  if (typeof obj.budget !== "object" || obj.budget === null) {
    throw new Error('Varmuuskopiosta puuttuu kenttä "budget".');
  }
  return obj as unknown as FullBackup;
}
