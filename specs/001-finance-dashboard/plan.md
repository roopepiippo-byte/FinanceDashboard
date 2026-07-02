# Implementation Plan: Finance Dashboard v3

**Branch**: `001-finance-dashboard` | **Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-finance-dashboard/spec.md`

## Summary

A local-first, single-user personal finance dashboard: import Nordea CSVs,
categorize transactions (merchant rules + per-transaction overrides), and track
spending, budget, and net worth — all in Finnish/EUR, fully offline, with data
on-device. Technical approach: a **React SPA on Vite** (TypeScript strict),
persisting to **IndexedDB** through a typed repository layer, with all money as
**integer cents**, **Recharts** for visualization, and **Tailwind + shadcn/ui**
for the dark, card-based UI. The only portable dataset is the category data set
(export/import as one JSON file). See [research.md](./research.md) for the
resolved technology decisions.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), targeting ES2022 in the browser

**Primary Dependencies**: React 18/19, Vite, React Router, Zustand (state),
`idb` (IndexedDB), PapaParse (CSV tokenizing), Recharts (charts), Tailwind CSS +
shadcn/ui (UI), Vitest + jsdom (tests)

**Storage**: IndexedDB (database `finance-dashboard-v3`), accessed only via the
repository layer (`src/data/`). No server, no network persistence.

**Testing**: Vitest for money/calculation domain modules (parsing, totals,
savings rate, budget %↔€, net worth, glob resolution)

**Target Platform**: Modern evergreen browsers; client-only static build (works
fully offline after first load)

**Project Type**: Single-project web SPA (frontend only; no backend)

**Performance Goals**: Smooth interaction with thousands of transactions; date-
range/category recomputation feels instant; charts render without visible jank

**Constraints**: Offline-capable; no external runtime requests (Principle I);
integer-cent money only (Principle II); Finnish locale/EUR formatting throughout

**Scale/Scope**: One user, one device; 7 pages; years of imported transactions
(low tens of thousands of rows) held client-side

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Gate | Status |
|---|-----------|------|--------|
| I | Local-First (Pragmatic) | No runtime network/telemetry; data on-device; deps bundled; fonts self-hosted | **PASS** — Vite SPA + IndexedDB, no server, no external data calls (research D10) |
| II | Integer-Cent Money Math | All money as integer cents; format only at display | **PASS** — single `domain/money.ts`; centralized rounding (research D4) |
| III | Category Data Portable | Category data set export/importable as a standalone file | **PASS** — `contracts/category-file.md`; no other export mandated |
| IV | Money Logic Tested | Unit tests for parsing/totals/budget/net-worth math | **PASS** — Vitest over domain modules (research D9) |
| V | Polished UX = acceptance | Empty/loading/error states, responsive, toasts | **PASS** — shadcn/ui + explicit per-view states; enforced in quickstart validation |
| VI | Single-User Simplicity (YAGNI) | No auth/sync/server/speculative abstraction | **PASS** — client-only, minimal deps, single store with slices |
| VII | Spec-First (Flexible) | Work derived from spec; changes back-filled | **PASS** — this plan derives from spec.md; artifacts kept in sync |

**Result**: All gates pass. No violations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-finance-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions
├── data-model.md        # Phase 1 — entities
├── quickstart.md        # Phase 1 — run & validation guide
├── contracts/           # Phase 1 — data-access, category-file, nordea-csv
│   ├── data-access.md
│   ├── category-file.md
│   └── nordea-csv.md
└── tasks.md             # Phase 2 — created by /speckit-tasks (NOT here)
```

### Source Code (repository root)

Single-project React SPA (frontend only):

```text
finance-dashboard-v3/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind config + globals.css     # dark-theme design tokens
├── public/                           # self-hosted fonts, icons
└── src/
    ├── main.tsx                      # app bootstrap, DB init, store hydration
    ├── App.tsx                       # router + layout (sidebar + date range)
    ├── routes/                       # one component per page
    │   ├── Dashboard.tsx
    │   ├── Transactions.tsx
    │   ├── Budget.tsx
    │   ├── Wealth.tsx
    │   ├── Unmapped.tsx
    │   ├── Import.tsx
    │   └── Settings.tsx
    ├── components/
    │   ├── ui/                       # shadcn/ui primitives
    │   ├── layout/                   # Sidebar, DateRangePicker, Toaster
    │   └── charts/                   # Recharts wrappers (Trend, Donut, NetWorth, ...)
    ├── domain/                       # PURE, tested logic (no IO)
    │   ├── money.ts                  # integer-cent math + fi-FI formatting
    │   ├── csv/                      # Nordea mapping + number/date parsing
    │   ├── categorize.ts             # override→glob→uncategorized resolution
    │   ├── totals.ts                 # income/expenses/net/savings-rate, YoY delta
    │   ├── budget.ts                 # %↔€, 12-mo avg, allocation
    │   └── wealth.ts                 # net worth, liquid, savings-vs-returns
    ├── data/                         # IndexedDB access ONLY
    │   ├── db.ts
    │   └── repositories/             # per-store repositories (see contract)
    ├── store/                        # Zustand slices + selectors
    ├── lib/                          # format (fi-FI dates/numbers), glob, ids
    └── types/                        # shared entity interfaces
```

Domain tests are co-located as `*.test.ts` beside each `domain/` module.

**Structure Decision**: Single-project SPA — there is no backend (Principle VI).
The critical boundary is **`domain/` (pure, tested) ↔ `data/` (IndexedDB) ↔
`store/` + `components/` (UI)**: money/calculation logic stays pure and unit-
tested (Principle IV), persistence is isolated behind repositories (research D3),
and UI never touches the DB directly.

## Complexity Tracking

No constitution violations — no entries.
