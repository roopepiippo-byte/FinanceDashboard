import { useMemo, useState } from "react";
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
import { formatEur } from "@/domain/money";
import { formatMonthFi } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  snapshotTotals,
  netWorthSeries,
  liquidByGroupSeries,
  savingsVsReturns,
  latestGroupDeltas,
} from "@/domain/wealth";
import type { AssetGroup, WealthEntry, WealthSnapshot } from "@/types";

interface DraftEntry {
  label: string;
  euros: string;
}
interface DraftGroup {
  label: string;
  isLiquid: boolean;
  entries: DraftEntry[];
}

function toEuros(cents: number): string {
  return String(Math.round(cents / 100));
}
function toCents(euros: string): number {
  return Math.round((Number(euros) || 0) * 100);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function blankDraft(): {
  month: string;
  groups: DraftGroup[];
  debts: DraftEntry[];
  contribution: string;
} {
  return {
    month: currentMonth(),
    groups: [{ label: "Pankkitilit", isLiquid: true, entries: [{ label: "", euros: "" }] }],
    debts: [],
    contribution: "",
  };
}

function draftFrom(s: WealthSnapshot) {
  return {
    month: s.month,
    groups: s.groups.map((g) => ({
      label: g.label,
      isLiquid: g.isLiquid,
      entries: g.entries.map((e) => ({ label: e.label, euros: toEuros(e.amountCents) })),
    })),
    debts: s.debts.map((d) => ({ label: d.label, euros: toEuros(d.amountCents) })),
    contribution: s.savingsContributionCents != null ? toEuros(s.savingsContributionCents) : "",
  };
}

export function Wealth() {
  const snapshots = useStore((s) => s.wealthSnapshots);
  const upsertWealth = useStore((s) => s.upsertWealth);
  const removeWealth = useStore((s) => s.removeWealth);
  const toast = useToast();

  const [draft, setDraft] = useState(blankDraft());
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const view = useMemo(() => {
    const latest = snapshots[snapshots.length - 1];
    return {
      totals: latest ? snapshotTotals(latest) : null,
      net: netWorthSeries(snapshots),
      liquid: liquidByGroupSeries(snapshots),
      source: savingsVsReturns(snapshots),
      deltas: latestGroupDeltas(snapshots),
    };
  }, [snapshots]);

  function save() {
    const groups: AssetGroup[] = draft.groups
      .map((g) => ({
        label: g.label.trim() || "Ryhmä",
        isLiquid: g.isLiquid,
        entries: g.entries
          .filter((e) => e.label.trim() || e.euros)
          .map<WealthEntry>((e) => ({ label: e.label.trim(), amountCents: toCents(e.euros) })),
      }))
      .filter((g) => g.entries.length > 0);
    const debts: WealthEntry[] = draft.debts
      .filter((d) => d.label.trim() || d.euros)
      .map((d) => ({ label: d.label.trim(), amountCents: toCents(d.euros) }));

    const snapshot: WealthSnapshot = {
      id: draft.month,
      month: draft.month,
      groups,
      debts,
      savingsContributionCents: draft.contribution ? toCents(draft.contribution) : null,
    };
    void upsertWealth(snapshot).then(() => {
      toast.success(`Tallennettu ${formatMonthFi(draft.month)}`);
      setEditing(false);
      setDraft(blankDraft());
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setDraft(blankDraft());
            setEditing(true);
          }}
        >
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
          Ei varallisuustietoja. Lisää ensimmäinen kuukausi “+ Uusi kuukausi”.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle>Nettovarallisuus ajassa</CardTitle>
            <div className="mt-3">
              <NetWorthChart data={view.net} />
            </div>
          </Card>
          <Card>
            <CardTitle>Likvidit varat ryhmittäin</CardTitle>
            <div className="mt-3">
              <LiquidChart
                points={view.liquid.points}
                groupLabels={view.liquid.groupLabels}
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
            <CardTitle>Viimeisin kuukausi</CardTitle>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {view.deltas.map((d) => (
                  <tr key={d.label} className="border-b border-border last:border-0">
                    <td className="py-2 text-text">{d.label}</td>
                    <td className="py-2 text-right text-muted">
                      {formatEur(d.currentCents)}
                    </td>
                    <td
                      className={cn(
                        "py-2 pl-4 text-right text-xs",
                        (d.deltaCents ?? 0) >= 0 ? "text-green" : "text-red",
                      )}
                    >
                      {d.deltaCents != null
                        ? `${d.deltaCents >= 0 ? "+" : ""}${formatEur(d.deltaCents)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Snapshot list */}
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
                  onClick={() => {
                    setDraft(draftFrom(s));
                    setEditing(true);
                  }}
                >
                  {formatMonthFi(s.month)}
                </button>
                <span className="text-muted">
                  {formatEur(snapshotTotals(s).netCents)}
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

      {editing && (
        <WealthEditor
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => setEditing(false)}
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

/* ---- Editor modal ---- */

type Draft = ReturnType<typeof blankDraft>;

function WealthEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onCancel}
    >
      <Card
        className="my-8 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <CardTitle>Kuukauden tiedot</CardTitle>
          <input
            type="month"
            value={draft.month}
            onChange={(e) => update({ month: e.target.value })}
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm text-text"
          />
        </div>

        {/* Asset groups */}
        {draft.groups.map((g, gi) => (
          <div key={gi} className="mb-4 rounded-md border border-border p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                value={g.label}
                placeholder="Ryhmän nimi"
                onChange={(e) => {
                  const groups = [...draft.groups];
                  groups[gi] = { ...g, label: e.target.value };
                  update({ groups });
                }}
                className="h-8 flex-1 rounded-md border border-border bg-bg px-2 text-sm text-text"
              />
              <label className="flex items-center gap-1 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={g.isLiquid}
                  onChange={(e) => {
                    const groups = [...draft.groups];
                    groups[gi] = { ...g, isLiquid: e.target.checked };
                    update({ groups });
                  }}
                />
                Likvidi
              </label>
              <button
                className="text-muted hover:text-red"
                onClick={() =>
                  update({ groups: draft.groups.filter((_, i) => i !== gi) })
                }
              >
                ×
              </button>
            </div>
            {g.entries.map((e, ei) => (
              <div key={ei} className="mb-1 flex gap-2">
                <input
                  value={e.label}
                  placeholder="Erä (esim. Nordea)"
                  onChange={(ev) => {
                    const groups = [...draft.groups];
                    const entries = [...g.entries];
                    entries[ei] = { ...e, label: ev.target.value };
                    groups[gi] = { ...g, entries };
                    update({ groups });
                  }}
                  className="h-8 flex-1 rounded-md border border-border bg-bg px-2 text-sm text-text"
                />
                <input
                  type="number"
                  value={e.euros}
                  placeholder="€"
                  onChange={(ev) => {
                    const groups = [...draft.groups];
                    const entries = [...g.entries];
                    entries[ei] = { ...e, euros: ev.target.value };
                    groups[gi] = { ...g, entries };
                    update({ groups });
                  }}
                  className="h-8 w-28 rounded-md border border-border bg-bg px-2 text-sm text-text"
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const groups = [...draft.groups];
                groups[gi] = { ...g, entries: [...g.entries, { label: "", euros: "" }] };
                update({ groups });
              }}
            >
              + Erä
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            update({
              groups: [
                ...draft.groups,
                { label: "", isLiquid: false, entries: [{ label: "", euros: "" }] },
              ],
            })
          }
        >
          + Varryhmä
        </Button>

        {/* Debts */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-text">Velat</p>
          {draft.debts.map((d, di) => (
            <div key={di} className="mb-1 flex gap-2">
              <input
                value={d.label}
                placeholder="Velka (esim. Asuntolaina)"
                onChange={(e) => {
                  const debts = [...draft.debts];
                  debts[di] = { ...d, label: e.target.value };
                  update({ debts });
                }}
                className="h-8 flex-1 rounded-md border border-border bg-bg px-2 text-sm text-text"
              />
              <input
                type="number"
                value={d.euros}
                placeholder="€"
                onChange={(e) => {
                  const debts = [...draft.debts];
                  debts[di] = { ...d, euros: e.target.value };
                  update({ debts });
                }}
                className="h-8 w-28 rounded-md border border-border bg-bg px-2 text-sm text-text"
              />
              <button
                className="text-muted hover:text-red"
                onClick={() => update({ debts: draft.debts.filter((_, i) => i !== di) })}
              >
                ×
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update({ debts: [...draft.debts, { label: "", euros: "" }] })}
          >
            + Velka
          </Button>
        </div>

        {/* Contribution */}
        <div className="mt-4 flex items-center gap-2">
          <label className="text-sm text-muted">Oma sijoitus tässä kuussa (€)</label>
          <input
            type="number"
            value={draft.contribution}
            onChange={(e) => update({ contribution: e.target.value })}
            className="h-8 w-28 rounded-md border border-border bg-bg px-2 text-sm text-text"
          />
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
