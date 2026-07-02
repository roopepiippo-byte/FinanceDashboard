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

export type WealthAccountKind = "liquid" | "investment" | "debt";

/**
 * A fixed wealth account the user defines once (e.g. "S-pankki Rahastotili",
 * "Nordea Käyttötili", "Asuntolaina") and then fills a value for each month.
 */
export interface WealthAccount {
  id: string;
  name: string;
  kind: WealthAccountKind;
}

export interface WealthSnapshot {
  /** = month */
  id: string;
  /** YYYY-MM */
  month: string;
  /** accountId -> integer cents (debts entered as positive magnitudes). */
  values: Record<string, number>;
  savingsContributionCents: number | null;
}

/** Legacy (pre-account) snapshot shape; migrated on load. */
export interface LegacyWealthSnapshot {
  id: string;
  month: string;
  groups: {
    label: string;
    isLiquid: boolean;
    entries: { label: string; amountCents: number }[];
  }[];
  debts: { label: string; amountCents: number }[];
  savingsContributionCents: number | null;
}

/** Persisted display preferences (T015). */
export interface DisplaySettings {
  /** The 4 categories shown as Dashboard quick-spend cards (FR-014). */
  quickSpendCategories: string[];
  /** Whether the combined fuel+car chart is hidden (FR-015). */
  carChartHidden: boolean;
}
