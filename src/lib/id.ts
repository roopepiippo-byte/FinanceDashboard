/**
 * Stable, deterministic ids. No crypto needed — FNV-1a over a composite key
 * gives a compact, collision-resistant-enough id for local dedup.
 */

function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Unsigned 32-bit as base36
  return (hash >>> 0).toString(36);
}

/**
 * Transaction dedup identity (FR-006): date + amountCents + merchantLower +
 * rowIndex within its source file. Re-importing the same file yields the same
 * id, so bulkUpsert deduplicates.
 */
export function transactionId(
  date: string,
  amountCents: number,
  merchantLower: string,
  rowIndex: number,
): string {
  return fnv1a(`${date}|${amountCents}|${merchantLower}|${rowIndex}`);
}

/** Id for an imported file: content-independent unique-ish id. */
export function importedFileId(filename: string, importedAt: string): string {
  return fnv1a(`${filename}|${importedAt}`);
}

/** Fresh random id (wealth accounts etc. — no deterministic key available). */
export function newId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
