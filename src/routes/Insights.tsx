import { useMemo, useState } from "react";
import { useStore } from "@/store";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TransactionsDrawer,
  type AuditQuery,
} from "@/components/TransactionsDrawer";
import { ResizableTable } from "@/components/ui/ResizableTable";
import {
  dataMonths,
  monthMovers,
  detectRecurring,
  yearComparison,
  categorySeries,
  topCategories,
} from "@/domain/insights";
import { monthlyFlows, flowDirection } from "@/domain/totals";
import { snapshotTotals } from "@/domain/wealth";
import { formatEur, sumCents } from "@/domain/money";
import { formatMonthFi, formatNumberFi, monthOf, formatDateFi } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Insights() {
  const transactions = useStore((s) => s.transactions);
  const categorySettings = useStore((s) => s.categorySettings);
  const wealthSnapshots = useStore((s) => s.wealthSnapshots);
  const wealthAccounts = useStore((s) => s.wealthAccounts);

  const [audit, setAudit] = useState<AuditQuery | null>(null);
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      new Set(
        categorySettings.filter((s) => s.visible).map((s) => s.category),
      ),
    [categorySettings],
  );
  const colorOf = useMemo(() => {
    const m = new Map(categorySettings.map((s) => [s.category, s.color]));
    return (name: string) => m.get(name) ?? "#94a3b8";
  }, [categorySettings]);

  const months = useMemo(
    () => dataMonths(transactions, visible),
    [transactions, visible],
  );
  const meterMonth = pickedMonth ?? months[months.length - 1];
  const monthIdx = months.indexOf(meterMonth);

  const movers = useMemo(
    () => (meterMonth ? monthMovers(transactions, visible, meterMonth) : []),
    [transactions, visible, meterMonth],
  );
  const recurring = useMemo(
    () => detectRecurring(transactions),
    [transactions],
  );
  const yoy = useMemo(
    () => yearComparison(transactions, visible),
    [transactions, visible],
  );

  const trendMonths = useMemo(() => months.slice(-12), [months]);
  const trendCats = useMemo(
    () => topCategories(transactions, visible, trendMonths, 8),
    [transactions, visible, trendMonths],
  );

  // Tiles: recurring total, 6-month average burn, runway from liquid wealth.
  const recurringTotal = sumCents(recurring.map((r) => r.monthlyCents));
  const burn = useMemo(() => {
    const flows = monthlyFlows(transactions, visible).slice(-6);
    if (flows.length === 0) return 0;
    return Math.round(
      flows.reduce((a, f) => a + f.expenseCents, 0) / flows.length,
    );
  }, [transactions, visible]);
  const liquid = useMemo(() => {
    const latest = wealthSnapshots[wealthSnapshots.length - 1];
    return latest ? snapshotTotals(latest, wealthAccounts).liquidCents : null;
  }, [wealthSnapshots, wealthAccounts]);
  const runwayMonths =
    liquid !== null && burn > 0 ? liquid / burn : null;

  /* ---- drills ---- */
  const openCategoryMonth = (category: string, month: string) =>
    setAudit({
      title: `${category} — ${formatMonthFi(month)}`,
      txns: transactions.filter(
        (t) =>
          t.category === category &&
          monthOf(t.date) === month &&
          flowDirection(t) === "expense",
      ),
    });
  const openMerchant = (merchantLower: string, merchant: string) =>
    setAudit({
      title: merchant,
      txns: transactions.filter(
        (t) =>
          t.merchantLower === merchantLower && flowDirection(t) === "expense",
      ),
    });
  const openCategoryYtd = (category: string) => {
    if (!yoy) return;
    setAudit({
      title: `${category} — 01–${String(yoy.throughMonth).padStart(2, "0")}/${yoy.year}`,
      txns: transactions.filter(
        (t) =>
          t.category === category &&
          Number(t.date.slice(0, 4)) === yoy.year &&
          Number(t.date.slice(5, 7)) <= yoy.throughMonth &&
          flowDirection(t) === "expense",
      ),
    });
  };

  if (months.length === 0) {
    return (
      <Card className="text-sm text-muted">
        Ei analysoitavia tapahtumia vielä. Tuo tapahtumia ja luokittele ne.
      </Card>
    );
  }

  const increases = movers.filter((m) => m.deltaPrevCents > 0).slice(0, 5);
  const decreases = movers
    .filter((m) => m.deltaPrevCents < 0)
    .slice(-5)
    .reverse();

  return (
    <div>
      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="py-4">
          <CardTitle>Toistuvat maksut</CardTitle>
          <CardValue>{formatEur(recurringTotal)}/kk</CardValue>
          <p className="mt-0.5 text-xs text-muted">
            {recurring.length} tunnistettua tilausta/sitoumusta
          </p>
        </Card>
        <Card className="py-4">
          <CardTitle>Keskikulut</CardTitle>
          <CardValue>{formatEur(burn)}/kk</CardValue>
          <p className="mt-0.5 text-xs text-muted">
            6 kk keskiarvo, mukana olevat luokat
          </p>
        </Card>
        {runwayMonths !== null && (
          <Card className="py-4">
            <CardTitle>Puskuri</CardTitle>
            <CardValue>
              {formatNumberFi(Math.round(runwayMonths * 10) / 10)} kk
            </CardValue>
            <p className="mt-0.5 text-xs text-muted">
              Likvidit varat ({formatEur(liquid!)}) ÷ keskikulut
            </p>
          </Card>
        )}
      </div>

      {/* Month movers */}
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <CardTitle>
            Kuukausikatsaus — {formatMonthFi(meterMonth)} vs. edellinen
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
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
          <MoverList
            title="Kasvoivat eniten"
            rows={increases}
            onSelect={(c) => openCategoryMonth(c, meterMonth)}
            colorOf={colorOf}
          />
          <MoverList
            title="Laskivat eniten"
            rows={decreases}
            onSelect={(c) => openCategoryMonth(c, meterMonth)}
            colorOf={colorOf}
          />
        </div>
      </Card>

      {/* Recurring charges */}
      <Card className="mt-4 p-0">
        <div className="px-5 pt-5">
          <CardTitle>Toistuvat maksut</CardTitle>
          <p className="mt-1 text-xs text-muted">
            Tunnistettu kuukausirytmistä ja vakaasta summasta. Sisältää myös
            laskuista pois jätetyt luokat (esim. vastike, lainat) — sitoumus on
            sitoumus.
          </p>
        </div>
        <div className="mt-3">
          <ResizableTable
            id="recurring"
            columns={[
              { id: "merchant", width: 280, min: 120, header: "Maksunsaaja" },
              { id: "category", width: 130, min: 90, header: "Luokka" },
              { id: "n", width: 70, min: 50, header: "Kpl" },
              { id: "last", width: 130, min: 90, header: "Viimeisin" },
              {
                id: "monthly",
                width: 110,
                min: 85,
                header: "€/kk",
                headerClassName: "text-right",
              },
            ]}
          >
            <tbody>
              {recurring.map((r) => (
                <tr
                  key={r.merchantLower}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-card-2"
                  onClick={() => openMerchant(r.merchantLower, r.merchant)}
                  title="Näytä tapahtumat"
                >
                  <td className="truncate px-4 py-2 text-text" title={r.merchant}>
                    {r.merchant}
                  </td>
                  <td className="truncate px-4 py-2 text-xs text-muted">
                    {r.category}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-muted">
                    {r.occurrences}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-muted">
                    {formatDateFi(r.lastDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-text">
                    {formatEur(r.monthlyCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </ResizableTable>
        </div>
      </Card>

      {/* Year over year */}
      {yoy && (
        <Card className="mt-4">
          <CardTitle>
            Vuosivertailu — 01–{String(yoy.throughMonth).padStart(2, "0")}/
            {yoy.year} vs. sama jakso {yoy.prevYear}
          </CardTitle>
          <p className="mt-1 text-xs text-muted">
            Kulut yhteensä{" "}
            <span className="tabular-nums text-text">
              {formatEur(yoy.currentTotal)}
            </span>{" "}
            vs.{" "}
            <span className="tabular-nums">{formatEur(yoy.prevTotal)}</span> (
            <span
              className={cn(
                "tabular-nums",
                yoy.currentTotal <= yoy.prevTotal ? "text-green" : "text-red",
              )}
            >
              {yoy.currentTotal - yoy.prevTotal >= 0 ? "+" : ""}
              {formatEur(yoy.currentTotal - yoy.prevTotal)}
            </span>
            )
          </p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4 font-medium">Luokka</th>
                <th className="py-2 pr-4 text-right font-medium">{yoy.year}</th>
                <th className="py-2 pr-4 text-right font-medium">
                  {yoy.prevYear}
                </th>
                <th className="py-2 text-right font-medium">Muutos</th>
              </tr>
            </thead>
            <tbody>
              {yoy.rows.slice(0, 12).map((r) => (
                <tr
                  key={r.category}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-card-2"
                  onClick={() => openCategoryYtd(r.category)}
                  title="Näytä tapahtumat"
                >
                  <td className="flex items-center gap-2 py-2 pr-4 text-text">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: colorOf(r.category) }}
                    />
                    {r.category}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-text">
                    {formatEur(r.currentCents)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-muted">
                    {formatEur(r.prevCents)}
                  </td>
                  <td
                    className={cn(
                      "py-2 text-right tabular-nums",
                      r.deltaCents <= 0 ? "text-green" : "text-red",
                    )}
                  >
                    {r.deltaCents >= 0 ? "+" : ""}
                    {formatEur(r.deltaCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Category trends */}
      <Card className="mt-4">
        <CardTitle>Luokkatrendit — viimeiset {trendMonths.length} kk</CardTitle>
        <p className="mt-1 text-xs text-muted">
          Viiva on jakson keskiarvo. Klikkaa pylvästä nähdäksesi kuukauden
          tapahtumat.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
          {trendCats.map((cat) => (
            <TrendMini
              key={cat}
              category={cat}
              months={trendMonths}
              values={categorySeries(transactions, visible, cat, trendMonths)}
              color={colorOf(cat)}
              onSelectMonth={(m) => openCategoryMonth(cat, m)}
            />
          ))}
        </div>
      </Card>

      {audit && (
        <TransactionsDrawer query={audit} onClose={() => setAudit(null)} />
      )}
    </div>
  );
}

function MoverList({
  title,
  rows,
  onSelect,
  colorOf,
}: {
  title: string;
  rows: {
    category: string;
    currentCents: number;
    deltaPrevCents: number;
    deltaAvgCents: number;
  }[];
  onSelect: (category: string) => void;
  colorOf: (name: string) => string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">—</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.category}>
              <button
                onClick={() => onSelect(r.category)}
                title="Näytä tapahtumat"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-bg"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: colorOf(r.category) }}
                />
                <span className="min-w-0 flex-1 truncate text-text">
                  {r.category}
                </span>
                <span className="tabular-nums text-muted">
                  {formatEur(r.currentCents)}
                </span>
                <span
                  className={cn(
                    "w-24 whitespace-nowrap text-right tabular-nums text-xs",
                    r.deltaPrevCents <= 0 ? "text-green" : "text-red",
                  )}
                >
                  {r.deltaPrevCents >= 0 ? "+" : ""}
                  {formatEur(r.deltaPrevCents)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Mini 12-month bar chart with an average hairline. */
function TrendMini({
  category,
  months,
  values,
  color,
  onSelectMonth,
}: {
  category: string;
  months: string[];
  values: number[];
  color: string;
  onSelectMonth: (month: string) => void;
}) {
  const w = 240;
  const h = 64;
  const gap = 3;
  const n = values.length || 1;
  const barW = (w - gap * (n - 1)) / n;
  const max = Math.max(...values, 1);
  const avg = values.reduce((a, b) => a + b, 0) / n;
  const avgY = h - (avg / max) * h;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm text-text">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <span className="truncate">{category}</span>
        </span>
        <span className="whitespace-nowrap text-xs tabular-nums text-muted">
          ka {formatEur(Math.round(avg))}
        </span>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        className="block"
        role="img"
        aria-label={`${category} kuukausittain`}
      >
        {values.map((v, i) => {
          const bh = Math.max(v > 0 ? 2 : 0, (v / max) * h);
          return (
            <rect
              key={months[i]}
              x={i * (barW + gap)}
              y={h - bh}
              width={barW}
              height={bh}
              rx="1.5"
              fill={color}
              opacity={0.85}
              className="cursor-pointer hover:opacity-100"
              onClick={() => onSelectMonth(months[i])}
            >
              <title>
                {formatMonthFi(months[i])}: {formatEur(v)}
              </title>
            </rect>
          );
        })}
        <line
          x1="0"
          x2={w}
          y1={avgY}
          y2={avgY}
          stroke="#8b95a7"
          strokeOpacity="0.6"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
