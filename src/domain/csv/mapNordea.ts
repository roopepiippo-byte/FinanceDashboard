import type { Transaction } from "@/types";
import { parseFinnishAmountToCents } from "@/domain/money";
import { parseFinnishDateToIso } from "@/lib/format";
import { transactionId } from "@/lib/id";
import { parseNordeaCsv } from "./parse";

/** Candidate header names for each field (Nordea exports vary slightly). */
const DATE_KEYS = ["Kirjauspäivä", "Kirjauspaiva"];
const AMOUNT_KEYS = ["Määrä", "Maara", "Summa"];
/**
 * Merchant name preference: the human-readable payee is in Nimi/Otsikko.
 * Maksaja/Maksunsaaja hold IBANs, so they are last-resort fallbacks.
 */
const MERCHANT_KEYS = [
  "Nimi",
  "Otsikko",
  "Saaja/Maksaja",
  "Saaja",
  "Maksunsaaja",
  "Maksaja",
  "Viesti",
  "Tapahtuma",
];
const BALANCE_KEYS = ["Saldo"];

/**
 * Parse a Nordea booking date. Nordea exports use `yyyy/mm/dd`; also tolerate
 * ISO `yyyy-mm-dd` and Finnish `dd.mm.yyyy`.
 */
function parseNordeaDateToIso(raw: string): string {
  const v = raw.trim();
  const slash = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(v);
  if (slash) return `${slash[1]}-${slash[2]}-${slash[3]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return parseFinnishDateToIso(v);
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v.trim() !== "") return v.trim();
  }
  return undefined;
}

function normalizeMerchant(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

export interface MapResult {
  transactions: Transaction[];
  /** Rows that failed to parse (1-based row number + reason). */
  errors: { row: number; reason: string }[];
}

/**
 * Parse + map a Nordea CSV to Transactions (category unresolved — resolution
 * happens in the store). Dedup identity uses the row index within this file.
 */
export function mapNordeaCsv(text: string, sourceFileId: string): MapResult {
  const { rows } = parseNordeaCsv(text);
  const transactions: Transaction[] = [];
  const errors: MapResult["errors"] = [];

  rows.forEach((row, i) => {
    try {
      const dateRaw = pick(row, DATE_KEYS);
      const amountRaw = pick(row, AMOUNT_KEYS);
      if (!dateRaw || !amountRaw) {
        throw new Error("Puuttuva päivämäärä tai määrä");
      }
      const date = parseNordeaDateToIso(dateRaw);
      const amountCents = parseFinnishAmountToCents(amountRaw);
      const merchant = pick(row, MERCHANT_KEYS) ?? "(tuntematon)";
      const merchantLower = normalizeMerchant(merchant);
      const balanceRaw = pick(row, BALANCE_KEYS);
      const balanceCents = balanceRaw
        ? parseFinnishAmountToCents(balanceRaw)
        : null;

      transactions.push({
        id: transactionId(date, amountCents, merchantLower, i),
        date,
        amountCents,
        merchant,
        merchantLower,
        balanceCents,
        isIncome: amountCents > 0,
        category: null,
        class: null,
        isManualOverride: false,
        sourceFileId,
      });
    } catch (e) {
      errors.push({
        row: i + 1,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return { transactions, errors };
}
