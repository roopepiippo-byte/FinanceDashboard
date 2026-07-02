# Finance Dashboard v3 Constitution

A local-first personal finance dashboard for a single user: import bank CSVs,
categorize transactions, and track spending, budget, and net worth. This
constitution defines the non-negotiable principles that govern how the project
is built. It supersedes convenience and personal preference when they conflict.

## Core Principles

### I. Local-First (Pragmatic)

All user financial data lives on the user's own device and MUST NOT leave it
except through an action the user explicitly initiates (e.g. an export or a file
download). The app MUST NOT send transactions, balances, categories, budgets, or
wealth figures to any server, analytics service, or third party.

Benign, data-free external dependencies are permitted (e.g. CDN-hosted assets,
fonts, or libraries) **only** when they carry no user financial data and are not
required for the app to function offline. There is NO account, login, OAuth, or
API key anywhere in the product. When in doubt, keep it on the device.

### II. Integer-Cent Money Math (NON-NEGOTIABLE)

Every monetary value is stored and computed as an **integer number of cents**.
Floating-point numbers MUST NOT be used to represent or accumulate money.
Conversion to a formatted EUR string happens only at the display boundary.
Parsing (from CSV), summation, averaging, percentages, and budget/net-worth
calculations all operate on integer cents. Rounding rules MUST be explicit and
applied at a single, documented place.

### III. Category Data Is Portable

The **category data set** — the merchant→category mappings and the category
definitions the app accumulates — MUST always be exportable to, and importable
from, a standalone file. This is the one dataset the user cannot afford to
rebuild by hand, so it is never trapped inside the app.

Importing an older or partial category file MUST NOT corrupt existing data;
missing fields fall back to sensible defaults. No other dataset (transactions,
budgets, wealth snapshots) is required to be exportable — that may be added as a
feature, but it is not a governing obligation.

### IV. Money Logic Is Tested

Any code that parses, sums, converts, or derives monetary or percentage values
MUST have unit tests: CSV amount/date parsing, income/expense/net totals,
savings rate, budget percentage↔euro conversion, and net-worth math. Tests cover
representative cases plus edge cases (negatives, zero, empty ranges, Finnish
number formatting). UI-only and presentational code is exempt from a testing
mandate. Correctness of money is proven by tests, not by inspection.

### V. Polished UX Is an Acceptance Criterion

A feature is not "done" until it is finished to a usable standard. Every
data-driven view MUST handle its empty, loading, and error states; layouts MUST
be responsive; actions MUST give feedback (e.g. toasts); and there MUST be no
obviously rough edges. "It works on the happy path" is not acceptance — the
polished state is the definition of done.

### VI. Single-User Simplicity (YAGNI)

The product serves one person on one device. Multi-user support, authentication,
roles, cloud sync, and server infrastructure are explicitly out of scope and
MUST NOT be built. Prefer the simplest design that satisfies the current spec;
do not add speculative abstractions, configuration, or extensibility for
imagined future needs. Complexity must earn its place against a real, present
requirement.

### VII. Spec-First (Flexible)

Meaningful work flows from the Spec Kit artifacts: spec → plan → tasks →
implementation. The spec is the source of truth for intended behavior. Small,
obvious changes may be made directly and back-filled into the spec promptly;
substantive changes to behavior or scope update the spec first. The spec and the
running app must not be allowed to drift apart for long.

## Additional Constraints

- **Technology stack is intentionally unspecified.** This constitution mandates
  principles, not tools. The framework, language, storage mechanism, styling
  approach, and charting library are decided during `/speckit-plan` and recorded
  in the plan — not here. Any chosen stack MUST be compatible with Principles
  I–VII (notably: works offline, keeps data local, and can represent money as
  integer cents).
- **Localization & format.** The user-facing product is in Finnish, uses EUR,
  and follows Finnish date and number conventions (space thousands separator,
  comma decimal). This is a cross-cutting constraint on every feature.
- **Clean-room build.** v3 is built from the specification, not by copying code
  from prior versions.

## Development Workflow

- Work proceeds through Spec Kit phases; `/speckit-plan` and `/speckit-tasks`
  precede implementation for any non-trivial feature.
- Money-logic changes are accompanied by their tests (Principle IV) in the same
  change.
- A feature is reviewed against its acceptance scenarios and the polished-UX bar
  (Principle V) before being considered complete.
- When a change conflicts with a principle here, the principle wins or the
  constitution is amended first — it is not silently violated.

## Governance

This constitution supersedes ad-hoc practice. Amendments are made by editing this
file with a clear rationale and a version bump per the policy below. Any
complexity or deviation must be justified against a present requirement; "might
need it later" is not a justification (Principle VI).

**Versioning policy** (semantic):
- **MAJOR** — remove or fundamentally redefine a principle.
- **MINOR** — add a principle or materially expand guidance.
- **PATCH** — clarifications and wording that don't change intent.

All implementation work is expected to comply; where the spec, plan, or tasks
disagree with this constitution, this constitution is authoritative until
amended.

**Version**: 1.0.0 | **Ratified**: 2026-07-01 | **Last Amended**: 2026-07-01
