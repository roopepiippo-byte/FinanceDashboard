import Papa from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** The header that identifies a Nordea export (booking date). */
const NORDEA_MARKER = "Kirjauspäivä";

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Parse a Nordea CSV export. BOM-safe; auto-detects the delimiter.
 * Throws if the file is not a Nordea export (marker header missing).
 */
export function parseNordeaCsv(text: string): ParsedCsv {
  const clean = stripBom(text).trim();
  const result = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
    delimiter: "", // auto-detect (Nordea uses ';')
    transformHeader: (h) => h.trim(),
  });

  const headers = (result.meta.fields ?? []).map((h) => h.trim());
  if (!headers.some((h) => h === NORDEA_MARKER)) {
    throw new Error(
      "Tiedosto ei ole Nordea-CSV (Kirjauspäivä-saraketta ei löytynyt).",
    );
  }

  return { headers, rows: result.data };
}

export function isNordeaCsv(text: string): boolean {
  try {
    parseNordeaCsv(text);
    return true;
  } catch {
    return false;
  }
}
