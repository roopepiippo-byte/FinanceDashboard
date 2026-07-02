/**
 * Integer-cent money math (Constitution Principle II).
 * Money is ALWAYS an integer number of cents until the display boundary.
 * Rounding is centralized here (round-half-away-from-zero).
 */

/** Round a fractional cent value to an integer cent (half away from zero). */
export function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Multiply integer cents by a scalar factor, returning integer cents. */
export function scaleCents(cents: number, factor: number): number {
  return roundCents(cents * factor);
}

/**
 * Divide integer cents by a positive divisor, returning integer cents.
 * Used for averages (e.g. 12-month monthly average).
 */
export function divideCents(cents: number, divisor: number): number {
  if (divisor === 0) return 0;
  return roundCents(cents / divisor);
}

/** Sum a list of integer-cent values. */
export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/**
 * Percentage of a whole, in whole percent (0..100), rounded to `decimals`.
 * Returns 0 when the whole is 0. Pure ratio helper — not money.
 */
export function pctOf(part: number, whole: number, decimals = 1): number {
  if (whole === 0) return 0;
  const factor = 10 ** decimals;
  return Math.round((part / whole) * 100 * factor) / factor;
}

/** Cents implied by a percentage of a whole-cents base. */
export function centsFromPct(pct: number, wholeCents: number): number {
  return roundCents((pct / 100) * wholeCents);
}

/** Unicode minus sign (U+2212), sometimes used by exports. */
const UNICODE_MINUS = "−";

/** Parse a Finnish-formatted amount string to integer cents. */
export function parseFinnishAmountToCents(raw: string): number {
  const cleaned = raw
    .replace(/\s/g, "") // strip whitespace incl. nbsp thousands separators
    .split(UNICODE_MINUS)
    .join("-") // unicode minus -> hyphen
    .replace(",", ".") // comma decimal -> dot
    .trim();
  if (cleaned === "" || cleaned === "-") {
    throw new Error(`Virheellinen summa: "${raw}"`);
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    throw new Error(`Virheellinen summa: "${raw}"`);
  }
  return roundCents(value * 100);
}

/**
 * Lenient euro input parser for form fields. Accepts what a Finnish user
 * plausibly types or pastes: "5000", "12 500", "1 234,56", "1.234,56",
 * "12000.50", "12 500 €". Returns integer cents, or null when the input
 * is empty/unparseable (callers decide the fallback).
 */
export function parseEuroInputToCents(raw: string): number | null {
  let s = raw
    .replace(/€/g, "") // €
    .replace(/\s/g, "") // spaces incl. nbsp thousands separators
    .split(UNICODE_MINUS)
    .join("-");
  if (s === "" || s === "-") return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // "1.234,56": dots are thousands separators, comma is the decimal.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  // Only comma or dot as decimal — anything else is not a number.
  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  return roundCents(value * 100);
}

/**
 * Split a multi-cell paste (Google Sheets / Excel) into cleaned euro value
 * strings, in order. Handles:
 *  - a column copy: newline-separated lines ("4,00 €\n33,00 €\n…")
 *  - a row copy: one line of tab-separated cells
 *  - a two-column copy (label + value): per line, the LAST cell that parses
 *    as a number is taken
 * Blank cells stay as "" so positions keep their alignment. The returned
 * strings are display values ("4,00", "12 500") — parse with
 * `parseEuroInputToCents` when converting to cents.
 */
export function splitPastedEuroValues(text: string): string[] {
  const rows = text.replace(/\r/g, "").split("\n");
  while (rows.length > 0 && rows[rows.length - 1].trim() === "") rows.pop();

  const clean = (cell: string) => cell.replace(/€/g, "").trim();

  // A single line with tabs is a horizontal row copy: one value per cell.
  if (rows.length === 1) {
    return rows[0].split("\t").map(clean);
  }

  return rows.map((line) => {
    const cells = line.split("\t");
    for (let c = cells.length - 1; c >= 0; c--) {
      if (parseEuroInputToCents(cells[c]) !== null) return clean(cells[c]);
    }
    return "";
  });
}

const eurFormatter = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
});

/** Format integer cents as a Finnish EUR string (display boundary only). */
export function formatEur(cents: number): string {
  return eurFormatter.format(cents / 100);
}
