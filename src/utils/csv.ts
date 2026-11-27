/**
 * Lightweight CSV helpers. The engine never needs to parse cells: none of its
 * patterns can span a delimiter or line break, and no replacement token contains
 * a delimiter, quote or newline. These helpers describe and verify that the
 * structure (delimiters, quotes, row breaks, line endings) survived sanitizing.
 */

const DELIMITERS = [',', ';', '\t', '|'] as const;

export type LineEnding = '\r\n' | '\n' | '\r';

export function detectLineEnding(text: string): LineEnding {
  const m = text.match(/\r\n|\n|\r/);
  return (m?.[0] as LineEnding | undefined) ?? '\n';
}

/** Picks the delimiter that appears (outside quotes) most consistently across the first rows. */
export function detectDelimiter(text: string): string {
  const rows = splitRows(text).slice(0, 10).filter((r) => r.length > 0);
  let best = ',';
  let bestScore = 0;
  for (const d of DELIMITERS) {
    const counts = rows.map((r) => countOutsideQuotes(r, d));
    if (counts.length === 0 || counts[0] === 0) continue;
    const consistent = counts.every((c) => c === counts[0]);
    const score = counts[0] * (consistent ? 10 : 1);
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

function splitRows(text: string): string[] {
  const rows: string[] = [];
  let row = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuotes = !inQuotes;
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      rows.push(row);
      row = '';
    } else {
      row += ch;
    }
  }
  if (row) rows.push(row);
  return rows;
}

function countOutsideQuotes(row: string, delimiter: string): number {
  let inQuotes = false;
  let n = 0;
  for (const ch of row) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === delimiter) n++;
  }
  return n;
}

export interface CsvInfo {
  delimiter: string;
  rows: number;
  columns: number;
  lineEnding: LineEnding;
}

export function describeCsv(text: string): CsvInfo {
  const delimiter = detectDelimiter(text);
  const rows = splitRows(text);
  const columns = Math.max(0, ...rows.map((r) => countOutsideQuotes(r, delimiter) + 1));
  return { delimiter, rows: rows.length, columns, lineEnding: detectLineEnding(text) };
}

/** The text with all cell content stripped: only delimiters, quotes and line breaks remain. */
export function structureSignature(text: string, delimiter: string): string {
  let sig = '';
  for (const ch of text) {
    if (ch === delimiter || ch === '"' || ch === '\n' || ch === '\r') sig += ch;
  }
  return sig;
}

export function sameStructure(a: string, b: string, delimiter: string): boolean {
  return structureSignature(a, delimiter) === structureSignature(b, delimiter);
}
