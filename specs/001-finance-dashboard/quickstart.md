# Quickstart & Validation: Finance Dashboard v3

**Feature**: 001-finance-dashboard | **Phase**: 1

How to run the app and validate the feature end-to-end. Scenarios map to the
spec's user stories and acceptance criteria. (Directory/config names are the
planned layout; created during implementation.)

## Prerequisites

- Node.js 20+ and npm
- A modern browser (IndexedDB support)
- A sample Nordea CSV export (BOM + `;`-delimited + Finnish number format)

## Setup & run

```bash
npm install
npm run dev          # Vite dev server → open the printed localhost URL
npm run test         # Vitest — money/calculation domain tests (Principle IV)
npm run build        # production build
npm run preview      # serve the build; verify it works fully offline
```

**Offline check (SC-005 / Principle I)**: load the app, then disable the network
(DevTools → Network → Offline) and confirm every page still works and no external
requests are attempted.

## Validation scenarios

Each scenario should pass before the story is considered done (polished-UX bar,
Principle V — check empty/loading/error states too).

### US1 — Import (P1)
1. Open **Tuo CSV**; drop the sample Nordea CSV.
2. **Expect**: transactions parse; the file appears with filename, import date,
   and count. Finnish amounts (`1 234,56`) and dates (`dd.mm.yyyy`) are correct.
3. Re-drop the same file → **Expect**: no duplicates added (SC-002).

### US2 — Categorize by merchant (P1)
1. Open **Luokittele**; confirm uncategorized transactions are grouped by merchant.
2. Assign a category to a merchant group → **Expect**: all its transactions get
   the category; a `merchantLower*` rule is saved.
3. Import another file containing that merchant → **Expect**: auto-categorized
   (SC-003).
4. On **Tapahtumat**, reassign one transaction inline → **Expect**: manual-override
   badge; it wins over the merchant rule (FR-011).

### US3 — Dashboard (P1)
1. Open **Kojelauta** with a date range selected.
2. **Expect**: KPI cards (Tulot/Kulut/Netto/Säästöaste) with prior-year deltas;
   quick-spend cards; trend line; category donut. Click a donut slice → drills
   into that category's transactions. Verify net = income − expenses (SC-006).

### US4 — Transactions ledger (P2)
Search by merchant (live), filter by category and by type (income/expense/both),
delete one transaction with confirmation.

### US5 — Budget (P2)
Set savings goal; edit a category target % → € updates (and vice versa); "fill
from 12-month history"; allocation breakdown shows savings/allocations/unallocated.

### US6 — Wealth (P2)
Add a monthly snapshot (grouped assets + debts, mark a group liquid); verify
KPI cards (net worth = assets − debts), net-worth chart, liquid-by-group chart,
and the month-detail table with deltas.

### US7 — Category-data portability (P2)
1. **Asetukset** → export the category data file.
2. Clear category data (or use a fresh browser profile) → re-import the file
   (choose merge/replace).
3. **Expect**: all merchant→category mappings, custom categories, and category
   settings restored with zero loss (SC-004). Toggle a category to hidden →
   excluded from all charts and totals.

## Money-logic test coverage (Principle IV)

`npm run test` must cover: CSV amount/date parsing (Finnish format, BOM),
income/expense/net totals, savings rate, budget %↔€ conversion, net-worth math,
and glob category resolution. All amounts asserted in integer cents.
