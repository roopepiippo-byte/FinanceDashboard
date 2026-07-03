import type {
  Transaction,
  CategoryMapEntry,
  Override,
  CategoryClass,
} from "@/types";
import { compileGlob } from "@/lib/glob";

export interface ResolvedCategory {
  category: string | null;
  class: CategoryClass | null;
  isManualOverride: boolean;
}

/**
 * Precompiled rule index. Almost all patterns are plain merchant keys
 * (no `*`), which resolve via a single Map lookup; only true globs are
 * compiled to RegExp — once, not per transaction.
 */
export interface CategoryMatcher {
  match(merchantLower: string): CategoryMapEntry | null;
}

export function createMatcher(map: CategoryMapEntry[]): CategoryMatcher {
  const exact = new Map<string, CategoryMapEntry>();
  const globs: { entry: CategoryMapEntry; re: RegExp }[] = [];

  for (const entry of map) {
    if (entry.pattern.includes("*")) {
      globs.push({ entry, re: compileGlob(entry.pattern) });
    } else {
      exact.set(entry.pattern.toLowerCase(), entry);
    }
  }
  // Longest pattern wins (ties lexicographic) — sort once so the first
  // matching glob is the best glob.
  globs.sort(
    (a, b) =>
      b.entry.pattern.length - a.entry.pattern.length ||
      a.entry.pattern.localeCompare(b.entry.pattern),
  );

  const cache = new Map<string, CategoryMapEntry | null>();

  return {
    match(merchantLower: string): CategoryMapEntry | null {
      const cached = cache.get(merchantLower);
      if (cached !== undefined) return cached;

      const exactHit = exact.get(merchantLower) ?? null;
      let globHit: CategoryMapEntry | null = null;
      for (const g of globs) {
        if (g.re.test(merchantLower)) {
          globHit = g.entry;
          break;
        }
      }

      let best: CategoryMapEntry | null;
      if (exactHit && globHit) {
        // Same longest-wins rule across both kinds.
        best =
          globHit.pattern.length > exactHit.pattern.length ||
          (globHit.pattern.length === exactHit.pattern.length &&
            globHit.pattern.localeCompare(exactHit.pattern) < 0)
            ? globHit
            : exactHit;
      } else {
        best = exactHit ?? globHit;
      }

      cache.set(merchantLower, best);
      return best;
    },
  };
}

/**
 * Resolve a transaction's category by priority (FR-011):
 *   1. manual override (highest)
 *   2. category-map match (longest pattern wins)
 *   3. uncategorized
 */
export function resolveCategory(
  merchantLower: string,
  txnId: string,
  map: CategoryMapEntry[],
  overrides: Map<string, Override>,
  matcher: CategoryMatcher = createMatcher(map),
): ResolvedCategory {
  const override = overrides.get(txnId);
  if (override) {
    return {
      category: override.category,
      class: override.class,
      isManualOverride: true,
    };
  }

  const entry = matcher.match(merchantLower);
  if (entry) {
    return {
      category: entry.category,
      class: entry.class,
      isManualOverride: false,
    };
  }

  return { category: null, class: null, isManualOverride: false };
}

/**
 * Apply category-level class overrides (Asetukset) on top of resolved
 * transactions: the user can redefine e.g. "Ginstia" as income even though
 * the built-in default or the rule entries say expense. Applied uniformly,
 * including manually overridden rows — class is a property of the category.
 */
export function applyClassOverrides(
  txns: Transaction[],
  classByCategory: Map<string, CategoryClass>,
): Transaction[] {
  if (classByCategory.size === 0) return txns;
  return txns.map((t) => {
    const cls = t.category ? classByCategory.get(t.category) : undefined;
    return cls && cls !== t.class ? { ...t, class: cls } : t;
  });
}

/** Apply resolution to a list of transactions, returning new objects. */
export function resolveAll(
  txns: Transaction[],
  map: CategoryMapEntry[],
  overrideList: Override[],
): Transaction[] {
  const overrides = new Map(overrideList.map((o) => [o.transactionId, o]));
  const matcher = createMatcher(map);
  return txns.map((t) => {
    const r = resolveCategory(t.merchantLower, t.id, map, overrides, matcher);
    return {
      ...t,
      category: r.category,
      class: r.class,
      isManualOverride: r.isManualOverride,
    };
  });
}
