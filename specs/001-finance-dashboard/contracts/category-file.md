# Contract: Category Data File (export / import)

**Feature**: 001-finance-dashboard | **Phase**: 1

The one portable dataset (Constitution Principle III, FR-026/FR-027). A single
JSON file the user can export from Settings and re-import into any instance.

## Format

```json
{
  "format": "finance-dashboard-category-data",
  "version": 1,
  "exportedAt": "2026-07-01T12:00:00.000Z",
  "categoryMap": [
    { "pattern": "k-supermarket*", "category": "Ruoka", "class": "expense" },
    { "pattern": "nordea*",        "category": "Palkka", "class": "income" }
  ],
  "customCategories": [
    { "name": "Harrastukset", "class": "expense", "color": "#8ab4f8" }
  ],
  "categorySettings": [
    { "category": "Ruoka", "visible": true, "color": "#4ade80" }
  ]
}
```

## Rules

- **Export**: writes the current `categoryMap`, `customCategories`, and
  `categorySettings`. No transactions, budgets, or wealth data are included.
- **Import** (FR-027):
  - User chooses **merge** or **replace** (with confirmation).
  - *Merge*: incoming entries upsert by key (`pattern` / `name` / `category`);
    existing unrelated entries are kept.
  - *Replace*: the three datasets are cleared and replaced with the file's.
  - A partial or older file (e.g., missing `customCategories`, or `version` < 1)
    MUST NOT corrupt existing data — absent sections are skipped, missing fields
    fall back to defaults (edge case in spec).
- **Validation**: reject files whose top-level `format` is not
  `finance-dashboard-category-data`; surface a clear error and import nothing.
- `version` enables forward migration; unknown newer versions import known fields
  and warn.
