import { useState } from "react";
import type { Transaction } from "@/types";
import { useStore } from "@/store";
import { CategorySelect } from "./CategorySelect";
import { Badge } from "./ui/badge";

/**
 * Inline category display + reassignment. Selecting a category saves a
 * per-transaction manual override (FR-010); overridden rows show a badge.
 */
export function CategoryCell({ transaction }: { transaction: Transaction }) {
  const setOverride = useStore((s) => s.setOverride);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <CategorySelect
        value={transaction.category}
        onSelect={async (category, cls) => {
          await setOverride(transaction.id, category, cls);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      className="flex items-center gap-2 rounded px-1 text-left hover:bg-bg"
      onClick={() => setEditing(true)}
      title="Muuta luokka"
    >
      <span className={transaction.category ? "text-text" : "text-muted"}>
        {transaction.category ?? "Luokittelematon"}
      </span>
      {transaction.isManualOverride && <Badge>Käsin</Badge>}
    </button>
  );
}
