/**
 * Glob matching for merchant->category rules.
 * Patterns support `*` (any run of characters) matched against merchantLower.
 */

/** Compile a glob pattern to an anchored RegExp (callers should cache this). */
export function compileGlob(pattern: string): RegExp {
  // Escape every regex metacharacter EXCEPT `*`, then turn `*` into `.*`.
  const escaped = pattern
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

const globToRegExp = compileGlob;

/** True if `pattern` matches `merchantLower`. */
export function matchesGlob(pattern: string, merchantLower: string): boolean {
  return globToRegExp(pattern).test(merchantLower);
}

/**
 * Given candidate patterns, return the best match for `merchantLower`, or null.
 * Determinism: the LONGEST matching pattern wins (most specific), ties broken
 * lexicographically.
 */
export function bestGlobMatch(
  patterns: string[],
  merchantLower: string,
): string | null {
  const matches = patterns.filter((p) => matchesGlob(p, merchantLower));
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return matches[0];
}
