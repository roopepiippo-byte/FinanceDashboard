# Feature Specification: Finance Dashboard v3

**Feature Branch**: `001-finance-dashboard`

**Created**: 2026-07-01

**Status**: Draft

**Input**: Product specification carried forward from Finance Dashboard v2 (`Desktop/finance-dashboard-v2/spec.md`). A local-first personal finance dashboard: import bank CSVs, categorize transactions, and track spending, budget, and net worth. Finnish UI, EUR, all data stored locally on the device; the category data set is exportable and importable as a standalone file.

## Vision

A local-first personal finance dashboard with no logins, no cloud dependencies, and no external accounts. All data lives on the user's device and is always exportable. The experience should feel modern and purposeful — clean cards, readable charts, fast interactions.

The primary workflow is: **import bank CSVs → categorize transactions → track spending, budget, and net worth over time.** Everything the app learns is stored locally on the device. The category data set specifically can be exported at any time so the hardest-to-rebuild knowledge is never lost.

### Core Principles

1. **Local-first** — every piece of data is stored on the device. Nothing leaves the device unless the user explicitly exports it.
2. **Portable category data** — the category data set (merchant→category mappings and category definitions) can always be exported to, and re-imported from, a standalone file, so the one dataset that is painful to rebuild by hand is never lost. Other data need not be exportable.
3. **No logins** — zero OAuth, zero cloud accounts, zero API keys required to use the app.
4. **Modern UI** — dark, card-based design with consistent spacing and responsive layout; same visual language proven in prior versions.
5. **Finnish language UI** — all labels, navigation, and formatting in Finnish; EUR currency; Finnish date and number formats.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import bank transactions from CSV (Priority: P1)

A user drags one or more Nordea CSV exports onto the Import page. The app parses each file, deduplicates against existing data, and merges new transactions into the local dataset. The user sees a list of imported files with counts.

**Why this priority**: Without imported data the rest of the app has nothing to show. This is the foundational intake step and delivers immediate value on its own (a parsed, persisted transaction dataset).

**Independent Test**: Drop a valid Nordea CSV; confirm transactions are parsed and stored, the file appears in the imported-files list with the correct count, and re-importing the same file adds no duplicates.

**Acceptance Scenarios**:

1. **Given** an empty app, **When** the user drops a valid Nordea CSV, **Then** its transactions are parsed and persisted and the file is listed with filename, import date, and transaction count.
2. **Given** transactions already imported, **When** the user re-imports the same file, **Then** no duplicate transactions are created (dedup by transaction identity).
3. **Given** a CSV using Finnish number formatting (space thousands separator, comma decimal) and a byte-order mark, **When** it is imported, **Then** amounts and dates parse correctly.
4. **Given** an imported file in the list, **When** the user deletes it and confirms, **Then** the app removes that file entry and the transactions imported from it.

---

### User Story 2 - Categorize transactions by merchant (Priority: P1)

A user opens the Luokittele (Unmapped) page to assign categories to transactions that have none. Transactions are grouped by merchant so the user can categorize many at once; assigning a category to a merchant saves a merchant→category rule locally so future imports of that merchant are auto-categorized.

**Why this priority**: Categorization turns raw transactions into meaningful spending data; every chart, budget, and total depends on it. Merchant-level mapping makes ongoing use low-effort.

**Independent Test**: With uncategorized transactions present, group them by merchant, assign a category to a merchant group, and confirm all of that merchant's transactions receive the category and a new import of the same merchant is auto-categorized.

**Acceptance Scenarios**:

1. **Given** uncategorized transactions, **When** the user views the Unmapped page, **Then** transactions are grouped by merchant with a count per merchant and an "apply to all" action.
2. **Given** a merchant group, **When** the user assigns a category, **Then** all transactions for that merchant adopt the category and a merchant→category rule is saved to the local category map.
3. **Given** a saved merchant rule, **When** a new file containing that merchant is imported, **Then** its transactions are auto-categorized without further action.
4. **Given** a transaction with a category, **When** the user reassigns it inline on the Transactions page, **Then** the change is saved as a per-transaction manual override that takes priority over the merchant rule and is marked with a badge.

---

### User Story 3 - See a financial overview on the dashboard (Priority: P1)

A user opens the Dashboard to understand their financial health for a selected date range: income, expenses, net, and savings rate, plus spending trends and a category breakdown.

**Why this priority**: The dashboard is the primary "at a glance" surface that makes the imported and categorized data useful. It is the main reason a user opens the app day to day.

**Independent Test**: With categorized transactions and a selected range, verify the four KPI cards compute correctly, the quick-spend cards show the configured categories, and charts render and support drill-down.

**Acceptance Scenarios**:

1. **Given** categorized transactions and a selected date range, **When** the user opens the Dashboard, **Then** KPI cards show total income (Tulot), total expenses (Kulut), net (Netto), and savings rate (Säästöaste), each with a delta versus the same period the previous year.
2. **Given** the Dashboard, **When** it renders, **Then** four quick-spend cards show spend for user-configured categories for the selected period.
3. **Given** the category-breakdown donut, **When** the user clicks a slice, **Then** the app drills into the transaction list for that category.
4. **Given** the trend chart, **When** it renders, **Then** it shows monthly net spend with positive, negative, and total series.
5. **Given** a user with no car expenses, **When** they choose to hide the combined fuel+car chart, **Then** it is not shown.

---

### User Story 4 - Browse, search, and filter the transaction ledger (Priority: P2)

A user opens the Tapahtumat (Transactions) page to find specific transactions, filter by category or type, reassign categories inline, and delete individual transactions.

**Why this priority**: A searchable ledger is essential for verification and correction but builds on data the P1 stories already produce.

**Independent Test**: With transactions present, search by merchant, filter by category and by type (income/expense/both), reassign a category inline, and delete a single transaction with confirmation.

**Acceptance Scenarios**:

1. **Given** transactions, **When** the user types in the merchant search, **Then** the table filters live to matching merchants.
2. **Given** transactions, **When** the user selects a category filter and/or a type filter (income / expense / both), **Then** only matching rows are shown.
3. **Given** a row, **When** the user clicks the category cell and selects a new category, **Then** the reassignment saves as a manual override and shows a badge.
4. **Given** a row, **When** the user deletes it and confirms, **Then** that transaction is removed from the dataset.

---

### User Story 5 - Plan a monthly budget (Priority: P2)

A user opens the Budjetti (Budget) page to set a savings goal and per-category monthly targets, informed by 12-month and last-month history, and see how income is allocated.

**Why this priority**: Budgeting adds forward-looking value on top of historical data, but is not required for the core import→categorize→review loop.

**Independent Test**: Set a savings goal, edit a category's target percent and euro amount (each keeping the other in sync), use "fill from history," and view the allocation breakdown.

**Acceptance Scenarios**:

1. **Given** the Budget page, **When** the user sets a savings goal as a percent of monthly income (0–100), **Then** the goal is saved and reflected in the allocation view.
2. **Given** a category row, **When** the user edits the target percent, **Then** the target euro amount updates automatically (and editing euro updates percent).
3. **Given** history exists, **When** the user chooses "fill from 12-month history," **Then** category targets are pre-populated from historical averages.
4. **Given** targets are set, **When** the allocation breakdown renders, **Then** it shows savings, category allocations, and unallocated portions of income.

---

### User Story 6 - Track net worth and assets (Priority: P2)

A user opens the Varallisuus (Wealth) page to manually record monthly snapshots of assets and debts, organized into user-defined groups, and see net worth trends over time.

**Why this priority**: Wealth tracking is a distinct, valuable capability but is manual-entry and independent of the CSV import loop.

**Independent Test**: Add a monthly snapshot with grouped asset and debt entries, then verify the KPI cards and net-worth chart reflect it and the month-detail table shows deltas from the prior month.

**Acceptance Scenarios**:

1. **Given** the Wealth page, **When** the user adds a monthly snapshot with asset groups and debt entries, **Then** it is saved and net worth (assets − debts) is computed.
2. **Given** snapshots, **When** the page renders, **Then** KPI cards show net worth (Nettovarallisuus), total assets (Varat yhteensä), total debts (Velat yhteensä), and liquid assets (Likvidit varat) from user-tagged liquid groups.
3. **Given** multiple snapshots, **When** charts render, **Then** net worth over time, liquid assets by group, and cumulative own-savings-vs-market-returns are shown (the latter derived from user-entered monthly savings contributions).
4. **Given** at least two snapshots, **When** the month-detail table renders, **Then** it breaks down the latest snapshot by group/label with deltas from the previous month.

---

### User Story 7 - Manage data and keep category data portable (Priority: P2)

A user opens the Asetukset (Settings) page to review a data summary, export and re-import the category data set (so their accumulated categorization work is never trapped in the app), configure category visibility and custom categories, and delete data.

**Why this priority**: Category-data portability is a core principle — it protects the one dataset that is painful to rebuild by hand — but the app is usable before it exists.

**Independent Test**: Export the category data set to a file, clear it, re-import the file, and confirm all merchant→category mappings and category definitions are restored. Toggle a category's visibility and confirm it is excluded from charts and totals.

**Acceptance Scenarios**:

1. **Given** data exists, **When** the user views Settings, **Then** a summary shows transaction count, date range covered, imported-file count, and category-map entry count.
2. **Given** data exists, **When** the user exports, **Then** they can export the category data set (merchant→category mappings and category definitions) to a standalone file.
3. **Given** a previously exported category file, **When** the user imports it, **Then** they are offered a merge-or-replace choice (with confirmation) and the category data is restored accordingly; a partial or older file does not corrupt existing category data.
4. **Given** a category, **When** the user toggles it to hidden, **Then** it is excluded from all charts and totals; **When** the user adds a custom category (name + color), **Then** it participates fully in charts, budget, and mapping.
5. **Given** destructive actions (delete all transactions, delete category map, delete all data), **When** the user triggers one, **Then** it requires explicit confirmation before proceeding.

---

### Edge Cases

- **Malformed or non-Nordea CSV**: the import surfaces a clear error and imports nothing rather than storing garbage.
- **Empty state**: pages that require data are disabled or show an informative empty state until a CSV is imported; the Import drop zone is prominent when there is no data.
- **Merchant matches multiple rules**: categorization priority is deterministic — manual override first, then merchant-map (glob) match, then uncategorized.
- **Glob pattern conflicts**: when more than one merchant-map pattern could match a merchant, the app applies a single, predictable winner.
- **Hidden categories**: hidden categories are excluded from totals, charts, and budget rows consistently everywhere.
- **Date range with no transactions**: KPI cards and charts show zero/empty states without errors, and year-over-year deltas handle a missing prior period gracefully.
- **Wealth back-calculation**: if monthly savings contributions are missing, the own-savings-vs-market-returns chart degrades gracefully rather than showing misleading values.
- **Older or partial category file**: importing a category file that lacks newer fields does not corrupt current category data; missing fields fall back to sensible defaults.
- **Storage limits**: if local storage is full or unavailable, the app warns the user rather than silently losing data.

## Requirements *(mandatory)*

### Functional Requirements

**Data & storage**

- **FR-001**: The system MUST store all user data locally on the device and MUST NOT transmit any data off the device except when the user explicitly triggers an export.
- **FR-002**: The system MUST NOT require any login, account, OAuth, or API key to use any feature.
- **FR-003**: The system MUST persist transactions, imported-file metadata, a merchant→category map, per-transaction overrides, budget settings, category settings (visibility/color), wealth snapshots, and custom categories across sessions.

**Import**

- **FR-004**: Users MUST be able to import Nordea CSV exports via drag-and-drop, detecting the Nordea format (e.g., `Kirjauspäivä` header).
- **FR-005**: The system MUST parse Finnish number formatting (space thousands separator, comma decimal) and MUST be byte-order-mark safe.
- **FR-006**: The system MUST deduplicate transactions by a stable transaction identity (date + amount + merchant + row position) so re-importing the same file creates no duplicates, merging new transactions into the existing dataset.
- **FR-007**: The system MUST list imported files with filename, import date, and transaction count, and MUST allow deleting an imported file with confirmation; deleting a file also removes the transactions that were imported from it (cascade).

**Categorization**

- **FR-008**: The system MUST group uncategorized transactions by merchant and let users apply a category to all of a merchant's transactions at once.
- **FR-009**: The system MUST save merchant→category assignments to a local category map so future imports of the same merchant are auto-categorized, and the map MUST support glob (`*`) patterns matched against the normalized merchant name.
- **FR-010**: Users MUST be able to reassign a single transaction's category inline, saved as a per-transaction manual override marked with a badge.
- **FR-011**: The system MUST resolve each transaction's category by priority: (1) manual override, (2) merchant-map pattern match, (3) uncategorized.
- **FR-012**: The system MUST provide a view of manually-overridden transactions distinct from uncategorized ones.

**Dashboard**

- **FR-013**: The system MUST display KPI cards for total income, total expenses, net, and savings rate for the selected date range, each with a delta versus the same period the previous year.
- **FR-014**: The system MUST display quick-spend cards for four categories for the selected period, where the four categories are user-configurable on the Settings page.
- **FR-015**: The system MUST display a monthly net-spend trend (positive, negative, and total series), a category-breakdown donut with click-to-drill-into-transactions, and a combined fuel+car spend chart that the user can hide.

**Transactions ledger**

- **FR-016**: The system MUST display a transaction table with date, merchant, category, amount, and actions.
- **FR-017**: Users MUST be able to live-search by merchant and filter by category and by type (income / expense / both).
- **FR-018**: Users MUST be able to delete an individual transaction with confirmation.

**Budget**

- **FR-019**: Users MUST be able to set a savings goal as a percent of monthly income (0–100).
- **FR-020**: The system MUST present a per-visible-category budget table showing 12-month average % of income, last-month % of income, an editable target %, and an editable target € (percent and euro kept in sync via average monthly income).
- **FR-021**: The system MUST provide a "fill from 12-month history" action that pre-populates targets from historical averages, and MUST show an allocation breakdown of income across savings, category allocations, and unallocated.

**Wealth**

- **FR-022**: Users MUST be able to add monthly snapshots of assets and debts organized into user-defined groups and labels, with a per-group liquid flag and an optional monthly savings contribution.
- **FR-023**: The system MUST display KPI cards for net worth, total assets, total debts, and liquid assets (from user-tagged liquid groups).
- **FR-024**: The system MUST display net-worth-over-time, liquid-assets-by-group, and cumulative own-savings-vs-market-returns charts (returns back-calculated from savings contributions), plus a latest-snapshot detail table with deltas from the previous month.

**Settings & portability**

- **FR-025**: The system MUST show a data summary (transaction count, covered date range, imported-file count, category-map entry count).
- **FR-026**: Users MUST be able to export the category data set (merchant→category mappings and category definitions) to a standalone file.
- **FR-027**: Users MUST be able to import a category data file, with a merge-or-replace choice and confirmation; importing a partial or older file MUST NOT corrupt existing category data.
- **FR-028**: Users MUST be able to toggle per-category visibility (hidden categories excluded from all charts and totals) and add custom categories (name + color) that participate fully in charts, budget, and mapping.
- **FR-029**: The system MUST provide destructive actions — delete all transactions, delete category map, delete all data — each requiring explicit confirmation.

**Navigation, localization & UX**

- **FR-030**: The system MUST present a fixed left sidebar ("Ledger") with navigation to Dashboard, Transactions, Budget, Wealth, Unmapped (with a badge counting uncategorized transactions), Import, and Settings, disabling data-dependent pages until CSV data is present.
- **FR-031**: The system MUST provide a date-range selector (presets: this month, last month, last 3/6/12 months, this year, last year, custom range) applied to the Dashboard, Transactions, Budget, and Unmapped pages.
- **FR-032**: The system MUST render all labels, navigation, and formatting in Finnish, using EUR currency and Finnish date/number formats.
- **FR-033**: The system MUST present a dark, card-based, responsive UI and provide auto-dismissing success/error toast notifications for user actions.

### Key Entities *(include if feature involves data)*

- **Transaction**: a single bank line item — date, amount, merchant (raw and normalized), running balance, income/expense flag, resolved category and class, and a manual-override flag. Identified by a stable hash of date + amount + merchant + row position.
- **Imported File**: metadata about a CSV import — filename, import date, and transaction count.
- **Category Map Entry**: a merchant pattern (glob against the normalized merchant name) mapped to a category and class; the learned auto-categorization rules.
- **Manual Override**: a per-transaction category/class assignment that takes priority over merchant rules.
- **Budget**: a savings-goal percent plus per-category targets (target percent and target euro).
- **Category Setting**: per-category visibility and color, including user-defined custom categories.
- **Wealth Snapshot**: a month with grouped asset entries (each group flagged liquid or not), debt entries, and an optional monthly savings contribution; net worth is assets − debts.
- **Category System**: built-in categories (income, expense, and transfer classes) plus user-added custom categories, all participating equally in charts, budget, and mapping.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can go from an empty app to a populated, categorized dashboard (import a CSV, categorize the top merchants, view KPIs) in under 10 minutes.
- **SC-002**: Re-importing an already-imported file adds zero duplicate transactions.
- **SC-003**: After a merchant is categorized once, 100% of that merchant's transactions in subsequent imports are auto-categorized without manual action.
- **SC-004**: The category data set can be exported to a single file and re-imported into a fresh instance with zero loss of merchant→category mappings and category definitions.
- **SC-005**: No feature requires a network connection; the app is fully functional offline after it loads.
- **SC-006**: Dashboard KPIs, budget figures, and wealth totals are internally consistent (net = income − expenses; net worth = assets − debts) for any selected date range, including empty ranges.
- **SC-007**: 100% of user-facing labels, dates, and monetary amounts are rendered in Finnish formatting with EUR.

## Assumptions

- **Single user, single device**: the app is used by one person on their own device; there is no multi-user, sharing, or sync requirement.
- **Nordea only**: only Nordea CSV format is supported for import in this version; other banks are out of scope.
- **Local browser storage**: data persistence relies on the device's local browser storage; the user is responsible for exporting backups, and clearing browser data clears app data.
- **Currency and locale**: all amounts are EUR and all formatting is Finnish; multi-currency is out of scope.
- **Visual language carried forward**: the dark, card-based design system from prior versions is retained deliberately.
- **Wealth data is manual**: net-worth data is entered by hand (no bank or brokerage integration); market returns are derived from user-supplied savings contributions.
- **Only category data is portable**: the category data set is the one dataset guaranteed to be exportable and importable; transactions, budgets, and wealth snapshots are not required to be exportable and are not carried across versions.

## Out of Scope (future versions)

- Multi-bank CSV format support (only Nordea for now).
- Recurring transaction detection.
- Forecasting / projected spending.
- Dedicated mobile layout optimization.
- Multi-currency support.
- Receipt scanning.
- Full data-bundle export/import (transactions, budgets, wealth) and cross-version migration of anything other than category data.
- Any cloud sync, accounts, authentication, or external API integration.

## Implementation Decisions (post-plan, kept in sync per Constitution P7)

Recorded during implementation; each is deliberate and supersedes the earlier
text where they conflict.

1. **Category data file is CSV, not JSON** (FR-026/FR-027). The user maintains a
   long-lived merchant→category database in Google Sheets; the portable format is
   its CSV export (`merchantKey, displayName, category, group` — group `Tulot`→
   income, `Siirrot`→transfer, otherwise expense). Export writes the same format
   back so the sheet round-trips. See `contracts/category-file.md`.
2. **Date-range scope narrowed** (FR-031): the range selector applies to
   Kojelauta and Tapahtumat. Budjetti intentionally uses a rolling 12-month
   history plus current-month meters; Luokittele lists all uncategorized
   transactions regardless of range.
3. **Nordea format refinement**: real exports use `yyyy/mm/dd` booking dates and
   carry the payee in the `Nimi` column (`Maksaja`/`Maksunsaaja` hold IBANs).
   Parser accepts `yyyy/mm/dd`, ISO, and `dd.mm.yyyy`.
4. **Features beyond spec** (additive): category suggestions on Luokittele
   (token similarity against the rule DB), top-merchants card and KPI sparklines
   on Kojelauta, filtered totals + column sorting on Tapahtumat,
   month-vs-target budget meters, per-category color editing / quick-spend
   selection in Asetukset, CVD-validated default category palette.
5. **No class-based exclusions** (supersedes the FR-013 note that transfers are
   always excluded): the Asetukset category checkboxes are the ONLY mechanism
   that excludes a category from Kojelauta charts and the
   income–expense–savings calculations. Direction is decided by category class
   where decisive (income → Tulot, expense → Kulut); included transfer-class
   categories count by transaction sign. On upgrade, transfer-class categories
   were toggled off once (one-time default) so numbers kept their previous
   meaning; from then on the user's toggles rule.
