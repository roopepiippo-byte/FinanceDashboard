import { describe, it, expect } from "vitest";
import { matchesGlob, bestGlobMatch } from "./glob";

describe("matchesGlob", () => {
  it("matches trailing wildcard", () => {
    expect(matchesGlob("k-supermarket*", "k-supermarket kamppi")).toBe(true);
    expect(matchesGlob("k-supermarket*", "s-market")).toBe(false);
  });

  it("matches exact pattern without wildcard", () => {
    expect(matchesGlob("nordea", "nordea")).toBe(true);
    expect(matchesGlob("nordea", "nordea pankki")).toBe(false);
  });

  it("treats regex metacharacters literally", () => {
    expect(matchesGlob("a.b*", "a.b company")).toBe(true);
    expect(matchesGlob("a.b*", "axb company")).toBe(false);
  });

  it("supports interior wildcards", () => {
    expect(matchesGlob("shell*helsinki", "shell 123 helsinki")).toBe(true);
  });
});

describe("bestGlobMatch", () => {
  it("returns the longest (most specific) matching pattern", () => {
    const patterns = ["k*", "k-supermarket*", "s*"];
    expect(bestGlobMatch(patterns, "k-supermarket kamppi")).toBe(
      "k-supermarket*",
    );
  });

  it("returns null when nothing matches", () => {
    expect(bestGlobMatch(["a*", "b*"], "zzz")).toBeNull();
  });
});
