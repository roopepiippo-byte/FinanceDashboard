import { useEffect } from "react";
import type { Transaction } from "@/types";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/domain/money";
import { formatDateFi } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface AuditQuery {
  title: string;
  txns: Transaction[];
}

/**
 * Audit drawer: the transaction list behind a number. The header shows the
 * count and the sum so the figure can be verified against the card/chart
 * that opened it.
 */
export function TransactionsDrawer({
  query,
  onClose,
}: {
  query: AuditQuery;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sum = query.txns.reduce((a, t) => a + t.amountCents, 0);
  const rows = [...query.txns].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <Card
        className="my-8 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{query.title}</CardTitle>
            <p className="mt-0.5 text-xs text-muted">
              <span className="tabular-nums">{rows.length}</span> tapahtumaa ·
              yhteensä{" "}
              <span
                className={cn(
                  "font-medium tabular-nums",
                  sum >= 0 ? "text-green" : "text-red",
                )}
              >
                {formatEur(sum)}
              </span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Sulje
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Ei tapahtumia.
          </p>
        ) : (
          <div className="max-h-[65vh] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-muted">
                      {formatDateFi(t.date)}
                    </td>
                    <td className="max-w-0 truncate py-2 pr-4 text-text">
                      {t.merchant}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 text-xs text-muted">
                      {t.category ?? "Luokittelematta"}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap py-2 text-right tabular-nums",
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
        )}
      </Card>
    </div>
  );
}
