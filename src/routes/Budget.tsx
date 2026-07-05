import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useStore } from "@/store";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/domain/money";
import { formatNumberFi, monthOf, formatMonthFi } from "@/lib/format";
import {
  avgMonthlyIncomeCents,
  budgetHistory,
  pctToTargetCents,
  targetCentsToPct,
  allocation,
  monthSpendByCategory,
} from "@/domain/budget";
import { cn } from "@/lib/cn";
import { flowDirection, monthlyFlows } from "@/domain/totals";
import {
  TransactionsDrawer,
  type AuditQuery,
} from "@/components/TransactionsDrawer";
import type { Budget as BudgetType } from "@/types";

export function Budget() {
  const transactions = useStore((s) => s.transactions);
  const budget = useStore((s) => s.budget);
  const saveBudget = useStore((s) => s.saveBudget);
  const categorySettings = useStore((s) => s.categorySettings);

  const visible = useMemo(
    () =>
      new Set(
        categorySettings.filter((s) => s.visible).map((s) => s.category),
      ),
    [categorySettings],
  );
  const avgIncome = useMemo(
    () => avgMonthlyIncomeCents(transactions, visible),
    [transactions, visible],
  );
  const history = useMemo(
    () => budgetHistory(transactions, visible),
    [transactions, visible],
  );

  const [audit, setAudit] = useState<AuditQuery | null>(null);

  // Months that actually have transactions; the meters default to the
  // LATEST one (the calendar month is often still empty of data).
  const months = useMemo(
    () => [...new Set(transactions.map((t) => monthOf(t.date)))].sort(),
    [transactions],
  );
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const meterMonth =
    pickedMonth ?? months[months.length - 1] ?? new Date().toISOString().slice(0, 7);
  const monthIdx = months.indexOf(meterMonth);

  const monthMeters = useMemo(() => {
    const spend = monthSpendByCategory(transactions, visible, meterMonth);
    return Object.entries(budget.categories)
      .filter(([, t]) => t.targetCents > 0)
      .map(([category, target]) => ({
        category,
        targetCents: target.targetCents,
        spentCents: spend.get(category) ?? 0,
        ratio: (spend.get(category) ?? 0) / target.targetCents,
      }))
      .sort((a, b) => b.ratio - a.ratio);
  }, [transactions, visible, budget.categories, meterMonth]);

  function openMeter(category: string) {
    setAudit({
      title: `${category} — ${formatMonthFi(meterMonth)}`,
      txns: transactions.filter(
        (t) =>
          t.category === category &&
          visible.has(t.category) &&
          monthOf(t.date) === meterMonth &&
          flowDirection(t) === "expense",
      ),
    });
  }

  function update(next: Partial<BudgetType>) {
    void saveBudget({ ...budget, ...next });
  }

  function setTargetPct(category: string, pct: number) {
    update({
      categories: {
        ...budget.categories,
        [category]: {
          targetPct: pct,
          targetCents: pctToTargetCents(pct, avgIncome),
        },
      },
    });
  }

  function setTargetEur(category: string, euros: number) {
    const cents = Math.round(euros * 100);
    update({
      categories: {
        ...budget.categories,
        [category]: {
          targetPct: targetCentsToPct(cents, avgIncome),
          targetCents: cents,
        },
      },
    });
  }

  function fillFromHistory() {
    const categories = { ...budget.categories };
    for (const row of history) {
      categories[row.category] = {
        targetPct: row.avgPct,
        targetCents: pctToTargetCents(row.avgPct, avgIncome),
      };
    }
    update({ categories });
  }

  const alloc = allocation(
    budget.savingsGoalPct,
    history.map((r) => budget.categories[r.category]?.targetPct ?? 0),
  );

  // Reality check: actual savings rate over the last 12 data months.
  const actualSavingsPct = useMemo(() => {
    const flows = monthlyFlows(transactions, visible).slice(-12);
    const income = flows.reduce((a, f) => a + f.incomeCents, 0);
    const expense = flows.reduce((a, f) => a + f.expenseCents, 0);
    return income > 0
      ? Math.round(((income - expense) / income) * 1000) / 10
      : null;
  }, [transactions, visible]);

  const pieData = [
    { name: "Säästöt", value: Math.max(0, alloc.savingsPct), color: "#4ade80" },
    {
      name: "Kohdennettu",
      value: Math.max(0, alloc.allocatedPct),
      color: "#6ea8fe",
    },
    {
      name: "Kohdentamaton",
      value: Math.max(0, alloc.unallocatedPct),
      color: "#8b95a7",
    },
  ];

  if (transactions.length === 0) {
    return (
      <Card className="text-sm text-muted">
        Tuo tapahtumia nähdäksesi budjetin.
      </Card>
    );
  }

  return (
    <div>
      {/* Month vs targets */}
      {monthMeters.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <CardTitle>
              Kuukausi vs. tavoite — {formatMonthFi(meterMonth)}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={monthIdx <= 0}
                onClick={() => setPickedMonth(months[monthIdx - 1])}
                title="Edellinen kuukausi"
              >
                ‹
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={monthIdx < 0 || monthIdx >= months.length - 1}
                onClick={() => setPickedMonth(months[monthIdx + 1])}
                title="Seuraava kuukausi"
              >
                ›
              </Button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 lg:grid-cols-2">
            {monthMeters.map((m) => {
              const pct = Math.min(m.ratio * 100, 100);
              const over = m.ratio > 1;
              const near = m.ratio > 0.8 && m.ratio <= 1;
              return (
                <button
                  key={m.category}
                  onClick={() => openMeter(m.category)}
                  title="Näytä kuukauden tapahtumat"
                  className="block w-full rounded-md text-left transition-colors hover:bg-card-2"
                >
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-text">{m.category}</span>
                    <span className="tabular-nums text-xs text-muted">
                      <span className={cn(over && "font-medium text-red")}>
                        {formatEur(m.spentCents)}
                      </span>{" "}
                      / {formatEur(m.targetCents)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "h-2 overflow-hidden rounded-full",
                      over
                        ? "bg-red/15"
                        : near
                          ? "bg-amber-400/15"
                          : "bg-accent/15",
                    )}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        over
                          ? "bg-red"
                          : near
                            ? "bg-amber-400"
                            : "bg-accent",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardTitle>Säästötavoite</CardTitle>
          <p className="mt-1 text-xs text-muted">
            Osuus kuukausituloista ({formatEur(avgIncome)}/kk)
          </p>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={budget.savingsGoalPct}
              onChange={(e) => update({ savingsGoalPct: Number(e.target.value) })}
              className="flex-1 accent-[var(--color-accent)]"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={budget.savingsGoalPct}
              onChange={(e) =>
                update({ savingsGoalPct: Number(e.target.value) })
              }
              className="h-9 w-16 rounded-md border border-border bg-bg px-2 text-sm text-text"
            />
            <span className="text-sm text-muted">%</span>
          </div>

          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#141924",
                    border: "1px solid #232a38",
                    borderRadius: 8,
                    color: "#e6eaf2",
                  }}
                  formatter={(v, n) => [`${formatNumberFi(Number(v))} %`, String(n)]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Plan breakdown in euros — the pie explained */}
            <ul className="mt-2 space-y-1 text-xs">
              {[
                {
                  ...pieData[0],
                  hint: "tavoitteesi: jää säästöön",
                },
                {
                  ...pieData[1],
                  hint: "luokkabudjettien summa (taulukon Tavoite-%:t)",
                },
                {
                  ...pieData[2],
                  hint: "ilman suunnitelmaa — kasvata säästötavoitetta tai luokkabudjetteja",
                },
              ].map((d) => (
                <li key={d.name} className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="min-w-0 flex-1 text-muted">
                    <span className="text-text">{d.name}</span>{" "}
                    <span className="tabular-nums">
                      {formatNumberFi(d.value)} % ·{" "}
                      {formatEur(pctToTargetCents(d.value, avgIncome))}/kk
                    </span>
                    <span className="block text-muted/70">{d.hint}</span>
                  </span>
                </li>
              ))}
            </ul>

            {actualSavingsPct !== null && (
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
                Toteutunut säästöaste (12 kk):{" "}
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    actualSavingsPct >= budget.savingsGoalPct
                      ? "text-green"
                      : "text-red",
                  )}
                >
                  {formatNumberFi(actualSavingsPct)} %
                </span>{" "}
                vs. tavoite{" "}
                <span className="tabular-nums">
                  {formatNumberFi(budget.savingsGoalPct)} %
                </span>
                {actualSavingsPct > budget.savingsGoalPct + 5 &&
                  " — säästät jo enemmän kuin tavoitteesi; tavoitetta voi nostaa."}
              </p>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Kohdennus luokittain</CardTitle>
            <Button variant="outline" size="sm" onClick={fillFromHistory}>
              Täytä 12kk historiasta
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2 pr-4 font-medium">Luokka</th>
                  <th className="py-2 pr-4 font-medium">12kk ka %</th>
                  <th className="py-2 pr-4 font-medium">Viime kk %</th>
                  <th className="py-2 pr-4 font-medium">Tavoite %</th>
                  <th className="py-2 font-medium">Tavoite €/kk</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => {
                  const target = budget.categories[row.category];
                  return (
                    <tr
                      key={row.category}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2 pr-4 text-text">{row.category}</td>
                      <td className="py-2 pr-4 text-muted">
                        {formatNumberFi(row.avgPct)} %
                      </td>
                      <td className="py-2 pr-4 text-muted">
                        {formatNumberFi(row.lastMonthPct)} %
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          value={target?.targetPct ?? 0}
                          onChange={(e) =>
                            setTargetPct(row.category, Number(e.target.value))
                          }
                          className="h-8 w-20 rounded-md border border-border bg-bg px-2 text-text"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          value={Math.round((target?.targetCents ?? 0) / 100)}
                          onChange={(e) =>
                            setTargetEur(row.category, Number(e.target.value))
                          }
                          className="h-8 w-24 rounded-md border border-border bg-bg px-2 text-text"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {audit && (
        <TransactionsDrawer query={audit} onClose={() => setAudit(null)} />
      )}
    </div>
  );
}
