/**
 * Shared entity types (data-model.md).
 * All monetary fields are INTEGER CENTS (Constitution Principle II).
 */

export type CategoryClass = "income" | "expense" | "transfer";

export interface Transaction {
  /** Stable dedup identity: hash(date | amountCents | merchantLower | rowIndex). */
  id: string;
  /** Booking date, ISO YYYY-MM-DD. */
  date: string;
  /** Signed integer cents; negative = expense, positive = income. */
  amountCents: number;
  merchant: string;
  merchantLower: string;
  balanceCents: number | null;
  isIncome: boolean;
  /** Resolved category name; null = uncategorized. */
  category: string | null;
  class: CategoryClass | null;
  isManualOverride: boolean;
  /** FK -> ImportedFile.id */
  sourceFileId: string;
}

export interface ImportedFile {
  id: string;
  filename: string;
  /** ISO datetime. */
  importedAt: string;
  transactionCount: number;
}

export interface CategoryMapEntry {
  /** Glob against merchantLower (supports `*`). Unique key. */
  pattern: string;
  category: string;
  class: CategoryClass;
  /** Original (display) merchant name, preserved for CSV round-trip. */
  display?: string;
  /** Budget group from the source sheet (e.g. Muuttuvat, Tulot, Siirrot). */
  group?: string;
}

export interface Override {
  /** FK -> Transaction.id. Unique key. */
  transactionId: string;
  category: string;
  class: CategoryClass;
}

export interface BudgetCategoryTarget {
  targetPct: number;
  targetCents: number;
}

export interface Budget {
  savingsGoalPct: number;
  categories: Record<string, BudgetCategoryTarget>;
}

export interface CategorySetting {
  category: string;
  visible: boolean;
  color: string;
}

export interface CustomCategory {
  name: string;
  class: CategoryClass;
  color: string;
}

export interface WealthEntry {
  label: string;
  amountCents: number;
}

export interface AssetGroup {
  label: string;
  isLiquid: boolean;
  entries: WealthEntry[];
}

export interface WealthSnapshot {
  /** = month */
  id: string;
  /** YYYY-MM */
  month: string;
  groups: AssetGroup[];
  debts: WealthEntry[];
  savingsContributionCents: number | null;
}

/** Persisted display preferences (T015). */
export interface DisplaySettings {
  /** The 4 categories shown as Dashboard quick-spend cards (FR-014). */
  quickSpendCategories: string[];
  /** Whether the combined fuel+car chart is hidden (FR-015). */
  carChartHidden: boolean;
}
