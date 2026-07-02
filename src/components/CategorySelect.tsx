import { useStore } from "@/store";
import { selectCategories } from "@/store/selectors";
import type { CategoryClass } from "@/types";

interface CategorySelectProps {
  value: string | null;
  onSelect: (category: string, cls: CategoryClass) => void;
  placeholder?: string;
}

const CLASS_LABELS: Record<CategoryClass, string> = {
  income: "Tulot",
  expense: "Kulut",
  transfer: "Siirrot",
};

export function CategorySelect({
  value,
  onSelect,
  placeholder = "Valitse luokka…",
}: CategorySelectProps) {
  // Re-render when categories change.
  useStore((s) => s.categorySettings);
  useStore((s) => s.customCategories);
  const categories = selectCategories().filter((c) => c.visible);

  const grouped: Record<CategoryClass, string[]> = {
    income: [],
    expense: [],
    transfer: [],
  };
  for (const c of categories) grouped[c.class].push(c.name);

  const classByName = new Map(categories.map((c) => [c.name, c.class]));

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const name = e.target.value;
        if (name) onSelect(name, classByName.get(name)!);
      }}
      className="h-8 rounded-md border border-border bg-bg px-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {(Object.keys(grouped) as CategoryClass[]).map((cls) =>
        grouped[cls].length ? (
          <optgroup key={cls} label={CLASS_LABELS[cls]}>
            {grouped[cls].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </optgroup>
        ) : null,
      )}
    </select>
  );
}
