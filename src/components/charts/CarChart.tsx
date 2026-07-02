import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEur } from "@/domain/money";
import {
  eurAxisTick,
  monthTick,
  CHART_COLORS,
  TOOLTIP_STYLE,
  TOOLTIP_LABEL_STYLE,
  AXIS_PROPS,
} from "./chartUtils";

export interface CarPoint {
  month: string;
  cents: number;
}

/** Combined fuel (Bensa) + car (Auto) spend over time (FR-015). */
export function CarChart({ data }: { data: CarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthTick} {...AXIS_PROPS} />
        <YAxis tickFormatter={eurAxisTick} width={56} {...AXIS_PROPS} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ fill: "rgba(139,149,167,0.08)" }}
          labelFormatter={(m) => monthTick(String(m))}
          formatter={(value) => [formatEur(Number(value)), "Bensa + Auto"]}
        />
        <Bar
          dataKey="cents"
          fill="#d95926"
          maxBarSize={22}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
