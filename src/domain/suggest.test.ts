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

  it("returns null for empty input", () => {
    expect(suggestCategory("", rules)).toBeNull();
    expect(suggestCategory("k-supermarket x", [])).toBeNull();
  });
});
