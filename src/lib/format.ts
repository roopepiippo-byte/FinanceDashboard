/**
 * Finnish date/number formatting and parsing.
 * Dates are stored internally as ISO YYYY-MM-DD; formatted at the display edge.
 */

/** Format an ISO date (YYYY-MM-DD) as Finnish dd.mm.yyyy. */
export function formatDateFi(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}.${Number(m)}.${y}`;
}

/** Format a YYYY-MM month as MM/yyyy. */
export function formatMonthFi(month: string): string {
  const [y, m] = month.split("-");
  if (!y || !m) return month;
  return `${m}/${y}`;
}

/** Parse a Finnish date (dd.mm.yyyy or d.m.yyyy) to ISO YYYY-MM-DD. */
export function parseFinnishDateToIso(raw: string): string {
  const parts = raw.trim().split(".");
  if (parts.length !== 3) {
    throw new Error(`Virheellinen päivämäärä: "${raw}"`);
  }
  const [d, m, y] = parts;
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 1000
  ) {
    throw new Error(`Virheellinen päivämäärä: "${raw}"`);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

const numberFormatter = new Intl.NumberFormat("fi-FI", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Format a plain number (e.g. a percentage) with Finnish conventions. */
export function formatNumberFi(value: number): string {
  return numberFormatter.format(value);
}

/** The YYYY-MM month of an ISO date. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}
