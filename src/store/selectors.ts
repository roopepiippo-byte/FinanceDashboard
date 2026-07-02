import type { Transaction, CategoryClass } from "@/types";
import { builtinClassOf, BUILTIN_CATEGORIES } from "@/domain/categories";
import { inRange, type DateRange } from "@/lib/dateRange";
import { useStore } from "./index";

export interface CategoryMeta {
  name: string;
  class: CategoryClass;
  color: string;
  visible: boolean;
}

/** All known categories (built-in + custom) with class/color/visibility. */
export function selectCategories(): CategoryMeta[] {
  const { categorySettings, customCategories } = useStore.getState();
  const customClass = new Map(customCategories.map((c) => [c.name, c.class]));
  const settingByName = new Map(categorySettings.map((s) => [s.category, s]));

  const names = new Set<string>([
    ...BUILTIN_CATEGORIES.map((c) => c.name),
    ...customCategories.map((c) => c.name),
    ...categorySettings.map((s) => s.category),
  ]);

  return [...names].map((name) => {
    const setting = settingByName.get(name);
    return {
      name,
      class: builtinClassOf(name) ?? customClass.get(name) ?? "expense",
      color: setting?.color ?? "#94a3b8",
      visible: setting?.visible ?? true,
    };
  });
}

export function categoryClassOf(name: string): CategoryClass {
  const { customCategories } = useStore.getState();
  return (
    builtinClassOf(name) ??
    customCategories.find((c) => c.name === name)?.class ??
    "expense"
  );
}

/** Transactions within a date range. */
export function transactionsInRange(
  txns: Transaction[],
  range: DateRange,
): Transaction[] {
  return txns.filter((t) => inRange(t.date, range));
}

/** Count of uncategorized transactions (sidebar badge, FR-030). */
export function useUncategorizedCount(): number {
  return useStore((s) => s.transactions.filter((t) => !t.category).length);
}

/** Set of visible category names (hidden excluded everywhere, FR-028). */
export function visibleCategoryNames(): Set<string> {
  return new Set(
    selectCategories()
      .filter((c) => c.visible)
      .map((c) => c.name),
  );
}
