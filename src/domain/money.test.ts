import { describe, it, expect } from "vitest";
import {
  roundCents,
  scaleCents,
  divideCents,
  sumCents,
  pctOf,
  centsFromPct,
  parseFinnishAmountToCents,
  parseEuroInputToCents,
  splitPastedEuroValues,
  formatEur,
} from "./money";

describe("roundCents", () => {
  it("rounds half away from zero", () => {
    expect(roundCents(100.5)).toBe(101);
    expect(roundCents(-100.5)).toBe(-101);
    expect(roundCents(100.4)).toBe(100);
    expect(roundCents(0)).toBe(0);
  });
});

describe("scaleCents / divideCents", () => {
  it("scales and divides to integer cents", () => {
    expect(scaleCents(10000, 0.15)).toBe(1500);
    expect(divideCents(10000, 3)).toBe(3333);
    expect(divideCents(10000, 0)).toBe(0);
  });
});

describe("sumCents", () => {
  it("sums without floating drift", () => {
    expect(sumCents([10, 20])).toBe(30);
    expect(sumCents([-4250, 1000, 250])).toBe(-3000);
    expect(sumCents([])).toBe(0);
  });
});

describe("pctOf", () => {
  it("computes percentage with rounding and zero-safety", () => {
    expect(pctOf(2500, 10000)).toBe(25);
    expect(pctOf(1, 3)).toBe(33.3);
    expect(pctOf(5, 0)).toBe(0);
  });
});

describe("centsFromPct", () => {
  it("computes cents from a percentage of a base", () => {
    expect(centsFromPct(15, 200000)).toBe(30000);
    expect(centsFromPct(0, 200000)).toBe(0);
  });
});

describe("parseFinnishAmountToCents", () => {
  const NBSP = String.fromCharCode(0x00a0);
  it("parses Finnish number formatting", () => {
    expect(parseFinnishAmountToCents("1 234,56")).toBe(123456); // space
    expect(parseFinnishAmountToCents("-42,50")).toBe(-4250);
    expect(parseFinnishAmountToCents(`1${NBSP}000,00`)).toBe(100000); // nbsp
    expect(parseFinnishAmountToCents("800")).toBe(80000); // whole euros
    expect(parseFinnishAmountToCents("0,05")).toBe(5);
  });

  it("parses a unicode-minus amount", () => {
    expect(parseFinnishAmountToCents("−42,50")).toBe(-4250);
  });

  it("throws on unparseable input", () => {
    expect(() => parseFinnishAmountToCents("abc")).toThrow();
    expect(() => parseFinnishAmountToCents("")).toThrow();
  });
});

describe("parseEuroInputToCents", () => {
  const NBSP = String.fromCharCode(0x00a0);
  it("accepts plain, spaced, comma and mixed formats", () => {
    expect(parseEuroInputToCents("5000")).toBe(500000);
    expect(parseEuroInputToCents("12 500")).toBe(1250000);
    expect(parseEuroInputToCents(`12${NBSP}500`)).toBe(1250000);
    expect(parseEuroInputToCents("1 234,56")).toBe(123456);
    expect(parseEuroInputToCents("1.234,56")).toBe(123456);
    expect(parseEuroInputToCents("12000.50")).toBe(1200050);
    expect(parseEuroInputToCents("12 500 €")).toBe(1250000);
    expect(parseEuroInputToCents("-42,50")).toBe(-4250);
  });

  it("returns null for empty or garbage input", () => {
    expect(parseEuroInputToCents("")).toBeNull();
    expect(parseEuroInputToCents("   ")).toBeNull();
    expect(parseEuroInputToCents("abc")).toBeNull();
    expect(parseEuroInputToCents("-")).toBeNull();
  });
});

describe("splitPastedEuroValues", () => {
  it("splits a Sheets column copy (values with €, CRLF, trailing newline)", () => {
    const text = "4,00 €\r\n0,00 €\r\n12 500,00 €\r\n";
    expect(splitPastedEuroValues(text)).toEqual(["4,00", "0,00", "12 500,00"]);
  });

  it("splits a horizontal row copy on tabs", () => {
    expect(splitPastedEuroValues("4,00 €\t33,00 €\t78,00 €")).toEqual([
      "4,00",
      "33,00",
      "78,00",
    ]);
  });

  it("takes the last numeric cell from a label+value column copy", () => {
    const text = "S-pankki Rahastotili\t4,00 €\nNordea Käyttötili\t33,00 €";
    expect(splitPastedEuroValues(text)).toEqual(["4,00", "33,00"]);
  });

  it("keeps blank cells as empty strings to preserve alignment", () => {
    expect(splitPastedEuroValues("4,00\n\n9,00\n")).toEqual(["4,00", "", "9,00"]);
  });

  it("handles a single plain value", () => {
    expect(splitPastedEuroValues("55,00 €")).toEqual(["55,00"]);
  });
});

describe("formatEur", () => {
  it("formats integer cents as Finnish EUR", () => {
    const s = formatEur(123456);
    expect(s).toMatch(/1\s?234,56/);
    expect(s).toContain("€");
    expect(formatEur(-4250)).toContain("42,50");
  });
});
