import { useMemo, useState } from "react";
import { useStore } from "@/store";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { CategorySelect } from "@/components/CategorySelect";
import { CategoryCell } from "@/components/CategoryCell";
import { categoryClassOf } from "@/store/selectors";
import { createSuggester, type Suggestion } from "@/domain/suggest";
import {
  TransactionsDrawer,
  type AuditQuery,
} from "@/components/TransactionsDrawer";
import { ResizableTable } from "@/components/ui/ResizableTable";
import { formatEur, sumCents } from "@/domain/money";
import { cn } from "@/lib/cn";

type Tab = "unmapped" | "manual";

interface MerchantGroup {
  merchant: string;
  merchantLower: string;
  count: number;
  totalCents: number;
  suggestion: Suggestion | null;
}

export function Unmapped() {
  const transactions = useStore((s) => s.transactions);
  const categoryMap = useStore((s) => s.categoryMap);
  const applyMerchantCategory = useStore((s) => s.applyMerchantCategory);
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("unmapped");
  const [audit, setAudit] = useState<AuditQuery | null>(null);

  const groups = useMemo<MerchantGroup[]>(() => {
    const map = new Map<string, Omit<MerchantGroup, "suggestion">>();
    for (const t of transactions) {
      if (t.category !== null) continue;
      const g = map.get(t.merchantLower);
      if (g) {
        g.count += 1;
        g.totalCents += t.amountCents;
      } else {
        map.set(t.merchantLower, {
          merchant: t.merchant,
          merchantLower: t.merchantLower,
          count: 1,
          totalCents: t.amountCents,
        });
      }
    }
    const suggest = createSuggester(categoryMap);
    return [...map.values()]
      .map((g) => ({
        ...g,
        suggestion: suggest(g.merchantLower),
      }))
      .sort((a, b) => b.count - a.count);
  }, [transactions, categoryMap]);

  const manual = useMemo(
    () => transactions.filter((t) => t.isManualOverride),
    [transactions],
  );

  async function apply(g: MerchantGroup, category: string) {
    await applyMerchantCategory(
      g.merchantLower,
      category,
      categoryClassOf(category),
      g.merchant,
    );
    toast.success(`${g.merchant} → ${category} (${g.count} tapahtumaa)`);
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <TabButton active={tab === "unmapped"} onClick={() => setTab("unmapped")}>
          Luokittelematta ({groups.length})
        </TabButton>
        <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>
          Manuaalisesti asetettu ({manual.length})
        </TabButton>
      </div>

      {tab === "unmapped" ? (
        groups.length === 0 ? (
          <Card className="text-sm text-muted">
            Kaikki tapahtumat on luokiteltu. 🎉
          </Card>
        ) : (
          <Card className="p-0">
            <ResizableTable
              id="unmapped"
              columns={[
                { id: "merchant", width: 280, min: 120, header: "Kauppias" },
                { id: "count", width: 70, min: 50, header: "Kpl" },
                { id: "total", width: 110, min: 80, header: "Yhteensä" },
                { id: "suggestion", width: 150, min: 90, header: "Ehdotus" },
                {
                  id: "assign",
                  width: 220,
                  min: 140,
                  header: "Aseta luokka kaikille",
                },
              ]}
            >
              <tbody>
                {groups.map((g) => (
                  <tr
                    key={g.merchantLower}
                    className="border-b border-border transition-colors last:border-0 hover:bg-card-2"
                  >
                    <td className="truncate px-4 py-3">
                      <button
                        className="text-left text-text hover:text-accent hover:underline"
                        title="Näytä tapahtumat"
                        onClick={() =>
                          setAudit({
                            title: `${g.merchant} — luokittelematta`,
                            txns: transactions.filter(
                              (t) =>
                                t.merchantLower === g.merchantLower &&
                                t.category === null,
                            ),
                          })
                        }
                      >
                        {g.merchant}
                      </button>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {g.count}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 tabular-nums",
                        g.totalCents < 0 ? "text-red" : "text-green",
                      )}
                    >
                      {formatEur(g.totalCents)}
                    </td>
                    <td className="px-4 py-3">
                      {g.suggestion ? (
                        <button
                          onClick={() => void apply(g, g.suggestion!.category)}
                          title={`Perustuu sääntöön ”${g.suggestion.basedOn}”`}
                          className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                        >
                          {g.suggestion.category}
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-xs text-muted/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CategorySelect
                        value={null}
                        onSelect={(category) => void apply(g, category)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </ResizableTable>
          </Card>
        )
      ) : manual.length === 0 ? (
        <Card className="text-sm text-muted">
          Ei manuaalisesti asetettuja tapahtumia.
        </Card>
      ) : (
        <Card className="p-0">
          <ResizableTable
            id="unmapped-manual"
            columns={[
              { id: "merchant", width: 340, min: 120, header: "Kauppias" },
              { id: "amount", width: 120, min: 80, header: "Summa" },
              { id: "category", width: 220, min: 120, header: "Luokka" },
            ]}
          >
            <tbody>
              {manual.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-card-2"
                >
                  <td className="truncate px-4 py-3 text-text" title={t.merchant}>
                    {t.merchant}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 tabular-nums",
                      t.amountCents < 0 ? "text-red" : "text-green",
                    )}
                  >
                    {formatEur(t.amountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryCell transaction={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </ResizableTable>
          <div className="px-4 py-2 text-xs text-muted">
            Yhteensä{" "}
            <span className="tabular-nums">
              {formatEur(sumCents(manual.map((t) => t.amountCents)))}
            </span>
          </div>
        </Card>
      )}

      {audit && (
        <TransactionsDrawer query={audit} onClose={() => setAudit(null)} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-accent/15 font-medium text-accent"
          : "text-muted hover:bg-card hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
