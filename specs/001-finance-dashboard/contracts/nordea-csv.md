# Contract: Nordea CSV Import (input format)

**Feature**: 001-finance-dashboard | **Phase**: 1

Defines what the importer accepts and how rows map to `Transaction`. Parsed by
PapaParse + a custom Nordea mapping module (research D1). Money → integer cents.

## Detection

- File is detected as Nordea when the header row contains **`Kirjauspäivä`**
  (booking date). Non-matching files are rejected with a clear error and nothing
  is imported (edge case: malformed/non-Nordea CSV).
- **BOM-safe**: a leading UTF-8 BOM is stripped before header detection.
- Delimiter: `;` (auto-detected).

## Column mapping (typical Nordea export)

| CSV column | Maps to | Transform |
|---|---|---|
| `Kirjauspäivä` | `Transaction.date` | `dd.mm.yyyy` → ISO `YYYY-MM-DD` |
| `Määrä` / amount | `Transaction.amountCents` | Finnish `-1 234,56` → integer cents; sign preserved |
| `Saaja/Maksaja` / payee / message | `Transaction.merchant` | trimmed; `merchantLower` = lowercased, whitespace-collapsed |
| `Saldo` / balance (if present) | `Transaction.balanceCents` | Finnish number → cents; null if absent |

Exact header labels can vary slightly between Nordea exports; the mapping module
resolves known aliases and is unit-tested.

## Number & date parsing rules (unit-tested — Principle IV)

- Thousands separator: space (incl. non-breaking space ` `) → removed.
- Decimal separator: comma → parsed as 2-decimal → ×100 → integer cents.
- No decimals present → treated as whole euros → ×100.
- Sign: leading `-` (or credit/debit column) sets expense vs income.
- Date: `dd.mm.yyyy` (also tolerate `d.m.yyyy`) → ISO.

## Dedup identity (FR-006)

`id = hash(date + '|' + amountCents + '|' + merchantLower + '|' + rowIndex)`,
where `rowIndex` is the row's position within its source file. Re-importing the
same file yields identical ids → `transactions.bulkUpsert` deduplicates. New rows
merge into the existing dataset.

## Output

Returns `{ transactions: Transaction[], count: number }` plus an `ImportedFile`
record; all category resolution happens afterward in the domain layer (imported
transactions start uncategorized unless a category-map glob already matches).

## Errors

- Not a Nordea file / header missing → user-facing error, import aborted.
- Unparseable amount/date in a row → row rejected and reported in the import
  summary; valid rows still import (partial success), never silent data loss.
