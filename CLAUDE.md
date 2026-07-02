# Finance Dashboard v3 — Agent Context

Active feature: **001-finance-dashboard**. Read the plan before working:
[specs/001-finance-dashboard/plan.md](specs/001-finance-dashboard/plan.md).
Artifacts in `specs/001-finance-dashboard/`: spec.md, plan.md, research.md,
data-model.md, quickstart.md, contracts/ (tasks.md is added by /speckit-tasks).

## What this is
Local-first, single-user personal finance dashboard (Finnish UI, EUR). Import
Nordea CSVs → categorize transactions → track spending, budget, net worth. All
data on-device; fully offline. Clean-room build (no v2 code reused).

## Constitution (`.specify/memory/constitution.md`, v1.0.0) — non-negotiables
1. Local-first (pragmatic): no runtime network/telemetry; data never leaves device.
2. **Integer-cent money math** — never floats for money; format to EUR only at display.
3. Only the **category data set** is portable (export/import as one JSON file).
4. Money/calculation logic must have Vitest unit tests.
5. Polished UX (empty/loading/error states, toasts) is an acceptance criterion.
6. Single-user, YAGNI — no auth/sync/server/speculative abstractions.
7. Spec-first (flexible) — keep spec and app in sync.

## Stack (decided in plan)
React SPA on **Vite** + TypeScript (strict). **IndexedDB** via `idb` behind a
repository layer (`src/data/`). **Zustand** state. **PapaParse** + custom Nordea
mapping for CSV. **Recharts** charts. **Tailwind + shadcn/ui** (dark theme).
**Vitest** for domain tests.

## Architecture boundary
`domain/` (pure, tested money/calc logic) ↔ `data/` (IndexedDB only) ↔
`store/` + `components/` (UI). UI never touches the DB directly; money stays in
integer cents until the display boundary.
