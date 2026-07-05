import type { CategoryMapEntry } from "@/types";
import { canonicalCategoryName, builtinClassOf } from "@/domain/categories";

/**
 * Suggest a category for an unmapped merchant. Three tiers, most precise
 * first — pure logic, no I/O:
 *
 * 1. PAIRWISE: token overlap against individual rule patterns (catches
 *    sibling locations of a known chain, e.g. "k-supermarket pirkkala"
 *    from "k-supermarket nekala").
 * 2. TOKEN VOTE: a per-token statistic over the WHOLE rule set — if the
 *    word "pizzeria" appears in many rules and (nearly) always maps to
 *    Ravintola, a brand-new "Napoli Pizzeria" gets suggested even though
 *    no single pattern resembles it. The user's own labeling style is the
 *    training data, so it wins over the generic keyword base.
 * 3. KEYWORDS: a curated Finnish merchant-vocabulary fallback for words
 *    the rule set has never seen (hotelli -> Matkailu, katsastus -> Auto).
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
  /** Human-readable evidence (a pattern, a token statistic, or a keyword). */
  basedOn: string;
  /** 0..1-ish confidence; >= threshold to be returned. */
  score: number;
}

/**
 * Curated Finnish merchant vocabulary -> category. Fallback tier only:
 * applied when neither pairwise matching nor the user's own token
 * statistics produce a suggestion, and only for categories that exist.
 */
const KEYWORDS: Record<string, string> = {
  // Ruoka
  prisma: "Ruoka",
  lidl: "Ruoka",
  alepa: "Ruoka",
  citymarket: "Ruoka",
  supermarket: "Ruoka",
  // Ravintola
  ravintola: "Ravintola",
  pizzeria: "Ravintola",
  pizza: "Ravintola",
  kebab: "Ravintola",
  sushi: "Ravintola",
  burger: "Ravintola",
  hesburger: "Ravintola",
  mcdonalds: "Ravintola",
  subway: "Ravintola",
  kahvila: "Ravintola",
  cafe: "Ravintola",
  konditoria: "Ravintola",
  leipomo: "Ravintola",
  bistro: "Ravintola",
  grilli: "Ravintola",
  // Alko
  alko: "Alko",
  pub: "Alko",
  bar: "Alko",
  panimo: "Alko",
  brewery: "Alko",
  taproom: "Alko",
  // Bensa
  neste: "Bensa",
  shell: "Bensa",
  st1: "Bensa",
  teboil: "Bensa",
  seo: "Bensa",
  esso: "Bensa",
  // Auto
  parkman: "Auto",
  moovy: "Auto",
  easypark: "Auto",
  parking: "Auto",
  katsastus: "Auto",
  finnpark: "Auto",
  rengas: "Auto",
  // Matkailu
  hotel: "Matkailu",
  hotelli: "Matkailu",
  hostel: "Matkailu",
  airbnb: "Matkailu",
  booking: "Matkailu",
  bolt: "Matkailu",
  uber: "Matkailu",
  scandic: "Matkailu",
  finnair: "Matkailu",
  silja: "Matkailu",
  eckero: "Matkailu",
  // Terveys
  apteekki: "Terveys",
  pharmacy: "Terveys",
  hammas: "Terveys",
  terveystalo: "Terveys",
  // Urheilu
  golf: "Urheilu",
  padel: "Urheilu",
  tennis: "Urheilu",
  kuntosali: "Urheilu",
  gym: "Urheilu",
  fitness: "Urheilu",
  matchi: "Urheilu",
  uimahalli: "Urheilu",
  // Digi
  netflix: "Digi",
  spotify: "Digi",
  steam: "Digi",
  playstation: "Digi",
  xbox: "Digi",
  openai: "Digi",
  vpn: "Digi",
  // Koira
  musti: "Koira",
  kennel: "Koira",
  faunatar: "Koira",
  // Vaatteet
  kirpputori: "Vaatteet",
  uff: "Vaatteet",
  zara: "Vaatteet",
  // Vakuutus
  vakuutus: "Vakuutus",
  lähitapiola: "Vakuutus",
  lahitapiola: "Vakuutus",
  // Koti
  ikea: "Koti",
  jysk: "Koti",
  bauhaus: "Koti",
  rusta: "Koti",
  energia: "Koti",
  // Taksi
  taksi: "Taksi",
  taxi: "Taksi",
  // Viihde
  finnkino: "Viihde",
  teatteri: "Viihde",
};

/** Minimum vote weight (token length x purity) for a token-vote suggestion. */
const VOTE_MIN_WEIGHT = 4.5;
/** A token must map to one category in at least this share of its rules. */
const VOTE_MIN_PURITY = 0.7;

/**
 * Build a suggester over a rule set. Precomputes pattern tokens AND the
 * per-token category statistics ONCE — use this when scoring many merchants.
 */
export function createSuggester(
  entries: CategoryMapEntry[],
  threshold = 0.6,
): (merchantLower: string) => Suggestion | null {
  const prepared = entries
    .map((e) => ({ entry: e, tokens: tokensOf(e.pattern) }))
    .filter((p) => p.tokens.length > 0);

  // Token statistics: token -> category -> number of rules containing it.
  const tokenIndex = new Map<string, Map<string, number>>();
  for (const p of prepared) {
    for (const tok of new Set(p.tokens)) {
      const dist = tokenIndex.get(tok) ?? new Map<string, number>();
      dist.set(p.entry.category, (dist.get(p.entry.category) ?? 0) + 1);
      tokenIndex.set(tok, dist);
    }
  }
  const knownCategories = new Set(entries.map((e) => e.category));

  return (merchantLower) => {
    const merchantTokens = tokensOf(merchantLower);
    if (merchantTokens.length === 0) return null;

    // Tier 1: pairwise pattern similarity (sibling locations, brand rule).
    let best: Suggestion | null = null;
    for (const p of prepared) {
      const score = pairScore(merchantTokens, p.tokens);
      if (score >= threshold && (!best || score > best.score)) {
        best = { category: p.entry.category, basedOn: p.entry.pattern, score };
      }
    }
    if (best) return best;

    // Tier 2: token vote over the user's own rule statistics.
    const votes = new Map<
      string,
      { weight: number; token: string; count: number; total: number }
    >();
    for (const tok of new Set(merchantTokens)) {
      const dist = tokenIndex.get(tok);
      if (!dist) continue;
      let topCat = "";
      let topCount = 0;
      let total = 0;
      for (const [cat, n] of dist) {
        total += n;
        if (n > topCount) {
          topCount = n;
          topCat = cat;
        }
      }
      if (total < 2) continue; // one rule is an anecdote, not a pattern
      const purity = topCount / total;
      if (purity < VOTE_MIN_PURITY) continue;
      const weight = tok.length * purity;
      const cur = votes.get(topCat);
      if (!cur || weight > cur.weight) {
        votes.set(topCat, {
          weight: (cur?.weight ?? 0) + weight,
          token: tok,
          count: topCount,
          total,
        });
      } else {
        cur.weight += weight;
      }
    }
    let voteBest: { cat: string; v: { weight: number; token: string; count: number; total: number } } | null =
      null;
    for (const [cat, v] of votes) {
      if (!voteBest || v.weight > voteBest.v.weight) voteBest = { cat, v };
    }
    if (voteBest && voteBest.v.weight >= VOTE_MIN_WEIGHT) {
      return {
        category: voteBest.cat,
        basedOn: `sana ”${voteBest.v.token}” (${voteBest.v.count}/${voteBest.v.total} säännössä)`,
        score: 0.75,
      };
    }

    // Tier 3: curated keyword fallback (only for categories that exist).
    // The user's own statistics for the same token win over the keyword
    // base — if they file "pub" merchants under Ravintola, so do we.
    for (const tok of merchantTokens) {
      const kb = KEYWORDS[tok];
      if (!kb) continue;
      const dist = tokenIndex.get(tok);
      if (dist) {
        let topCat = "";
        let topCount = 0;
        let total = 0;
        for (const [cat, n] of dist) {
          total += n;
          if (n > topCount) {
            topCount = n;
            topCat = cat;
          }
        }
        if (total >= 2 && topCount / total >= VOTE_MIN_PURITY) {
          return {
            category: topCat,
            basedOn: `sana ”${tok}” (${topCount}/${total} säännössä)`,
            score: 0.7,
          };
        }
      }
      const canonical = canonicalCategoryName(kb);
      if (knownCategories.has(canonical) || builtinClassOf(canonical)) {
        return {
          category: canonical,
          basedOn: `avainsana ”${tok}”`,
          score: 0.65,
        };
      }
    }
    return null;
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
