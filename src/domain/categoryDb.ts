import Papa from "papaparse";
import type { CategoryMapEntry, CustomCategory } from "@/types";
import {
  BUILTIN_CATEGORIES,
  canonicalCategoryName,
  classFromGroup,
  builtinClassOf,
} from "@/domain/categories";

export interface CategoryDbParseResult {
  entries: CategoryMapEntry[];
  /** Categories in the file that are not built-in — created as custom. */
  customCategories: CustomCategory[];
  skipped: number;
}

function normalizeMerchant(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

const CUSTOM_COLORS = [
  "#22d3ee",
  "#a3e635",
  "#e879f9",
  "#f472b6",
  "#facc15",
  "#38bdf8",
];

/**
 * Parse a category-database CSV exported from the user's sheet.
 * Expected columns per row: merchantKey, displayName, category, group.
 * Display names may contain commas, so category and group are read from the
 * END of the row (last two fields) and the middle is the display name.
 */
export function parseCategoryDbCsv(text: string): CategoryDbParseResult {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const result = Papa.parse<string[]>(clean, {
    header: false,
    skipEmptyLines: true,
    delimiter: ",",
  });

  const byPattern = new Map<string, CategoryMapEntry>();
  const customByName = new Map<string, CustomCategory>();
  const builtinNames = new Set(BUILTIN_CATEGORIES.map((c) => c.name));
  let skipped = 0;
  let colorIdx = 0;

  for (const row of result.data) {
    if (!Array.isArray(row) || row.length < 2) {
      skipped++;
      continue;
    }
    const pattern = normalizeMerchant(row[0] ?? "");

    let category: string;
    let group = "";
    let display = "";
    if (row.length >= 3) {
      group = (row[row.length - 1] ?? "").trim();
      category = (row[row.length - 2] ?? "").trim();
      display = row
        .slice(1, row.length - 2)
        .join(", ")
        .trim();
    } else {
      category = (row[1] ?? "").trim();
    }

    if (!pattern || !category) {
      skipped++;
      continue;
    }

    const canonical = canonicalCategoryName(category);
    const cls = builtinClassOf(canonical) ?? classFromGroup(group);

    byPattern.set(pattern, {
      pattern,
      category: canonical,
      class: cls,
      display: display || row[0].trim(),
      group: group || undefined,
    });

    if (!builtinNames.has(canonical) && !customByName.has(canonical)) {
      customByName.set(canonical, {
        name: canonical,
        class: cls,
        color: CUSTOM_COLORS[colorIdx++ % CUSTOM_COLORS.length],
      });
    }
  }

  return {
    entries: [...byPattern.values()],
    customCategories: [...customByName.values()],
    skipped,
  };
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Serialize the category map back to the same CSV format
 * (merchantKey, displayName, category, group) for round-trip with the sheet.
 */
export function serializeCategoryDbCsv(entries: CategoryMapEntry[]): string {
  const rows = [...entries]
    .sort((a, b) => a.pattern.localeCompare(b.pattern))
    .map((e) =>
      [
        csvField(e.pattern),
        csvField(e.display ?? e.pattern),
        csvField(e.category),
        csvField(e.group ?? ""),
      ].join(","),
    );
  return rows.join("\r\n") + "\r\n";
}
