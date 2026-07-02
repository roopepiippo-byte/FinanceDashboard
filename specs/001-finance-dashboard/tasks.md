---
description: "Task list for Finance Dashboard v3 implementation"
---

# Tasks: Finance Dashboard v3

**Input**: Design documents from `specs/001-finance-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Money/calculation logic tests are INCLUDED because Constitution
Principle IV mandates unit tests for parsing, totals, budget, and net-worth math.
UI-only components are not test-gated.

**Organization**: Tasks are grouped by user story (US1–US7 from spec.md) so each
story can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US7)
- All paths are relative to the repository root (`finance-dashboard-v3/`)

## Path Conventions

Single-project React SPA: source in `src/`, domain tests co-located as
`*.test.ts` beside the module under test. See plan.md → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Initialize Vite + React + TypeScript (strict) project — `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`
- [X] T002 [P] Add and pin runtime dependencies (react-router, zustand, idb, papaparse, recharts) in `package.json`
- [X] T003 [P] Configure Tailwind CSS + shadcn/ui with dark-theme design tokens — `tailwind.config.ts`, `src/styles/globals.css`, `components.json`
- [X] T004 [P] Configure Vitest + jsdom — `vitest.config.ts`, `src/test/setup.ts`
- [X] T005 [P] Configure ESLint + Prettier — `eslint.config.mjs`, `.prettierrc`
- [X] T006 Create source folder structure per plan (`src/routes`, `src/components/{ui,layout,charts}`, `src/domain`, `src/data/repositories`, `src/store`, `src/lib`, `src/types`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core money math, storage, types, and app shell that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Define shared entity interfaces (Transaction, ImportedFile, CategoryMapEntry, Override, Budget, CategorySetting, CustomCategory, WealthSnapshot, AssetGroup, Entry) in `src/types/index.ts`
- [X] T008 [P] Implement integer-cent money module (parse, add/sub/mul, centralized rounding, `fi-FI` EUR formatting) in `src/domain/money.ts`
- [X] T009 [P] Unit tests for money module (rounding, division, formatting, negatives/zero) in `src/domain/money.test.ts`
- [X] T010 [P] Implement Finnish date/number formatting + parsing (`dd.mm.yyyy`, `MM/yyyy`, space-thousands/comma-decimal) in `src/lib/format.ts` with tests `src/lib/format.test.ts`
- [X] T011 [P] Implement glob→regex matcher (escape, `*`→`.*`, anchored, longest-match helper) in `src/lib/glob.ts` with tests `src/lib/glob.test.ts`
- [X] T012 [P] Implement stable transaction id hashing (date+amountCents+merchantLower+rowIndex) in `src/lib/id.ts` with tests `src/lib/id.test.ts`
- [X] T013 Implement IndexedDB init + schema (all object stores + `date`/`category` indexes, `openDB`) in `src/data/db.ts` per `contracts/data-access.md`
- [X] T014 [P] Seed built-in category system (names, classes, default colors) in `src/domain/categories.ts` per data-model.md
- [X] T015 Scaffold Zustand store with slices (transactions, categories, budget, wealth, ui) and startup hydration from repositories in `src/store/`; include a persisted display-settings entry (e.g. the 4 quick-spend categories per FR-014, car-chart visibility per FR-015) in a small `settings` object store
- [X] T016 [P] Implement date-range preset logic (this/last month, last 3/6/12mo, this/last year, custom) in `src/lib/dateRange.ts` with tests `src/lib/dateRange.test.ts`
- [X] T017 Build app shell: React Router layout with fixed Sidebar (nav + uncategorized badge slot, data-dependent items disabled until data exists), DateRangePicker, and Toaster in `src/App.tsx`, `src/components/layout/`

**Checkpoint**: Foundation ready — money math tested, DB open, store + shell in place. User stories can begin.

---

## Phase 3: User Story 1 - Import bank transactions from CSV (Priority: P1) 🎯 MVP

**Goal**: Drag-and-drop Nordea CSV import that parses, dedupes, and persists transactions and lists imported files.

**Independent Test**: Drop a valid Nordea CSV → transactions persist and the file lists with correct count; re-import adds no duplicates (SC-002).

- [X] T018 [P] [US1] Implement transactions repository (getAll, getByDateRange, idempotent bulkUpsert, delete, deleteBySourceFile, deleteAll) in `src/data/repositories/transactions.ts`
- [X] T019 [P] [US1] Implement importedFiles repository (list, add, remove) in `src/data/repositories/importedFiles.ts`
- [X] T020 [US1] Implement Nordea CSV parsing (PapaParse, BOM strip, `Kirjauspäivä` detection, `;` delimiter) in `src/domain/csv/parse.ts` per `contracts/nordea-csv.md`
- [X] T021 [US1] Implement Nordea row mapping (Finnish amount→integer cents, date→ISO, merchantLower, dedup id, per-file rowIndex) in `src/domain/csv/mapNordea.ts`
- [X] T022 [P] [US1] Unit tests for CSV parse+map (Finnish numbers, BOM, dedup identity, malformed-row partial success) in `src/domain/csv/mapNordea.test.ts`
- [X] T023 [US1] Wire import into store: merge new transactions, dedup by id, persist, create ImportedFile in `src/store/` (transactions slice)
- [X] T024 [US1] Build Import page (prominent drop zone + empty state, imported-files table with filename/date/count, delete-with-confirm that cascades to the file's transactions via `transactions.deleteBySourceFile`, success/error toasts) in `src/routes/Import.tsx`

**Checkpoint**: US1 fully functional and independently testable (import + dedup + file list).

---

## Phase 4: User Story 2 - Categorize transactions by merchant (Priority: P1)

**Goal**: Group uncategorized transactions by merchant, apply category to all, save merchant rules for auto-categorization, and support per-transaction overrides.

**Independent Test**: Categorize a merchant group → all its transactions get the category and a saved rule; re-import auto-categorizes (SC-003); an inline override wins over the rule.

- [X] T025 [P] [US2] Implement categoryMap repository (getAll, upsert, remove, replaceAll, clear) in `src/data/repositories/categoryMap.ts`
- [X] T026 [P] [US2] Implement overrides repository (getAll, set, remove) in `src/data/repositories/overrides.ts`
- [X] T027 [US2] Implement category resolution (override → longest-matching glob → uncategorized; sets category/class/isManualOverride) in `src/domain/categorize.ts` per FR-011
- [X] T028 [P] [US2] Unit tests for resolution priority + glob conflicts in `src/domain/categorize.test.ts`
- [X] T029 [US2] Wire categorization into store (apply map on import + on demand, recompute resolved fields) in `src/store/` (categories/transactions slices)
- [X] T030 [US2] Build Unmapped page (two tabs: Luokittelematta / Manuaalisesti asetettu; merchant grouping with counts + apply-to-all) in `src/routes/Unmapped.tsx`
- [X] T031 [US2] Wire uncategorized-count badge in the sidebar to live store state in `src/components/layout/Sidebar.tsx`
- [X] T032 [P] [US2] Build reusable inline CategoryCell (dropdown → saves manual override + shows badge) in `src/components/CategoryCell.tsx` (used by Transactions page in US4)

**Checkpoint**: US2 delivers merchant mapping, auto-categorization, and the override mechanism.

---

## Phase 5: User Story 3 - Dashboard financial overview (Priority: P1)

**Goal**: KPI cards, quick-spend cards, trend/donut/car charts with donut drill-down for the selected date range.

**Independent Test**: With categorized data and a range, KPIs compute (net = income − expenses), quick-spend shows configured categories, and clicking a donut slice drills into that category's transactions.

- [X] T033 [P] [US3] Implement derivations (income, expenses, net, savings rate, prior-year delta, per-category spend, monthly net series), **excluding categories with `visible:false`** from all totals/series, in `src/domain/totals.ts` (FR-028)
- [X] T034 [P] [US3] Unit tests for totals/savings-rate/YoY delta (incl. empty range) in `src/domain/totals.test.ts`
- [X] T035 [P] [US3] Build chart components (TrendChart 3-series, CategoryDonut with `onClick` drill — excludes hidden categories, CarChart hideable) in `src/components/charts/`
- [X] T036 [US3] Build Dashboard page (4 KPI cards with deltas, 4 quick-spend cards driven by the Settings-configured categories, charts, donut→transaction drill-through) in `src/routes/Dashboard.tsx`

**Checkpoint**: P1 set (US1–US3) complete → viable MVP: import → categorize → see the dashboard.

---

## Phase 6: User Story 4 - Transactions ledger (Priority: P2)

**Goal**: Searchable, filterable ledger with inline categorization and per-row delete.

**Independent Test**: Live-search by merchant; filter by category and by type (income/expense/both); reassign inline (override + badge); delete one row with confirmation.

- [X] T037 [US4] Build Transactions page (table: date/merchant/category/amount/actions; live merchant search; category + type filters; inline CategoryCell from T032; delete-with-confirm) in `src/routes/Transactions.tsx`

**Checkpoint**: US4 works on top of US1/US2 data without breaking them.

---

## Phase 7: User Story 5 - Budget planning (Priority: P2)

**Goal**: Savings goal, per-category targets (%↔€ synced), fill-from-history, and allocation breakdown.

**Independent Test**: Set savings goal; edit target % → € updates and vice versa; fill from 12-month history; allocation shows savings/allocations/unallocated.

- [X] T038 [P] [US5] Implement budget math (avg monthly income, %↔€ conversion, 12-mo avg %, last-month %, allocation split) over **visible categories only** in `src/domain/budget.ts` (FR-028)
- [X] T039 [P] [US5] Unit tests for budget %↔€ round-trip and history averages in `src/domain/budget.test.ts`
- [X] T040 [P] [US5] Implement budget repository (get/save singleton) in `src/data/repositories/budget.ts`
- [X] T041 [US5] Build Budget page (savings-goal slider+input, editable budget table, fill-from-history button, allocation pie) in `src/routes/Budget.tsx`

**Checkpoint**: US5 independently functional.

---

## Phase 8: User Story 6 - Wealth / net worth (Priority: P2)

**Goal**: Manual monthly snapshots (grouped assets + debts), KPI cards, wealth charts, month-detail deltas.

**Independent Test**: Add a snapshot with grouped assets/debts (mark a group liquid) → KPIs (net worth = assets − debts), charts, and month-detail table with deltas render correctly.

- [X] T042 [P] [US6] Implement wealth math (net worth, total assets/debts, liquid assets, own-savings-vs-market-returns back-calc, month-over-month deltas) in `src/domain/wealth.ts`
- [X] T043 [P] [US6] Unit tests for wealth math + returns back-calc (incl. missing contributions) in `src/domain/wealth.test.ts`
- [X] T044 [P] [US6] Implement wealth repository (list, upsert, remove) in `src/data/repositories/wealth.ts`
- [X] T045 [P] [US6] Build wealth charts (NetWorthChart line, LiquidChart stacked bar, WealthSourceChart stacked bar) in `src/components/charts/`
- [X] T046 [US6] Build Wealth page (manual entry panel: user-defined groups/labels/debts + liquid flag + savings contribution; 4 KPI cards; charts; month-detail table) in `src/routes/Wealth.tsx`

**Checkpoint**: US6 independently functional.

---

## Phase 9: User Story 7 - Data management & category-data portability (Priority: P2)

**Goal**: Data summary, category-data file export/import (merge/replace, partial-file safe), category visibility, custom categories, and destructive data actions.

**Independent Test**: Export category data → clear → re-import (merge/replace) restores mappings/custom categories/settings with zero loss (SC-004); toggling a category hidden excludes it from charts/totals.

- [X] T047 [P] [US7] Implement categorySettings + customCategories repositories in `src/data/repositories/categorySettings.ts` and `src/data/repositories/customCategories.ts`
- [X] T048 [US7] Implement category-data file export/import (format/version validation, merge vs replace, absent-section skip) in `src/domain/categoryFile.ts` per `contracts/category-file.md`
- [X] T049 [P] [US7] Unit tests for category-file merge/replace + partial/older-file safety in `src/domain/categoryFile.test.ts`
- [X] T050 [US7] Implement danger-zone actions (deleteAll transactions, clear category map, resetAll) wired to confirmations in `src/data/repositories/` and store
- [X] T051 [US7] Build Settings page (data summary; export/import category file with merge/replace choice; per-category visibility toggles; add custom category w/ color; **quick-spend picker to choose the 4 Dashboard quick-spend categories** (FR-014); delete-with-confirm actions) in `src/routes/Settings.tsx`

**Checkpoint**: All seven stories independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Meet the polished-UX bar and the local-first/offline guarantees across all stories

- [ ] T052 [P] Ensure empty/loading/error states + toasts on every page (Constitution Principle V)
- [ ] T053 [P] Offline/no-network verification: self-host fonts, confirm zero runtime external requests (Constitution Principle I / research D10)
- [ ] T054 [P] Responsive + accessibility pass (dark theme contrast, keyboard nav, mobile-friendly cards/tables)
- [ ] T055 [P] Finnish localization audit (all labels, EUR currency, `dd.mm.yyyy` dates, Finnish number formatting) — FR-032/SC-007
- [ ] T056 Run `quickstart.md` validation scenarios end-to-end (US1–US7) and fix gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–9)**: all depend on Foundational; then proceed in priority order (P1: US1→US2→US3, then P2: US4–US7) or in parallel if staffed
- **Polish (Phase 10)**: depends on the targeted user stories being complete

### User Story Dependencies

- **US1 (P1)**: needs Foundational only — no dependency on other stories
- **US2 (P1)**: needs Foundational; consumes US1 data in practice but is independently testable with any transactions
- **US3 (P1)**: needs Foundational; renders meaningfully once US1/US2 provide categorized data, but derivations are testable standalone
- **US4 (P2)**: reuses the CategoryCell built in US2 (T032)
- **US5, US6, US7 (P2)**: need Foundational only; mutually independent

### Within Each User Story

- Repositories + domain logic before the page component
- Domain unit tests alongside the domain logic (Principle IV)
- Page assembly last (integration)

### Parallel Opportunities

- Setup: T002–T005 in parallel
- Foundational: T007–T012, T014, T016 in parallel (pure modules/types); T013 store schema and T015/T017 store+shell follow
- Domain logic + its tests per story are `[P]` against other stories' modules (different files)
- With a team, US4–US7 can be built in parallel after Foundational

---

## Parallel Example: User Story 1

```bash
# Repositories (different files) in parallel:
Task: "Implement transactions repository in src/data/repositories/transactions.ts"   # T018
Task: "Implement importedFiles repository in src/data/repositories/importedFiles.ts" # T019

# CSV tests can be written in parallel with page work once parse/map exist:
Task: "Unit tests for CSV parse+map in src/domain/csv/mapNordea.test.ts"             # T022
```

---

## Implementation Strategy

### MVP scope

- **Smallest demoable**: US1 alone (import + dedup + imported-files list).
- **Viable product MVP**: the full **P1 set — US1 + US2 + US3** (import → categorize → dashboard), which is the spec's primary workflow.

### Incremental delivery

1. Setup + Foundational → foundation ready (money math tested, DB, shell)
2. US1 → test → demo (import works)
3. US2 → test → demo (categorization + auto-mapping)
4. US3 → test → demo (dashboard) — **MVP complete**
5. US4 → US5 → US6 → US7, each tested and demoed independently
6. Polish pass (Phase 10)

---

## Notes

- `[P]` = different files, no dependency on incomplete tasks
- `[Story]` label maps each task to a spec user story for traceability
- All money stays in integer cents until the display boundary (Principle II)
- Domain modules are unit-tested (Principle IV); commit after each task or logical group
- Stop at any checkpoint to validate a story independently
