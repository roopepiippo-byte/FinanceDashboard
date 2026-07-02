# Research: Finance Dashboard v3

**Feature**: 001-finance-dashboard | **Date**: 2026-07-01 | **Phase**: 0

This document resolves the open technical questions for the plan. The high-level
stack was fixed by the user (React SPA on Vite, IndexedDB, Recharts, Tailwind +
shadcn/ui). The items below pin down the remaining choices and the rationale, in
line with the constitution (local-first, integer-cent money, category-data
portability, money-logic tests, polished UX, single-user YAGNI, spec-first).

---

## D1. CSV parsing approach

**Decision**: Use **PapaParse** to tokenize CSV rows, wrapped by a small,
project-owned Nordea mapping/normalization module that does Finnish number/date
parsing.

**Rationale**:
- Nordea exports have real-world CSV hazards: a UTF-8 BOM, `;` delimiters,
  quoted fields, and occasional embedded separators. PapaParse handles BOM
  stripping, delimiter auto-detection, and quoting robustly — reinventing this
  is exactly the fragile code Principle IV wants covered by tests but which is
  cheaper to delegate to a battle-tested tokenizer.
- The **domain-specific** parts (Finnish `1 234,56` → integer cents, `dd.mm.yyyy`
  → ISO date, income/expense sign, merchant normalization, dedup identity) live
  in our own `domain/csv` module and are unit-tested. This keeps the tested
  surface focused on the logic that is actually ours and finance-critical.

**Alternatives considered**:
- *Hand-rolled line splitter* — rejected: brittle with quoted fields/embedded
  delimiters and BOM; more edge-case test burden than it saves.
- *csv-parse (Node-oriented)* — rejected: heavier, stream/Node-leaning API; less
  ergonomic for browser File input than PapaParse.

---

## D2. Client-state approach

**Decision**: **Zustand** for in-memory app/domain state, hydrated from IndexedDB
on startup and written back through the data-access layer. No server-state
library.

**Rationale**:
- All state is local; there is no server cache to manage, so TanStack Query /
  SWR would add a concept the app never uses.
- Zustand is ~1 KB, has no provider-tree boilerplate, and supports cheap derived
  selectors — a good fit for the frequently-recomputed views (date-range
  filtering, category resolution, totals) without re-rendering the whole tree.
- Keeps to YAGNI (Principle VI): a single store with slices per domain area
  (transactions, categories, budget, wealth, ui) rather than a heavy framework.

**Alternatives considered**:
- *React Context + useReducer* — rejected: context re-renders every consumer on
  any change; selector ergonomics and performance are worse for the dashboard's
  many derived values.
- *Redux Toolkit* — rejected: more ceremony than a single-user local app needs.

---

## D3. IndexedDB access layer

**Decision**: Use the **`idb`** library (Jake Archibald) as a thin, typed,
promise-based wrapper, behind a project **repository layer** (`data/`), never
touched directly from components.

**Rationale**:
- Raw IndexedDB is verbose and event-based; `idb` is a minimal promise wrapper
  (~1 KB) that keeps the code readable without adding a query engine.
- A repository layer per object store gives one typed place for reads/writes,
  satisfies "wrap access behind a small typed data-access layer," and isolates
  persistence from UI/state so it can be tested and evolved independently.

**Alternatives considered**:
- *Dexie.js* — rejected: a full query/ORM layer is more than simple keyed object
  stores require (YAGNI); larger bundle.
- *Raw IndexedDB* — rejected: verbose, error-prone, poor DX.
- *localStorage* — already rejected during planning: ~5 MB cap and synchronous
  API are unsuitable for years of imported transactions.

**Schema note**: one database (`finance-dashboard-v3`) with object stores:
`transactions` (keyPath `id`), `importedFiles`, `categoryMap`, `overrides`,
`budget` (singleton), `categorySettings`, `wealthSnapshots`, `customCategories`.
Indexes: `transactions` by `date` and by `category` to support range and
category queries.

---

## D4. Money representation & formatting

**Decision**: A single `domain/money.ts` module. All amounts are **integer
cents** (`number`, safe within `Number.MAX_SAFE_INTEGER` for realistic personal
finance). Parsing, arithmetic, percentage, and averaging operate on cents;
rounding is centralized in one `roundCents`/`divideCents` helper. Display uses
`Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' })`.

**Rationale**: Constitution Principle II (non-negotiable). Centralized rounding
gives one tested place for banker's/half-up rounding decisions (chosen:
round-half-away-from-zero, documented in the module).

**Alternatives considered**: floating-point euros (rejected by constitution);
decimal.js/big.js (rejected: unnecessary weight — integers suffice for cents).

---

## D5. Localization & formatting

**Decision**: Finnish formatting via the platform `Intl` API — currency as in D4;
dates via a small `lib/format.ts` producing `dd.mm.yyyy` (and month `MM/yyyy`)
and parsing the same. Store dates as ISO `YYYY-MM-DD` strings internally; format
at the display boundary only.

**Rationale**: `Intl` is built-in (no dependency, offline), and ISO storage keeps
sorting/range math trivial while display stays Finnish.

---

## D6. Category-map glob matching

**Decision**: Convert each stored glob pattern to a regex (escape regex
metacharacters, translate `*` → `.*`, anchor with `^…$`) and match against
`merchantLower`. Resolution order per FR-011: manual override → first matching
glob (longest pattern wins on ties, for determinism) → uncategorized. Implement
in `domain/categorize.ts`, unit-tested.

**Rationale**: Simple, dependency-free, deterministic; "longest pattern wins"
gives a predictable winner for the overlapping-rules edge case.

---

## D7. Charting

**Decision**: **Recharts** for all charts — `LineChart` (trend, net worth),
`PieChart` with active-slice + `onClick` (category donut drill-down),
`BarChart`/stacked bars (liquid assets by group, own-savings-vs-market-returns).
Dark theme via CSS variables passed to chart colors.

**Rationale**: Declarative React API covering every chart type in the spec; easy
dark theming; the click-to-drill donut is a first-class Recharts pattern.

---

## D8. Routing

**Decision**: **React Router** (v6/v7) with a persistent layout route rendering
the sidebar + date-range selector, and a child route per page. Data-dependent
routes render a "no data yet" empty state (and their sidebar item is disabled)
until transactions exist (FR-030).

**Rationale**: Standard, well-understood client routing; layout routes model the
fixed sidebar cleanly.

---

## D9. Testing

**Decision**: **Vitest** (+ jsdom) for the money/calculation domain modules
(`money`, `csv`, `categorize`, `totals`, `budget`, `wealth`), co-located as
`*.test.ts`. A few React Testing Library smoke tests are optional and not
mandated. Coverage target focuses on domain logic, not UI.

**Rationale**: Vitest shares Vite's config/transform (zero extra build setup) and
directly satisfies Constitution Principle IV.

---

## D10. Offline / no-network guarantee

**Decision**: All dependencies are bundled at build time; **fonts are
self-hosted** (no Google Fonts runtime fetch); no analytics, telemetry, or
runtime third-party requests. The app is fully functional offline after first
load. A lint/CI check (or manual review) confirms no `fetch`/`XMLHttpRequest` to
external origins.

**Rationale**: Satisfies Constitution Principle I. The "pragmatic externals"
allowance is used only for build-time packages, not runtime data calls.

---

## Resolved dependency summary

| Concern | Choice |
|---|---|
| Build/app shell | Vite + React + TypeScript (strict) |
| Routing | React Router |
| State | Zustand (slices) |
| Persistence | IndexedDB via `idb`, behind repositories |
| CSV | PapaParse + custom Nordea mapping module |
| Charts | Recharts |
| UI | Tailwind CSS + shadcn/ui (dark theme tokens) |
| Money | integer cents + `Intl` (fi-FI) formatting |
| Tests | Vitest (+ jsdom) |

No `NEEDS CLARIFICATION` items remain.
