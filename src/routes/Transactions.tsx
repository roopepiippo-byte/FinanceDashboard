import { useMemo, useState } from "react";
import { useStore } from "@/store";
import { transactionsInRange } from "@/store/selectors";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { CategoryCell } from "@/components/CategoryCell";
import {
  ResizableTable,
  type ColumnDef,
} from "@/components/ui/ResizableTable";
import { formatEur } from "@/domain/money";
import { formatDateFi } from "@/lib/format";
import { cn } from "@/lib/cn";

type TypeFilter = "all" | "income" | "expense";
type SortKey = "date" | "amount";

export function Transactions() {
  const allTxns = useStore((s) => s.transactions);
  const range = useStore((s) => s.range);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const categorySettings = useStore((s) => s.categorySettings);
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const categoryNames = useMemo(
    () => categorySettings.map((s) => s.category).sort(),
    [categorySettings],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = transactionsInRange(allTxns, range)
      .filter((t) => (q ? t.merchantLower.includes(q) : true))
      .filter((t) => (categoryFilter ? t.category === categoryFilter : true))
      .filter((t) =>
        typeFilter === "all"
          ? true
          : typeFilter === "income"
            ? t.amountCents > 0
            : t.amountCents < 0,
      );
    const dir = sortDesc ? -1 : 1;
    filtered.sort((a, b) =>
      sortKey === "date"
        ? dir * a.date.localeCompare(b.date)
        : dir * (a.amountCents - b.amountCents),
    );
    return filtered;
  }, [allTxns, range, search, categoryFilter, typeFilter, sortKey, sortDesc]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of rows) {
      if (t.amountCents > 0) income += t.amountCents;
      else expense += -t.amountCents;
    }
    return { income, expense, net: income - expense };
  }, [rows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDesc ? " ↓" : " ↑") : "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hae kauppiasta…"
          className="h-9 min-w-56 flex-1 rounded-md border border-border bg-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-3 text-sm text-text"
        >
          <option value="">Kaikki luokat</option>
          {categoryNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="h-9 rounded-md border border-border bg-card px-3 text-sm text-text"
        >
          <option value="all">Tulot ja kulut</option>
          <option value="income">Vain tulot</option>
          <option value="expense">Vain kulut</option>
        </select>
      </div>

      {/* Filtered summary */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="tabular-nums">{rows.length} tapahtumaa</span>
        <span>
          Tulot{" "}
          <span className="tabular-nums text-green">
            {formatEur(totals.income)}
          </span>
        </span>
        <span>
          Kulut{" "}
          <span className="tabular-nums text-red">
            {formatEur(totals.expense)}
          </span>
        </span>
        <span>
          Netto{" "}
          <span
            className={cn(
              "tabular-nums",
              totals.net >= 0 ? "text-green" : "text-red",
            )}
          >
            {formatEur(totals.net)}
          </span>
        </span>
      </div>

      {rows.length === 0 ? (
        <Card className="text-sm text-muted">
          Ei tapahtumia näillä ehdoilla.
        </Card>
      ) : (
        <Card className="p-0">
          <ResizableTable
            id="transactions"
            containerClassName="max-h-[calc(100vh-15rem)] overflow-auto"
            headClassName="sticky top-0 z-10 bg-card"
            columns={
              [
                {
                  id: "date",
                  width: 110,
                  min: 90,
                  header: (
                    <button
                      className="hover:text-text"
                      onClick={() => toggleSort("date")}
                    >
                      Päivä{sortIndicator("date")}
                    </button>
                  ),
                },
                { id: "merchant", width: 320, min: 120, header: "Kauppias" },
                { id: "category", width: 210, min: 110, header: "Luokka" },
                {
                  id: "amount",
                  width: 120,
                  min: 90,
                  headerClassName: "text-right",
                  header: (
                    <button
                      className="hover:text-text"
                      onClick={() => toggleSort("amount")}
                    >
                      Summa{sortIndicator("amount")}
                    </button>
                  ),
                },
                { id: "actions", width: 90, min: 70, header: "" },
              ] satisfies ColumnDef[]
            }
          >
            <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="group border-b border-border transition-colors last:border-0 hover:bg-card-2"
                  >
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-muted">
                      {formatDateFi(t.date)}
                    </td>
                    <td className="truncate px-4 py-2 text-text" title={t.merchant}>
                      {t.merchant}
                    </td>
                    <td className="px-4 py-2">
                      <CategoryCell transaction={t} />
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-2 text-right tabular-nums",
                        t.amountCents < 0 ? "text-red" : "text-green",
                      )}
                    >
                      {formatEur(t.amountCents)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => setPendingDelete(t.id)}
                      >
                        Poista
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </ResizableTable>
        </Card>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Poista tapahtuma"
        message="Tapahtuma poistetaan pysyvästi."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const id = pendingDelete!;
          setPendingDelete(null);
          await deleteTransaction(id);
          toast.success("Tapahtuma poistettu");
        }}
      />
    </div>
  );
}
