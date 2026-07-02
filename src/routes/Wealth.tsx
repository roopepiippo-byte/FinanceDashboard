import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/store";
import { useToast } from "@/components/ui/toast";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import {
  NetWorthChart,
  LiquidChart,
  WealthSourceChart,
} from "@/components/charts/WealthCharts";
import { formatEur, parseEuroInputToCents } from "@/domain/money";
import { formatMonthFi } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  snapshotTotals,
  netWorthSeries,
  liquidByAccountSeries,
  savingsVsReturns,
  latestAccountDeltas,
} from "@/domain/wealth";
import type { WealthAccount, WealthSnapshot } from "@/types";

const KIND_TITLES = {
  liquid: "Likvidit varat",
  investment: "Sijoitukset ja muut varat",
  debt: "Velat",
} as const;

function toEuros(cents: number | undefined): string {
  if (!cents) return "";
  return String(Math.round(cents) / 100).replace(".", ",");
}
function toCents(euros: string): number {
  return parseEuroInputToCents(euros) ?? 0;
}
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

interface Draft {
  month: string;
  values: Record<string, string>; // accountId -> euro string
  contribution: string;
}

export function Wealth() {
  const snapshots = useStore((s) => s.wealthSnapshots);
  const accounts = useStore((s) => s.wealthAccounts);
  const upsertWealth = useStore((s) => s.upsertWealth);
  const removeWealth = useStore((s) => s.removeWealth);
  const toast = useToast();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const view = useMemo(() => {
    const latest = snapshots[snapshots.length - 1];
    return {
      totals: latest ? snapshotTotals(latest, accounts) : null,
      latestMonth: latest?.month ?? null,
      net: netWorthSeries(snapshots, accounts),
      liquid: liquidByAccountSeries(snapshots, accounts),
      source: savingsVsReturns(snapshots, accounts),
      deltas: latestAccountDeltas(snapshots, accounts),
    };
  }, [snapshots, accounts]);

  function openEditor(existing?: WealthSnapshot) {
    // Prefill: the month's own values when editing; otherwise the latest
    // month's values (most accounts change little month to month).
    const base = existing ?? snapshots[snapshots.length - 1];
    const values: Record<string, string> = {};
    for (const a of accounts) {
      values[a.id] = toEuros(base?.values[a.id]);
    }
    setDraft({
      month: existing?.month ?? currentMonth(),
      values,
      contribution:
        existing?.savingsContributionCents != null
          ? toEuros(existing.savingsContributionCents)
          : "",
    });
  }

  function save() {
    if (!draft) return;
    const values: Record<string, number> = {};
    for (const a of accounts) {
      const cents = toCents(draft.values[a.id] ?? "");
      if (cents !== 0) values[a.id] = cents;
    }
    const snapshot: WealthSnapshot = {
      id: draft.month,
      month: draft.month,
      values,
      savingsContributionCents: draft.contribution
        ? toCents(draft.contribution)
        : null,
    };
    void upsertWealth(snapshot).then(() => {
      toast.success(`Tallennettu ${formatMonthFi(draft.month)}`);
      setDraft(null);
    });
  }

  if (accounts.length === 0) {
    return (
      <Card className="max-w-xl text-sm text-muted">
        <p>
          Määrittele ensin varallisuustilit (esim. S-pankki Rahastotili, Nordea
          Käyttötili, Asuntolaina) — sen jälkeen syötät kullekin arvon
          kuukausittain tällä sivulla.
        </p>
        <Link
          to="/settings"
          className="mt-3 inline-block font-medium text-accent hover:underline"
        >
          Avaa Asetukset → Varallisuustilit
        </Link>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => openEditor()}>
          + Uusi kuukausi
        </Button>
      </div>

      {view.totals && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardTitle>Nettovarallisuus</CardTitle>
            <CardValue>{formatEur(view.totals.netCents)}</CardValue>
          </Card>
          <Card>
            <CardTitle>Varat yhteensä</CardTitle>
            <CardValue>{formatEur(view.totals.assetsCents)}</CardValue>
          </Card>
          <Card>
            <CardTitle>Velat yhteensä</CardTitle>
            <CardValue>{formatEur(view.totals.debtsCents)}</CardValue>
          </Card>
          <Card>
            <CardTitle>Likvidit varat</CardTitle>
            <CardValue>{formatEur(view.totals.liquidCents)}</CardValue>
          </Card>
        </div>
      )}

      {snapshots.length === 0 ? (
        <Card className="text-sm text-muted">
          Ei kuukausia vielä. Lisää ensimmäinen ”+ Uusi kuukausi” -napista —
          tilisi ovat valmiina lomakkeessa.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardTitle>Nettovarallisuus ajassa</CardTitle>
            <div className="mt-3">
              <NetWorthChart data={view.net} />
            </div>
          </Card>
          <Card>
            <CardTitle>Likvidit varat tileittäin</CardTitle>
            <div className="mt-3">
              <LiquidChart
                points={view.liquid.points}
                labels={view.liquid.labels}
              />
            </div>
          </Card>
          <Card>
            <CardTitle>Omat sijoitukset vs. markkinatuotto</CardTitle>
            <div className="mt-3">
              <WealthSourceChart data={view.source} />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <CardTitle>
                Viimeisin kuukausi
                {view.latestMonth ? ` — ${formatMonthFi(view.latestMonth)}` : ""}
              </CardTitle>
            </div>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {view.deltas.map((d) => {
                  const sign = d.account.kind === "debt" ? -1 : 1;
                  const value = sign * d.currentCents;
                  const delta =
                    d.deltaCents != null ? sign * d.deltaCents : null;
                  return (
                    <tr
                      key={d.account.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2 text-text">{d.account.name}</td>
                      <td className="py-2 text-right tabular-nums text-muted">
                        {formatEur(value)}
                      </td>
                      <td
                        className={cn(
                          "py-2 pl-4 text-right text-xs tabular-nums",
                          (delta ?? 0) >= 0 ? "text-green" : "text-red",
                        )}
                      >
                        {delta != null
                          ? `${delta >= 0 ? "+" : ""}${formatEur(delta)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {snapshots.length > 0 && (
        <Card className="mt-4">
          <CardTitle>Kuukaudet</CardTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {snapshots.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
              >
                <button
                  className="text-accent hover:underline"
                  onClick={() => openEditor(s)}
                >
                  {formatMonthFi(s.month)}
                </button>
                <span className="tabular-nums text-muted">
                  {formatEur(snapshotTotals(s, accounts).netCents)}
                </span>
                <button
                  className="text-muted hover:text-red"
                  onClick={() => setPendingDelete(s.month)}
                  title="Poista"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {draft && (
        <MonthEditor
          draft={draft}
          setDraft={setDraft}
          accounts={accounts}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Poista kuukausi"
        message="Kuukauden varallisuustiedot poistetaan."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const m = pendingDelete!;
          setPendingDelete(null);
          await removeWealth(m);
          toast.success("Kuukausi poistettu");
        }}
      />
    </div>
  );
}

/* ---- Month editor: one value per defined account ---- */

function MonthEditor({
  draft,
  setDraft,
  accounts,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  accounts: WealthAccount[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const kinds: WealthAccount["kind"][] = ["liquid", "investment", "debt"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onCancel}
    >
      <Card
        className="my-8 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <CardTitle>Kuukauden arvot</CardTitle>
          <input
            type="month"
            value={draft.month}
            onChange={(e) => setDraft({ ...draft, month: e.target.value })}
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm text-text"
          />
        </div>

        {kinds.map((kind) => {
          const group = accounts.filter((a) => a.kind === kind);
          if (group.length === 0) return null;
          return (
            <div key={kind} className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                {KIND_TITLES[kind]}
              </p>
              <div className="space-y-1.5">
                {group.map((a) => (
                  <label key={a.id} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-text">
                      {a.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draft.values[a.id] ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            values: {
                              ...draft.values,
                              [a.id]: e.target.value,
                            },
                          })
                        }
                        className="h-8 w-32 rounded-md border border-border bg-bg px-2 text-right text-sm tabular-nums text-text"
                      />
                      <span className="text-xs text-muted">€</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <label className="text-sm text-muted">
            Oma sijoitus tässä kuussa
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={draft.contribution}
              placeholder="0"
              onChange={(e) =>
                setDraft({ ...draft, contribution: e.target.value })
              }
              className="h-8 w-32 rounded-md border border-border bg-bg px-2 text-right text-sm tabular-nums text-text"
            />
            <span className="text-xs text-muted">€</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Peruuta
          </Button>
          <Button size="sm" onClick={onSave}>
            Tallenna
          </Button>
        </div>
      </Card>
    </div>
  );
}
