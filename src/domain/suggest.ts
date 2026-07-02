import type { CategoryMapEntry } from "@/types";

/**
 * Suggest a category for an unmapped merchant by comparing it to existing
 * rule patterns. Merchants like "k-supermarket pirkkala" should suggest the
 * category of "k-supermarket nekala" even though no rule matches exactly.
 *
 * Scoring is token overlap between the merchant name and each rule's pattern
 * (glob stars stripped), weighted toward longer tokens and prefix matches.
 * Pure logic — no I/O.
 */

const NOISE = new Set(["oy", "ab", "oyj", "ky", "as", "the", "ja", "and"]);

function tokensOf(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\*/g, " ")
    .split(/[^a-z0-9åäö]+/)
    .filter((t) => t.length >= 2 && !NOISE.has(t) && !/^\d+$/.test(t));
}

function pairScore(merchantTokens: string[], patternTokens: string[]): number {
  if (merchantTokens.length === 0 || patternTokens.length === 0) return 0;

  // Brand rule: Finnish bank merchants lead with the brand token
  // ("alko hervanta", "neste parainen"). A shared distinctive first token
  // is strong evidence on its own.
  if (
    merchantTokens[0] === patternTokens[0] &&
    merchantTokens[0].length >= 3
  ) {
    return 0.9;
  }

  let score = 0;
  for (const mt of merchantTokens) {
    for (const pt of patternTokens) {
      if (mt === pt) {
        score += mt.length; // exact token: weight by length
      } else if (
        mt.length >= 4 &&
        pt.length >= 4 &&
        (mt.startsWith(pt) || pt.startsWith(mt))
      ) {
        score += Math.min(mt.length, pt.length) / 2; // prefix: half weight
      }
    }
  }
  // Normalize by the shorter side so "s-market x" vs "s-market y" scores high.
  const denom = Math.min(
    merchantTokens.reduce((a, t) => a + t.length, 0),
    patternTokens.reduce((a, t) => a + t.length, 0),
  );
  return denom > 0 ? score / denom : 0;
}

export interface Suggestion {
  category: string;
  /** The rule pattern the suggestion came from. */
  basedOn: string;
  /** 0..1-ish confidence; >= threshold to be returned. */
  score: number;
}

/**
 * Build a suggester over a rule set. Tokenizes every pattern ONCE — use this
 * when scoring many merchants against the same rules.
 */
export function createSuggester(
  entries: CategoryMapEntry[],
  threshold = 0.6,
): (merchantLower: string) => Suggestion | null {
  const prepared = entries
    .map((e) => ({ entry: e, tokens: tokensOf(e.pattern) }))
    .filter((p) => p.tokens.length > 0);

  return (merchantLower) => {
    const merchantTokens = tokensOf(merchantLower);
    if (merchantTokens.length === 0) return null;

    let best: Suggestion | null = null;
    for (const p of prepared) {
      const score = pairScore(merchantTokens, p.tokens);
      if (score >= threshold && (!best || score > best.score)) {
        best = {
          category: p.entry.category,
          basedOn: p.entry.pattern,
          score,
        };
      }
    }
    return best;
  };
}

/**
 * Best category suggestion for a merchant, or null when nothing is similar
 * enough. One-shot convenience wrapper around `createSuggester`.
 */
export function suggestCategory(
  merchantLower: string,
  entries: CategoryMapEntry[],
  threshold = 0.6,
): Suggestion | null {
  return createSuggester(entries, threshold)(merchantLower);
}
