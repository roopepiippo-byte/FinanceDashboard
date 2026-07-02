import type { CSSProperties } from "react";
import { formatMonthFi } from "@/lib/format";

const eurAxis = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 0,
});

/** Cents -> compact euro string for axes. */
export function eurAxisTick(cents: number): string {
  const eur = Math.round(cents / 100);
  if (Math.abs(eur) >= 10000) {
    return `${eurAxis.format(Math.round(eur / 1000))} t€`;
  }
  return `${eurAxis.format(eur)} €`;
}

export const monthTick = formatMonthFi;

export const CHART_COLORS = {
  green: "#4ade80",
  red: "#f87171",
  accent: "#6ea8fe",
  grid: "#1d2330",
  muted: "#8b95a7",
  surface: "#141924",
};

/** One shared Recharts tooltip style (card surface, hairline border). */
export const TOOLTIP_STYLE: CSSProperties = {
  background: "#101521",
  border: "1px solid #2a3244",
  borderRadius: 10,
  color: "#e6eaf2",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};

export const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "#8b95a7",
  marginBottom: 4,
};

/** Shared axis props (recessive, hairline). */
export const AXIS_PROPS = {
  stroke: CHART_COLORS.muted,
  fontSize: 11,
  tickLine: false as const,
  axisLine: false as const,
};
