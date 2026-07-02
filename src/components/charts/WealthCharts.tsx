import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NetWorthPoint,
  LiquidPoint,
  SavingsReturnsPoint,
} from "@/domain/wealth";
import { formatEur } from "@/domain/money";
import {
  eurAxisTick,
  monthTick,
  CHART_COLORS,
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  AXIS_PROPS,
} from "./chartUtils";

const GROUP_PALETTE = [
  "#3987e5",
  "#199e70",
  "#c98500",
  "#9085e9",
  "#d55181",
  "#22b8cf",
];

const legendText = (value: string) => (
  <span style={{ color: CHART_COLORS.muted, fontSize: 12 }}>{value}</span>
);

export function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="networth-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.18} />
            <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthTick} {...AXIS_PROPS} />
        <YAxis tickFormatter={eurAxisTick} width={64} {...AXIS_PROPS} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          labelFormatter={(m) => monthTick(String(m))}
          formatter={(v) => [formatEur(Number(v)), "Nettovarallisuus"]}
        />
        <Area
          type="monotone"
          dataKey="netCents"
          stroke={CHART_COLORS.accent}
          strokeWidth={2}
          fill="url(#networth-wash)"
          activeDot={{ r: 4, stroke: CHART_COLORS.surface, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LiquidChart({
  points,
  groupLabels,
}: {
  points: LiquidPoint[];
  groupLabels: string[];
}) {
  const data = points.map((p) => ({
    month: p.month,
    ...Object.fromEntries(groupLabels.map((g) => [g, (p.groups[g] ?? 0) / 100])),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthTick} {...AXIS_PROPS} />
        <YAxis
          tickFormatter={(v) => eurAxisTick(Number(v) * 100)}
          width={64}
          {...AXIS_PROPS}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ fill: "rgba(139,149,167,0.08)" }}
          labelFormatter={(m) => monthTick(String(m))}
          formatter={(v, n) => [formatEur(Number(v) * 100), String(n)]}
        />
        {groupLabels.length > 1 && <Legend formatter={legendText} />}
        {groupLabels.map((g, i) => (
          <Bar
            key={g}
            dataKey={g}
            stackId="liquid"
            fill={GROUP_PALETTE[i % GROUP_PALETTE.length]}
            stroke={CHART_COLORS.surface}
            strokeWidth={1}
            maxBarSize={22}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WealthSourceChart({ data }: { data: SavingsReturnsPoint[] }) {
  const rows = data.map((p) => ({
    month: p.month,
    "Omat sijoitukset": p.ownCents / 100,
    Markkinatuotto: p.returnsCents / 100,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthTick} {...AXIS_PROPS} />
        <YAxis
          tickFormatter={(v) => eurAxisTick(Number(v) * 100)}
          width={64}
          {...AXIS_PROPS}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ fill: "rgba(139,149,167,0.08)" }}
          labelFormatter={(m) => monthTick(String(m))}
          formatter={(v, n) => [formatEur(Number(v) * 100), String(n)]}
        />
        <Legend formatter={legendText} />
        <Bar
          dataKey="Omat sijoitukset"
          stackId="src"
          fill={CHART_COLORS.accent}
          stroke={CHART_COLORS.surface}
          strokeWidth={1}
          maxBarSize={22}
        />
        <Bar
          dataKey="Markkinatuotto"
          stackId="src"
          fill="#199e70"
          stroke={CHART_COLORS.surface}
          strokeWidth={1}
          maxBarSize={22}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
