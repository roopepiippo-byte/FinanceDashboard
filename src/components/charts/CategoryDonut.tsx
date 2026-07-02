import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySpend } from "@/domain/totals";
import { formatEur } from "@/domain/money";
import { formatNumberFi } from "@/lib/format";
import { sumCents } from "@/domain/money";
import { cn } from "@/lib/cn";
import { CHART_COLORS, TOOLTIP_STYLE } from "./chartUtils";

interface CategoryDonutProps {
  data: CategorySpend[];
  colorOf: (category: string) => string;
  onSelect?: (category: string) => void;
}

const MAX_SLICES = 7;
const FOLD_KEY = "__muut__";
const FOLD_COLOR = "#5c6577";

/**
 * Expense breakdown: donut capped at 7 slices (tail folded into "Muut pienet"),
 * hero total in the center, and a value-labeled category list that is also the
 * drill-down control — values are readable without hovering.
 */
export function CategoryDonut({ data, colorOf, onSelect }: CategoryDonutProps) {
  const [active, setActive] = useState<string | null>(null);

  const view = useMemo(() => {
    const total = sumCents(data.map((d) => d.cents));
    const head = data.slice(0, MAX_SLICES);
    const tail = data.slice(MAX_SLICES);
    const slices = [
      ...head.map((d) => ({ key: d.category, cents: d.cents })),
      ...(tail.length > 0
        ? [{ key: FOLD_KEY, cents: sumCents(tail.map((d) => d.cents)) }]
        : []),
    ];
    return { total, slices, tailCount: tail.length };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted">
        Ei kuluja valitulla aikavälillä.
      </div>
    );
  }

  const fillOf = (key: string) =>
    key === FOLD_KEY ? FOLD_COLOR : colorOf(key);
  const labelOf = (key: string) =>
    key === FOLD_KEY ? `Muut pienet (${view.tailCount})` : key;

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
      {/* Donut with hero total in the hole */}
      <div className="relative h-[240px] w-[240px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={view.slices}
              dataKey="cents"
              nameKey="key"
              innerRadius={78}
              outerRadius={104}
              paddingAngle={1.5}
              stroke={CHART_COLORS.surface}
              strokeWidth={2}
              onClick={(_s, index) => {
                const key = view.slices[index]?.key;
                if (key && key !== FOLD_KEY) onSelect?.(key);
              }}
              onMouseEnter={(_s, index) =>
                setActive(view.slices[index]?.key ?? null)
              }
              onMouseLeave={() => setActive(null)}
              cursor={onSelect ? "pointer" : undefined}
            >
              {view.slices.map((s) => (
                <Cell
                  key={s.key}
                  fill={fillOf(s.key)}
                  opacity={active === null || active === s.key ? 1 : 0.35}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => [
                formatEur(Number(value)),
                labelOf(String(name)),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted">Kulut yhteensä</span>
          <span className="text-xl font-semibold text-text">
            {formatEur(view.total)}
          </span>
        </div>
      </div>

      {/* Value-labeled list = legend + drill-down */}
      <ul className="w-full min-w-0 flex-1 self-stretch overflow-y-auto sm:max-h-[240px]">
        {view.slices.map((s) => {
          const pct = view.total > 0 ? (s.cents / view.total) * 100 : 0;
          const isFold = s.key === FOLD_KEY;
          return (
            <li key={s.key}>
              <button
                disabled={isFold || !onSelect}
                onClick={() => onSelect?.(s.key)}
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  !isFold && onSelect && "hover:bg-bg",
                  active === s.key && "bg-bg",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: fillOf(s.key) }}
                />
                <span className="truncate text-text">{labelOf(s.key)}</span>
                <span className="ml-auto whitespace-nowrap tabular-nums text-muted">
                  {formatEur(s.cents)}
                </span>
                <span className="w-12 whitespace-nowrap text-right tabular-nums text-xs text-muted/70">
                  {formatNumberFi(pct)} %
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
