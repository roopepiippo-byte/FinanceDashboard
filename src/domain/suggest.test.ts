import { describe, it, expect } from "vitest";
import { suggestCategory } from "./suggest";
import type { CategoryMapEntry } from "@/types";

const rules: CategoryMapEntry[] = [
  { pattern: "k-supermarket nekala", category: "Ruoka", class: "expense" },
  { pattern: "s-market tampere", category: "Ruoka", class: "expense" },
  { pattern: "neste parainen airis", category: "Bensa", class: "expense" },
  { pattern: "alko tampere ratina", category: "Alko", class: "expense" },
  { pattern: "fellowmind finland", category: "Palkka", class: "income" },
];

describe("suggestCategory", () => {
  it("suggests from a sibling location of a known chain", () => {
    const s = suggestCategory("k-supermarket pirkkala", rules);
    expect(s?.category).toBe("Ruoka");
    expect(s?.basedOn).toBe("k-supermarket nekala");
  });

  it("matches on shared distinctive tokens", () => {
    expect(suggestCategory("neste oyj helsinki", rules)?.category).toBe(
      "Bensa",
    );
    expect(suggestCategory("alko hervanta", rules)?.category).toBe("Alko");
  });

  it("returns null for unrelated merchants", () => {
    expect(suggestCategory("verkkokauppa.com oyj", rules)).toBeNull();
    expect(suggestCategory("kalmar oyj", rules)).toBeNull();
  });

  it("ignores noise tokens and numbers", () => {
    // "oy"/"ab" and digits must not create matches by themselves.
    expect(suggestCategory("random oy ab 1234", rules)).toBeNull();
  });

  it("returns null for empty or signal-free input", () => {
    expect(suggestCategory("", rules)).toBeNull();
    expect(suggestCategory("tuntematon liike", [])).toBeNull();
  });

  it("keyword tier works even with an empty rule set", () => {
    expect(suggestCategory("k-supermarket x", [])?.category).toBe("Ruoka");
  });
});

describe("suggestCategory — token vote (tier 2)", () => {
  const voteRules: CategoryMapEntry[] = [
    { pattern: "vfi*pizzeria roma", category: "Ravintola", class: "expense" },
    { pattern: "kallion pizzeria", category: "Ravintola", class: "expense" },
    { pattern: "oulun pizzeria po", category: "Ravintola", class: "expense" },
    { pattern: "tampereen apteekki 9", category: "Terveys", class: "expense" },
    { pattern: "kutomon apteekki", category: "Terveys", class: "expense" },
  ];

  it("generalizes from a token that consistently maps to one category", () => {
    // First tokens differ and no pattern is pairwise-similar, but the
    // token "pizzeria" is 3/3 Ravintola in the user's rules.
    const s = suggestCategory("napoli pizzeria helsinki", voteRules);
    expect(s?.category).toBe("Ravintola");
    expect(s?.basedOn).toContain("pizzeria");
  });

  it("stays quiet when a token maps to mixed categories", () => {
    const mixed: CategoryMapEntry[] = [
      { pattern: "aseman kioski etela", category: "Ruoka", class: "expense" },
      { pattern: "rautatie kioski", category: "Muu", class: "expense" },
      { pattern: "keskustan kioski itainen", category: "Digi", class: "expense" },
    ];
    expect(suggestCategory("uusi kioski pohjoinen", mixed)).toBeNull();
  });
});

describe("suggestCategory — keyword fallback (tier 3)", () => {
  it("suggests from the Finnish keyword base when rules have no signal", () => {
    const s = suggestCategory("seurahuoneen hotelli tampere", rules);
    expect(s?.category).toBe("Matkailu");
    expect(s?.basedOn).toContain("hotelli");
  });

  it("prefers the user's own token statistics over the keyword base", () => {
    // User files "pub" merchants under Ravintola; keyword base says Alko.
    const pubRules: CategoryMapEntry[] = [
      { pattern: "irlantilainen pub dublin", category: "Ravintola", class: "expense" },
      { pattern: "kylan pub kolo", category: "Ravintola", class: "expense" },
    ];
    const s = suggestCategory("uusi pub aleksi", pubRules);
    expect(s?.category).toBe("Ravintola");
  });
});
