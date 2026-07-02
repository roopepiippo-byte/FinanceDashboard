# Data Model: Finance Dashboard v3

**Feature**: 001-finance-dashboard | **Date**: 2026-07-01 | **Phase**: 1

All data is persisted in a single IndexedDB database `finance-dashboard-v3`,
one object store per entity (see `research.md` D3). **All monetary fields are
integer cents** (Constitution Principle II). Dates are ISO `YYYY-MM-DD` strings;
months are `YYYY-MM`. Types below are the conceptual model; the TypeScript
interfaces live in `src/types/`.

> **Money note**: the spec's illustrative JSON shows euro floats (e.g. `-42.50`,
> balance `1234.56`, `savingsContribution: 800`). Those map to the integer-cent
> fields here (`amountCents`, `balanceCents`, `savingsContributionCents`) per
> Constitution Principle II — never store floats for money.
>
> **Class note**: the category `class` union is
> `'income' | 'expense' | 'transfer'` everywhere it appears (Transaction,
> CategoryMapEntry, Override, CustomCategory).

---

## Entities

### Transaction

A single bank line item parsed from a Nordea CSV.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable identity: hash of `date` + `amountCents` + `merchantLower` + `rowIndex` (dedup key, FR-006) |
| `date` | string (ISO) | Booking date (`Kirjauspäivä`) |
| `amountCents` | integer | Signed; negative = expense, positive = income |
| `merchant` | string | Raw payee/description |
| `merchantLower` | string | Normalized (lowercased, trimmed, collapsed whitespace) — used for mapping |
| `balanceCents` | integer \| null | Running balance if present in the CSV |
| `isIncome` | boolean | Derived from sign / column |
| `category` | string \| null | **Resolved** category (see resolution rules); null = uncategorized |
| `class` | 'income' \| 'expense' \| 'transfer' \| null | Class of the resolved category |
| `isManualOverride` | boolean | True when the resolved category came from an override |
| `sourceFileId` | string | FK → ImportedFile.id (for row-index scoping and file deletion) |

**Validation**: `date` valid ISO; `amountCents` is an integer; `merchant`
non-empty; `id` unique.

**Resolution rule (FR-011)** — `category`/`class`/`isManualOverride` are computed,
not authored: manual override → first matching category-map glob (longest pattern
wins) → uncategorized.

---

### ImportedFile

Metadata about one CSV import.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique (e.g., content hash + timestamp) |
| `filename` | string | Original file name |
| `importedAt` | string (ISO datetime) | When imported |
| `transactionCount` | integer | Rows contributed by this file |

**Behavior**: deleting a file removes its transactions (cascade, with
confirmation) via `transactions.deleteBySourceFile` — the `sourceFileId` FK
enables this.

---

### CategoryMapEntry  *(portable — Constitution Principle III)*

A learned merchant→category rule.

| Field | Type | Notes |
|---|---|---|
| `pattern` | string | Glob against `merchantLower` (supports `*`); key of the store |
| `category` | string | Target category name |
| `class` | 'income' \| 'expense' \| 'transfer' | Target class |

**Validation**: `pattern` non-empty and unique; `category` exists in the category
system.

---

### Override

A per-transaction manual category assignment (highest priority).

| Field | Type | Notes |
|---|---|---|
| `transactionId` | string | FK → Transaction.id; key of the store |
| `category` | string | Assigned category |
| `class` | 'income' \| 'expense' \| 'transfer' | Assigned class |

---

### Budget  *(singleton)*

| Field | Type | Notes |
|---|---|---|
| `savingsGoalPct` | number (0–100) | Savings goal as % of monthly income |
| `categories` | map<categoryName, { targetPct: number; targetCents: integer }> | Per-category targets; pct and cents kept in sync via average monthly income |

**Validation**: `savingsGoalPct` in [0,100]; `targetPct` in [0,100]; `targetCents`
≥ 0 integer.

---

### CategorySetting

Per-category display config (built-in and custom categories alike).

| Field | Type | Notes |
|---|---|---|
| `category` | string | Category name; key of the store |
| `visible` | boolean | Hidden categories excluded from all charts/totals (FR-028) |
| `color` | string | Hex color for charts/badges |

---

### CustomCategory  *(portable with category data — Principle III)*

A user-defined category.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Unique; participates fully in charts/budget/mapping |
| `class` | 'income' \| 'expense' \| 'transfer' | Its class |
| `color` | string | Hex color |

---

### WealthSnapshot

A manually-entered monthly net-worth snapshot.

| Field | Type | Notes |
|---|---|---|
| `id` | string | = `month` (one snapshot per month) |
| `month` | string (`YYYY-MM`) | Snapshot month |
| `groups` | AssetGroup[] | Asset groups (below) |
| `debts` | Entry[] | Debt entries |
| `savingsContributionCents` | integer \| null | Own money added this month (drives market-return back-calc) |

**AssetGroup**: `{ label: string; isLiquid: boolean; entries: Entry[] }`
**Entry**: `{ label: string; amountCents: integer }`

**Derived**: net worth = Σ asset entries − Σ debt entries; liquid assets = Σ
entries of groups where `isLiquid` (FR-023).

---

## Category System (built-in defaults)

Seeded on first run; each has a class and a default color. Custom categories add
to this set. Built-in set (carried as a product decision):

- **Income**: Palkka, Osinko
- **Expense**: Ruoka, Ravintola, Bensa, Auto, Koira, Terveys, Urheilu, Vaatteet,
  Viihde, Digi, Puhelin, Vakuutus, Matkailu, Alko, Koti, Työmatkat, Taksi,
  Mobile Pay, Ginstia, Muu
- **Transfer**: Oma, Sijoitus, Asuntolaina, Opintolaina, Vastike, Vuokra

---

## Relationships

```text
ImportedFile 1 ── * Transaction        (Transaction.sourceFileId)
Transaction  1 ── 0..1 Override        (Override.transactionId)
CategoryMapEntry * ──> resolves category of many Transactions (by glob)
CategorySetting / CustomCategory ──> category names referenced by Transaction,
                                     CategoryMapEntry, Override, Budget
WealthSnapshot ── independent (manual entry; not linked to transactions)
```

## Category data set (the portable file)

The export/import file (FR-026/FR-027) contains exactly:
`categoryMap` (CategoryMapEntry[]) + `customCategories` (CustomCategory[]) +
`categorySettings` (CategorySetting[]). See `contracts/category-file.md`.

## Cross-cutting derived views (not stored)

- **Date-range filtering** of transactions for Dashboard/Transactions/Budget/Unmapped.
- **Totals**: income, expenses, net, savings rate for a range + prior-year delta.
- **Budget history**: 12-month average % and last-month % per category.
- **Wealth series**: net worth over time, liquid-by-group, cumulative
  own-savings vs market returns.
