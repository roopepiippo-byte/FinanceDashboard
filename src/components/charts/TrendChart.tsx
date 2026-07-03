import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyFlow } from "@/domain/totals";
import { formatEur } from "@/domain/money";
import {
  eurAxisTick,
  monthTick,
  CHART_COLORS,
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  AXIS_PROPS,
} from "./chartUtils";

const NAMES: Record<string, string> = {
  incomeCents: "Tulot",
  expenseCents: "Kulut",
  netCents: "Netto",
};

/** Monthly cash flow: income vs. expense bars with a net line (one € axis). */
export function TrendChart({
  data,
  onSelectMonth,
}: {
  data: MonthlyFlow[];
  /** Audit drill: a month bar was clicked. */
  onSelectMonth?: (month: string, dir: "income" | "expense") => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
        barGap={2}
      >
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthTick} {...AXIS_PROPS} />
        <YAxis tickFormatter={eurAxisTick} width={56} {...AXIS_PROPS} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ fill: "rgba(139,149,167,0.08)" }}
          labelFormatter={(m) => monthTick(String(m))}
          formatter={(value, name) => [
            formatEur(Number(value)),
            NAMES[String(name)] ?? String(name),
          ]}
        />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: CHART_COLORS.muted, fontSize: 12 }}>
              {NAMES[value] ?? value}
            </span>
          )}
        />
        <Bar
          dataKey="incomeCents"
          fill={CHART_COLORS.green}
          maxBarSize={18}
          radius={[4, 4, 0, 0]}
          cursor={onSelectMonth ? "pointer" : undefined}
          onClick={(d: { payload?: MonthlyFlow }) => {
            if (d?.payload?.month) onSelectMonth?.(d.payload.month, "income");
          }}
        />
        <Bar
          dataKey="expenseCents"
          fill={CHART_COLORS.red}
          maxBarSize={18}
          radius={[4, 4, 0, 0]}
          cursor={onSelectMonth ? "pointer" : undefined}
          onClick={(d: { payload?: MonthlyFlow }) => {
            if (d?.payload?.month) onSelectMonth?.(d.payload.month, "expense");
          }}
        />
        <Line
          type="monotone"
          dataKey="netCents"
          stroke={CHART_COLORS.accent}
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 4,
            stroke: CHART_COLORS.surface,
            strokeWidth: 2,
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
