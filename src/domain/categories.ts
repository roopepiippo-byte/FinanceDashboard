import type { CategoryClass } from "@/types";

export interface CategoryDef {
  name: string;
  class: CategoryClass;
  color: string;
}

/**
 * Built-in category system (data-model.md). Seeded on first run; custom
 * categories add to this set. Colors are the default chart/badge palette.
 *
 * The 8 highest-spend expense categories carry a CVD-validated categorical
 * palette in a fixed order (validated with the dataviz palette checker
 * against the card surface #141924) — these dominate the spend donut, where
 * adjacent-slice distinctness matters. Tail categories get distinct
 * supporting hues; they surface mainly in badges and lists where the name
 * text carries identity.
 */
export const BUILTIN_CATEGORIES: CategoryDef[] = [
  // Income
  { name: "Palkka", class: "income", color: "#4ade80" },
  { name: "Osinko", class: "income", color: "#2dd4bf" },
  // Expenses — validated 8-slot core, in spend order
  { name: "Ravintola", class: "expense", color: "#3987e5" },
  { name: "Ruoka", class: "expense", color: "#199e70" },
  { name: "Matkailu", class: "expense", color: "#c98500" },
  { name: "Muu", class: "expense", color: "#008300" },
  { name: "Mobile Pay", class: "expense", color: "#9085e9" },
  { name: "Alko", class: "expense", color: "#e66767" },
  { name: "Urheilu", class: "expense", color: "#d55181" },
  { name: "Bensa", class: "expense", color: "#d95926" },
  // Expenses — supporting tail
  { name: "Auto", class: "expense", color: "#e8935e" },
  { name: "Koti", class: "expense", color: "#6da7ec" },
  { name: "Digi", class: "expense", color: "#22b8cf" },
  { name: "Puhelin", class: "expense", color: "#86b6ef" },
  { name: "Vakuutus", class: "expense", color: "#5f7ea6" },
  { name: "Vaatteet", class: "expense", color: "#e879f9" },
  { name: "Viihde", class: "expense", color: "#b3a1f7" },
  { name: "Terveys", class: "expense", color: "#63d68f" },
  { name: "Koira", class: "expense", color: "#a3e635" },
  { name: "Taksi", class: "expense", color: "#facc15" },
  { name: "Työmatkat", class: "expense", color: "#93c5fd" },
  { name: "Ginstia", class: "expense", color: "#f472b6" },
  // Transfers
  { name: "Oma", class: "transfer", color: "#64748b" },
  { name: "Sijoitus", class: "transfer", color: "#38bdf8" },
  { name: "Asuntolaina", class: "transfer", color: "#8b5cf6" },
  { name: "Opintolaina", class: "transfer", color: "#a78bfa" },
  { name: "Vastike", class: "transfer", color: "#0891b2" },
  { name: "Vuokra", class: "transfer", color: "#14b8a6" },
];

/** Default color for a built-in category (used by "reset colors"). */
export function defaultColorOf(name: string): string | undefined {
  return byName.get(name)?.color;
}

/** Default quick-spend categories for the Dashboard (FR-014). */
export const DEFAULT_QUICK_SPEND = ["Ruoka", "Ravintola", "Bensa", "Auto"];

const byName = new Map(BUILTIN_CATEGORIES.map((c) => [c.name, c]));
const byLowerName = new Map(
  BUILTIN_CATEGORIES.map((c) => [c.name.toLowerCase(), c]),
);

export function builtinClassOf(name: string): CategoryClass | undefined {
  return byName.get(name)?.class;
}

/**
 * Canonicalize a category name to its built-in casing when it matches a
 * built-in case-insensitively (e.g. "Mobile pay" -> "Mobile Pay"); otherwise
 * return the trimmed input unchanged (a custom category).
 */
export function canonicalCategoryName(raw: string): string {
  const trimmed = raw.trim();
  return byLowerName.get(trimmed.toLowerCase())?.name ?? trimmed;
}

/** Budget group (from the source sheet) -> category class. */
export function classFromGroup(group: string | undefined): CategoryClass {
  const g = (group ?? "").trim().toLowerCase();
  if (g === "tulot") return "income";
  if (g === "siirrot") return "transfer";
  return "expense";
}

/** Category class -> a default budget group label (for export). */
export function groupFromClass(cls: CategoryClass): string {
  if (cls === "income") return "Tulot";
  if (cls === "transfer") return "Siirrot";
  return "Muuttuvat";
}
