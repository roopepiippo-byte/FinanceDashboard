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
    throw new Error(`Unparseable amount: "${raw}"`);
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    throw new Error(`Unparseable amount: "${raw}"`);
  }
  return roundCents(value * 100);
}

const eurFormatter = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
});

/** Format integer cents as a Finnish EUR string (display boundary only). */
export function formatEur(cents: number): string {
  return eurFormatter.format(cents / 100);
}
