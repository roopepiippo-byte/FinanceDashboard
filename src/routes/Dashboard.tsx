import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store";
import { transactionsInRange } from "@/store/selectors";
import {
  computeKpis,
  categorySpend,
  spendForCategory,
  monthlyFlows,
  topMerchants,
  type MonthlyFlow,
} from "@/domain/totals";
import { formatEur } from "@/domain/money";
import { formatDateFi, formatNumberFi, monthOf } from "@/lib/format";
import { priorYearRange } from "@/lib/dateRange";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendChart } from "@/components/charts/TrendChart";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { CarChart, type CarPoint } from "@/components/charts/CarChart";
import { cn } from "@/lib/cn";

interface Delta {
  text: string;
  good: boolean;
}

function moneyDelta(current: number, prior: number, goodWhenUp: boolean): Delta {
  const diff = current - prior;
  const good = goodWhenUp ? diff >= 0 : diff <= 0;
  const arrow = diff >= 0 ? "▲" : "▼";
  return { text: `${arrow} ${formatEur(Math.abs(diff))}`, good };
}

export function Dashboard() {
  const transactions = useStore((s) => s.transactions);
  const range = useStore((s) => s.range);
  const settings = useStore((s) => s.settings);
  const categorySettings = useStore((s) => s.categorySettings);

  const [drill, setDrill] = useState<string | null>(null);

  const view = useMemo(() => {
    const visible = new Set(
      categorySettings.filter((s) => s.visible).map((s) => s.category),
    );
    const txns = transactionsInRange(transactions, range);
    const prior = transactionsInRange(transactions, priorYearRange(range));
    const kpis = computeKpis(txns, visible);
    const priorKpis = computeKpis(prior, visible);
    const spend = categorySpend(txns, visible);
    const monthly = monthlyFlows(txns, visible);
    const merchants = topMerchants(txns, visible, 8);

    const carByMonth = new Map<string, number>();
    for (const t of txns) {
      if ((t.category === "Bensa" || t.category === "Auto") && t.class === "expense") {
        const m = monthOf(t.date);
        carByMonth.set(m, (carByMonth.get(m) ?? 0) + -t.amountCents);
      }
    }
    const carData: CarPoint[] = [...carByMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, cents]) => ({ month, cents }));

    const quickSpend = settings.quickSpendCategories.map((c) => ({
      category: c,
      cents: spendForCategory(txns, c),
    }));

    return { txns, kpis, priorKpis, spend, monthly, carData, quickSpend, merchants };
  }, [transactions, range, settings.quickSpendCategories, categorySettings]);

  const colorMap = useMemo(() => {
    const m = new Map(categorySettings.map((s) => [s.category, s.color]));
    return (name: string) => m.get(name) ?? "#94a3b8";
  }, [categorySettings]);

  const { kpis, priorKpis, monthly } = view;

  const savingsDelta: Delta = (() => {
    const diff =
      Math.round((kpis.savingsRatePct - priorKpis.savingsRatePct) * 10) / 10;
    return {
      text: `${diff >= 0 ? "▲" : "▼"} ${formatNumberFi(Math.abs(diff))} %-yks.`,
      good: diff >= 0,
    };
  })();

  const sparks = useMemo(
    () => ({
      income: monthly.map((m: MonthlyFlow) => m.incomeCents),
      expense: monthly.map((m: MonthlyFlow) => m.expenseCents),
      net: monthly.map((m: MonthlyFlow) => m.netCents),
      rate: monthly.map((m: MonthlyFlow) =>
        m.incomeCents > 0 ? (m.netCents / m.incomeCents) * 100 : 0,
      ),
    }),
    [monthly],
  );

  if (view.txns.length === 0) {
    return (
      <Card className="text-sm text-muted">
        Ei tapahtumia valitulla aikavälillä. Vaihda aikaväliä oikean yläkulman
        valitsimesta tai tuo lisää tapahtumia.
      </Card>
    );
  }

  return (
    <div>
      {/* KPI stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          title="Tulot"
          value={formatEur(kpis.incomeCents)}
          delta={moneyDelta(kpis.incomeCents, priorKpis.incomeCents, true)}
          spark={sparks.income}
        />
        <Kpi
          title="Kulut"
          value={formatEur(kpis.expenseCents)}
          delta={moneyDelta(kpis.expenseCents, priorKpis.expenseCents, false)}
          spark={sparks.expense}
        />
        <Kpi
          title="Netto"
          value={formatEur(kpis.netCents)}
          delta={moneyDelta(kpis.netCents, priorKpis.netCents, true)}
          spark={sparks.net}
        />
        <Kpi
          title="Säästöaste"
          value={`${formatNumberFi(kpis.savingsRatePct)} %`}
          delta={savingsDelta}
          spark={sparks.rate}
        />
      </div>

      {(() => {
        const excluded = categorySettings.filter((s) => !s.visible).length;
        return excluded > 0 ? (
          <p className="mt-2 text-xs text-muted">
            {excluded} luokkaa jätetty pois laskuista —{" "}
            <Link
              to="/settings"
              className="text-accent hover:underline"
            >
              muokkaa Asetuksissa
            </Link>
          </p>
        ) : null;
      })()}

      {/* Quick-spend cards */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {view.quickSpend.map((q) => {
          const share =
            kpis.expenseCents > 0 ? (q.cents / kpis.expenseCents) * 100 : 0;
          return (
            <Card key={q.category} className="py-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: colorMap(q.category) }}
                />
                <CardTitle>{q.category}</CardTitle>
              </div>
              <p className="mt-1 text-xl font-semibold text-text">
                {formatEur(q.cents)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {formatNumberFi(share)} % kuluista
              </p>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Kassavirta kuukausittain</CardTitle>
          <div className="mt-3">
            <TrendChart data={view.monthly} />
          </div>
        </Card>
        <Card>
          <CardTitle>Kulut luokittain</CardTitle>
          <div className="mt-3">
            <CategoryDonut
              data={view.spend}
              colorOf={colorMap}
              onSelect={setDrill}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {!settings.carChartHidden && view.carData.length > 0 && (
          <Card>
            <CardTitle>Bensa + Auto</CardTitle>
            <div className="mt-3">
              <CarChart data={view.carData} />
            </div>
          </Card>
        )}
        {view.merchants.length > 0 && (
          <Card>
            <CardTitle>Suurimmat kauppiaat</CardTitle>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {view.merchants.map((m, i) => (
                  <tr
                    key={m.merchantLower}
                    className="border-b border-border last:border-0"
                  >
                    <td className="w-6 py-1.5 pr-2 text-xs tabular-nums text-muted/60">
                      {i + 1}
                    </td>
                    <td className="max-w-0 truncate py-1.5 pr-4 text-text">
                      {m.merchant}
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-4 text-right text-xs tabular-nums text-muted">
                      {m.count} kpl
                    </td>
                    <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-text">
                      {formatEur(m.cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Donut drill-down */}
      {drill && (
        <Card className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Tapahtumat: {drill}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setDrill(null)}>
              Sulje
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {view.txns
                  .filter((t) => t.category === drill)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2 pr-4 text-muted">
                        {formatDateFi(t.date)}
                      </td>
                      <td className="py-2 pr-4 text-text">{t.merchant}</td>
                      <td
                        className={cn(
                          "py-2 text-right tabular-nums",
                          t.amountCents < 0 ? "text-red" : "text-green",
                        )}
                      >
                        {formatEur(t.amountCents)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/** 12-point trend sparkline: de-emphasis line, current period as accent dot. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const pad = 3;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const last = pts[pts.length - 1];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className="shrink-0"
    >
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="#8b95a7"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="#6ea8fe" />
    </svg>
  );
}

function Kpi({
  title,
  value,
  delta,
  spark,
}: {
  title: string;
  value: string;
  delta: Delta | null;
  spark?: number[];
}) {
  return (
    <Card className="py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 truncate text-2xl font-semibold text-text">
            {value}
          </p>
        </div>
        {spark && <Sparkline values={spark} />}
      </div>
      {delta && (
        <p className="mt-2 text-xs">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 font-medium",
              delta.good
                ? "bg-green/10 text-green"
                : "bg-red/10 text-red",
            )}
          >
            {delta.text}
          </span>{" "}
          <span className="text-muted">vs. viime vuosi</span>
        </p>
      )}
    </Card>
  );
}
