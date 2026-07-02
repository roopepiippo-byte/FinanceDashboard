# Contract: Category Data File (export / import)

**Feature**: 001-finance-dashboard | **Phase**: 1 (revised during implementation)

The one portable dataset (Constitution Principle III, FR-026/FR-027). A single
**CSV** file the user can export from Asetukset and re-import into any instance.

> **Format decision**: the original plan specified JSON. Implementation switched
> to CSV because the user's authoritative category database lives in Google
> Sheets — the app consumes the sheet's CSV export directly and exports the same
> shape back, so the sheet round-trips without conversion. Recorded in spec.md →
> Implementation Decisions.

## Format

One row per merchant rule, comma-separated, UTF-8 (BOM tolerated):

```csv
merchantKey,displayName,category,group
aasia market tampere,Aasia Market Tampere,Ruoka,Välttämättömät
"vipps","VIPPS MOBILEPAY AS, OSLO",Mobile Pay,Muuttuvat
fellowmind finland,FELLOWMIND FINLAND OY AB,Palkka,Tulot
```

- **merchantKey** — lowercase match key against `merchantLower`; may contain `*`
  globs. Unique; last occurrence wins.
- **displayName** — original merchant casing, preserved for round-trip. May
  contain commas (quoted or not — parser reads `category`/`group` from the row
  END, so unquoted commas in the middle stay part of the display name).
- **category** — canonicalized case-insensitively to built-in names
  (e.g. `Mobile pay` → `Mobile Pay`); unknown names create custom categories.
- **group** — budget group from the sheet. Class inference: `Tulot` → income,
  `Siirrot` → transfer, anything else → expense (built-in categories keep their
  built-in class).

## Rules

- **Export**: writes every `categoryMap` entry as
  `merchantKey,displayName,category,group`, sorted by key, CRLF line endings,
  fields quoted only when needed. Rules created in-app carry a group derived
  from their class (income → `Tulot`, transfer → `Siirrot`, expense →
  `Muuttuvat`).
- **Import** (FR-027):
  - User chooses **merge** or **replace**.
  - *Merge*: upsert by `merchantKey` in one IndexedDB transaction.
  - *Replace*: the category map is cleared and replaced with the file's rows.
  - Malformed rows (fewer than 2 fields, empty key/category) are skipped and
    counted; a partial file never corrupts existing data.
  - New category names create `customCategories` + visible `categorySettings`
    entries with assigned colors.
- **Round-trip**: `parse(serialize(entries)) === entries` (unit-tested in
  `src/domain/categoryDb.test.ts`).

## Implementation

`src/domain/categoryDb.ts` (`parseCategoryDbCsv`, `serializeCategoryDbCsv`);
store actions `importCategoryDb(text, mode)` / `exportCategoryDb()`.
