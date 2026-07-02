/**
 * Date-range presets (FR-031). All ranges are inclusive ISO YYYY-MM-DD strings.
 */

export type RangePreset =
  | "thisMonth"
  | "lastMonth"
  | "last3"
  | "last6"
  | "last12"
  | "thisYear"
  | "lastYear"
  | "custom";

export interface DateRange {
  preset: RangePreset;
  from: string; // ISO YYYY-MM-DD
  to: string; // ISO YYYY-MM-DD
}

export const PRESET_LABELS_FI: Record<RangePreset, string> = {
  thisMonth: "Tämä kuukausi",
  lastMonth: "Viime kuukausi",
  last3: "Viimeiset 3kk",
  last6: "Viimeiset 6kk",
  last12: "Viimeiset 12kk",
  thisYear: "Tänä vuonna",
  lastYear: "Viime vuonna",
  custom: "Mukautettu",
};

function iso(y: number, m: number, d: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}`;
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

/** Compute a preset range relative to `today` (defaults to now). */
export function computeRange(preset: RangePreset, today = new Date()): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth() + 1; // 1-12
  const d = today.getDate();

  const mk = (from: string, to: string): DateRange => ({ preset, from, to });

  switch (preset) {
    case "thisMonth":
      return mk(iso(y, m, 1), iso(y, m, lastDayOfMonth(y, m)));
    case "lastMonth": {
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      return mk(iso(py, pm, 1), iso(py, pm, lastDayOfMonth(py, pm)));
    }
    case "last3":
    case "last6":
    case "last12": {
      const months = preset === "last3" ? 3 : preset === "last6" ? 6 : 12;
      const start = new Date(y, m - 1 - (months - 1), 1);
      return mk(
        iso(start.getFullYear(), start.getMonth() + 1, 1),
        iso(y, m, d),
      );
    }
    case "thisYear":
      return mk(iso(y, 1, 1), iso(y, 12, 31));
    case "lastYear":
      return mk(iso(y - 1, 1, 1), iso(y - 1, 12, 31));
    case "custom":
      return mk(iso(y, m, 1), iso(y, m, d));
  }
}

/** Inclusive membership test for ISO dates. */
export function inRange(dateIso: string, range: DateRange): boolean {
  return dateIso >= range.from && dateIso <= range.to;
}

/** The same-length range shifted back one year (for YoY deltas). */
export function priorYearRange(range: DateRange): DateRange {
  const shift = (isoDate: string) => {
    const [yy, mm, dd] = isoDate.split("-");
    return `${Number(yy) - 1}-${mm}-${dd}`;
  };
  return { preset: range.preset, from: shift(range.from), to: shift(range.to) };
}
