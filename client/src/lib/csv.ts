/**
 * Product contract: Private CSV Preflight processes CSV data only in browser memory.
 * No API calls, persistence, analytics payloads, or silent mutation of source data occur here.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type Delimiter = "," | ";" | "\t" | "|";
export type MatchMode = "normalized" | "exact";
export type Severity = "info" | "warning" | "error";
export type CsvColumnSort = "source" | "alphabetical" | "pii_first" | "pii_count";

export interface ParserIssue {
  code: "empty" | "binary" | "unclosed_quote" | "inconsistent_columns" | "single_column" | "decode_fallback";
  message: string;
  severity: Severity;
  row?: number;
}

export interface FormulaRisk {
  row: number;
  column: number;
  header: string;
  trigger: string;
}

export interface PiiSignal {
  column: number;
  header: string;
  kinds: string[];
  matches: number;
}

export interface DuplicateGroup {
  key: string;
  count: number;
  rows: number[];
}

export interface CsvAnalysis {
  fileName: string;
  fileSize: number;
  encoding: "UTF-8" | "Windows-1252 fallback";
  delimiter: Delimiter;
  headers: string[];
  rows: string[][];
  issues: ParserIssue[];
  inconsistentRows: number[];
  formulaRisks: FormulaRisk[];
  piiSignals: PiiSignal[];
  duplicateGroups: DuplicateGroup[];
  qualityScore: number;
  analyzedAt: string;
}

export interface SafeCsvCopyOptions {
  excludedColumns?: readonly number[];
  neutralizeFormulaCells?: boolean;
}

export interface SafeCsvCopyResult {
  contents: string;
  retainedColumns: number[];
  excludedColumns: number[];
  neutralizedCellCount: number;
}

export interface SafeCsvPreview {
  sourceHeaders: string[];
  sourceRows: string[][];
  outputHeaders: string[];
  outputRows: string[][];
  rowLimit: number;
}

export class CsvPreflightError extends Error {
  constructor(
    public readonly code: "file_too_large" | "empty_file" | "binary_file" | "read_failed",
    message: string,
  ) {
    super(message);
    this.name = "CsvPreflightError";
  }
}

const CANDIDATE_DELIMITERS: Delimiter[] = [",", ";", "\t", "|"];
const FORMULA_START = /^[\s\uFEFF]*(?:=|\+|-|@|＝|＋|－|＠|\t|\r|\n)/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9()\s.-]{6,}[0-9]$/;
const IPV4_PATTERN = /^(?:25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)$/;
const HEADER_PII: Array<[RegExp, string]> = [
  [/(^|[_\s-])(e-?mail|email)([_\s-]|$)/i, "email-like header"],
  [/(^|[_\s-])(phone|mobile|telephone|tel)([_\s-]|$)/i, "phone-like header"],
  [/(^|[_\s-])(ip|ipaddress|ip_address)([_\s-]|$)/i, "IP-like header"],
  [/(^|[_\s-])(first_?name|last_?name|full_?name|customer_?name)([_\s-]|$)/i, "name-like header"],
  [/(^|[_\s-])(address|street|postal|zip)([_\s-]|$)/i, "address-like header"],
];

interface ParseResult {
  rows: string[][];
  issues: ParserIssue[];
}

function hasContent(row: string[]): boolean {
  return row.some((cell) => cell.length > 0);
}

/** RFC-4180-inspired CSV parser with quoted comma, escaped quote, CRLF and quoted newline handling. */
export function parseDelimited(text: string, delimiter: Delimiter): ParseResult {
  const rows: string[][] = [];
  const issues: ParserIssue[] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let rowNumber = 1;

  const finishRow = () => {
    row.push(field);
    if (hasContent(row)) rows.push(row);
    row = [];
    field = "";
    rowNumber += 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (character === '"') {
        if (next === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true;
    } else if (character === delimiter) {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && next === "\n") index += 1;
      finishRow();
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    issues.push({
      code: "unclosed_quote",
      message: `An opening quote was not closed near row ${rowNumber}. Results may be partial.`,
      severity: "error",
      row: rowNumber,
    });
  }

  if (field.length > 0 || row.length > 0) finishRow();
  return { rows, issues };
}

function mode(values: number[]): { value: number; occurrences: number } {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  let value = values[0] ?? 0;
  let occurrences = 0;
  counts.forEach((count, candidate) => {
    if (count > occurrences || (count === occurrences && candidate > value)) {
      value = candidate;
      occurrences = count;
    }
  });
  return { value, occurrences };
}

/** Selects the delimiter with the most consistent multi-column parse in the first 250 rows. */
export function detectDelimiter(text: string): Delimiter {
  let bestDelimiter: Delimiter = ",";
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const result = parseDelimited(text, delimiter);
    const widths = result.rows.slice(0, 250).map((row) => row.length);
    const widthMode = mode(widths);
    const multiColumnBoost = widthMode.value > 1 ? 1000 : 0;
    const score = multiColumnBoost + widthMode.occurrences * 10 + widthMode.value - result.issues.length * 100;
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }
  return bestDelimiter;
}

function normalizeValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function findDuplicateGroups(rows: string[][], selectedColumns: number[] = [], matchMode: MatchMode = "normalized"): DuplicateGroup[] {
  const groups = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const values = selectedColumns.length > 0 ? selectedColumns.map((column) => row[column] ?? "") : row;
    const keyValues = values.map((value) => (matchMode === "normalized" ? normalizeValue(value) : value));
    const key = JSON.stringify(keyValues);
    const existing = groups.get(key) ?? [];
    existing.push(index + 2);
    groups.set(key, existing);
  });

  return Array.from(groups.entries())
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([key, rowNumbers]) => ({ key, count: rowNumbers.length, rows: rowNumbers }))
    .sort((a, b) => b.count - a.count || a.rows[0] - b.rows[0]);
}

/** Returns matching header indexes for a local, case-insensitive column search without reading data rows. */
export function findCsvColumnIndexes(headers: readonly string[], query: string): number[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return headers
    .map((header, index) => ({ index, label: header.trim() || `Column ${index + 1}` }))
    .filter(({ label }) => !normalizedQuery || label.toLocaleLowerCase().includes(normalizedQuery))
    .map(({ index }) => index);
}

/** Orders already-matched column indexes locally; PII priority uses supplied signal counts, never cell values. */
export function sortCsvColumnIndexes(headers: readonly string[], indexes: readonly number[], piiColumnIndexes: readonly number[] | ReadonlyMap<number, number>, sort: CsvColumnSort): number[] {
  const piiCounts: ReadonlyMap<number, number> = typeof (piiColumnIndexes as ReadonlyMap<number, number>).get === "function"
    ? piiColumnIndexes as ReadonlyMap<number, number>
    : new Map<number, number>((piiColumnIndexes as readonly number[]).map((index) => [index, 1]));
  const labelFor = (index: number) => (headers[index]?.trim() || `Column ${index + 1}`).toLocaleLowerCase();
  return Array.from(new Set(indexes)).sort((left, right) => {
    if (sort === "source") return left - right;
    const leftPiiCount = piiCounts.get(left) ?? 0;
    const rightPiiCount = piiCounts.get(right) ?? 0;
    if (sort === "pii_count" && leftPiiCount !== rightPiiCount) return rightPiiCount - leftPiiCount;
    if (sort === "pii_first" && Boolean(leftPiiCount) !== Boolean(rightPiiCount)) return leftPiiCount ? -1 : 1;
    return labelFor(left).localeCompare(labelFor(right)) || left - right;
  });
}

function detectFormulaRisks(headers: string[], rows: string[][]): FormulaRisk[] {
  const risks: FormulaRisk[] = [];
  rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const firstVisible = value.trimStart().charAt(0) || "whitespace control";
      if (FORMULA_START.test(value)) {
        risks.push({
          row: rowIndex + 2,
          column: columnIndex + 1,
          header: headers[columnIndex]?.trim() || `Column ${columnIndex + 1}`,
          trigger: firstVisible,
        });
      }
    });
  });
  return risks;
}

function detectPiiSignals(headers: string[], rows: string[][]): PiiSignal[] {
  return headers.flatMap((header, columnIndex) => {
    const kinds = new Set<string>();
    HEADER_PII.forEach(([pattern, label]) => {
      if (pattern.test(header)) kinds.add(label);
    });

    let matches = 0;
    rows.forEach((row) => {
      const value = row[columnIndex]?.trim() ?? "";
      if (!value) return;
      if (EMAIL_PATTERN.test(value)) kinds.add("email-like value");
      if (PHONE_PATTERN.test(value)) kinds.add("phone-like value");
      if (IPV4_PATTERN.test(value)) kinds.add("IP-like value");
      if (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value) || IPV4_PATTERN.test(value)) matches += 1;
    });

    return kinds.size > 0
      ? [{ column: columnIndex + 1, header: header.trim() || `Column ${columnIndex + 1}`, kinds: Array.from(kinds), matches }]
      : [];
  });
}

function calculateQualityScore(issues: ParserIssue[], inconsistentRows: number[], formulaRisks: FormulaRisk[], piiSignals: PiiSignal[]): number {
  const parserPenalty = issues.filter((issue) => issue.severity === "error").length * 30;
  const structuralPenalty = Math.min(25, inconsistentRows.length * 3);
  const formulaPenalty = Math.min(20, formulaRisks.length * 2);
  const piiPenalty = Math.min(10, piiSignals.length * 2);
  return Math.max(0, 100 - parserPenalty - structuralPenalty - formulaPenalty - piiPenalty);
}

export function analyzeText(text: string, fileName = "Untitled CSV", fileSize = text.length, forcedDelimiter?: Delimiter): CsvAnalysis {
  if (!text || !text.trim()) throw new CsvPreflightError("empty_file", "This file is empty. Choose a CSV with a header row and data.");
  if (text.includes("\u0000")) throw new CsvPreflightError("binary_file", "This file contains binary-like characters and cannot be safely interpreted as CSV text.");

  const delimiter = forcedDelimiter ?? detectDelimiter(text);
  const { rows: parsedRows, issues } = parseDelimited(text.replace(/^\uFEFF/, ""), delimiter);
  if (parsedRows.length === 0) throw new CsvPreflightError("empty_file", "No readable rows were found in this file.");

  const headers = parsedRows[0];
  const rows = parsedRows.slice(1);
  const expectedColumns = headers.length;
  const inconsistentRows = rows
    .map((row, index) => (row.length === expectedColumns ? null : index + 2))
    .filter((row): row is number => row !== null);

  if (expectedColumns === 1) {
    issues.push({
      code: "single_column",
      message: "Only one column was detected. Try a different delimiter if this is unexpected.",
      severity: "warning",
    });
  }
  if (inconsistentRows.length > 0) {
    issues.push({
      code: "inconsistent_columns",
      message: `${inconsistentRows.length} data row${inconsistentRows.length === 1 ? "" : "s"} do not match the ${expectedColumns}-column header.`,
      severity: "warning",
    });
  }

  const formulaRisks = detectFormulaRisks(headers, rows);
  const piiSignals = detectPiiSignals(headers, rows);
  const duplicateGroups = findDuplicateGroups(rows);

  return {
    fileName,
    fileSize,
    encoding: "UTF-8",
    delimiter,
    headers,
    rows,
    issues,
    inconsistentRows,
    formulaRisks,
    piiSignals,
    duplicateGroups,
    qualityScore: calculateQualityScore(issues, inconsistentRows, formulaRisks, piiSignals),
    analyzedAt: new Date().toISOString(),
  };
}

export async function readLocalText(file: File): Promise<{ text: string; encoding: CsvAnalysis["encoding"]; decodingIssue?: ParserIssue }> {
  if (file.size === 0) throw new CsvPreflightError("empty_file", "This file is empty. Choose a CSV with a header row and data.");
  if (file.size > MAX_FILE_BYTES) {
    throw new CsvPreflightError("file_too_large", `This release analyses files up to ${MAX_FILE_BYTES / 1024 / 1024} MB locally. Choose a smaller export.`);
  }

  try {
    const buffer = await file.arrayBuffer();
    try {
      return { text: new TextDecoder("utf-8", { fatal: true }).decode(buffer), encoding: "UTF-8" };
    } catch {
      return {
        text: new TextDecoder("windows-1252").decode(buffer),
        encoding: "Windows-1252 fallback",
        decodingIssue: {
          code: "decode_fallback",
          message: "UTF-8 decoding failed, so the file was read using a Windows-1252 fallback. Review accented characters before exporting.",
          severity: "warning",
        },
      };
    }
  } catch {
    throw new CsvPreflightError("read_failed", "The browser could not read this file. Try a local CSV, TSV, or text export.");
  }
}

export async function analyzeFile(file: File, forcedDelimiter?: Delimiter): Promise<CsvAnalysis> {
  const decoded = await readLocalText(file);
  const analysis = analyzeText(decoded.text, file.name, file.size, forcedDelimiter);
  analysis.encoding = decoded.encoding;
  if (decoded.decodingIssue) analysis.issues.unshift(decoded.decodingIssue);
  return analysis;
}

function escapeCell(value: string, delimiter: Delimiter): string {
  const needsQuotes = value.includes(delimiter) || /["\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Explicitly transforms only formula-risk cells for spreadsheet-oriented export.
 * OWASP notes that no mitigation is universal; the UI must explain this choice before download.
 */
export function createSpreadsheetSafeCsv(analysis: CsvAnalysis): string {
  const riskLocations = new Set(analysis.formulaRisks.map((risk) => `${risk.row - 2}:${risk.column - 1}`));
  const rows = [analysis.headers, ...analysis.rows];
  return rows
    .map((row, rowIndex) =>
      row
        .map((value, columnIndex) => {
          const transformed = rowIndex > 0 && riskLocations.has(`${rowIndex - 1}:${columnIndex}`) ? `\t${value}` : value;
          return escapeCell(transformed, analysis.delimiter);
        })
        .join(analysis.delimiter),
    )
    .join("\r\n");
}

/** Creates a deliberate, browser-only sharing copy. Source file bytes and the original File object are never modified. */
export function createSafeCsvCopy(analysis: CsvAnalysis, options: SafeCsvCopyOptions = {}): SafeCsvCopyResult {
  const excludedColumns = Array.from(new Set(options.excludedColumns ?? [])).filter((column) => Number.isInteger(column) && column >= 0 && column < analysis.headers.length).sort((a, b) => a - b);
  const excludedSet = new Set(excludedColumns);
  const retainedColumns = analysis.headers.map((_, index) => index).filter((index) => !excludedSet.has(index));
  let neutralizedCellCount = 0;
  const rows = [analysis.headers, ...analysis.rows];
  const contents = rows.map((row) => retainedColumns.map((columnIndex) => {
    const value = row[columnIndex] ?? "";
    const transformed = options.neutralizeFormulaCells && FORMULA_START.test(value) ? (neutralizedCellCount += 1, `\t${value}`) : value;
    return escapeCell(transformed, analysis.delimiter);
  }).join(analysis.delimiter)).join("\r\n");
  return { contents, retainedColumns, excludedColumns, neutralizedCellCount };
}

/** Produces a bounded, in-memory review of the first data rows before and after the chosen sharing transformation. */
export function previewSafeCsvCopy(analysis: CsvAnalysis, options: SafeCsvCopyOptions = {}, rowLimit = 3): SafeCsvPreview {
  const safeCopy = createSafeCsvCopy(analysis, options);
  const limit = Math.min(8, Math.max(1, Math.round(rowLimit) || 3));
  const outputRows = analysis.rows.slice(0, limit).map((row) => safeCopy.retainedColumns.map((columnIndex) => {
    const value = row[columnIndex] ?? "";
    return options.neutralizeFormulaCells && FORMULA_START.test(value) ? `\t${value}` : value;
  }));
  return { sourceHeaders: [...analysis.headers], sourceRows: analysis.rows.slice(0, limit).map((row) => [...row]), outputHeaders: safeCopy.retainedColumns.map((columnIndex) => analysis.headers[columnIndex] ?? ""), outputRows, rowLimit: limit };
}

export function createReport(analysis: CsvAnalysis): string {
  const report = {
    generatedAt: analysis.analyzedAt,
    file: { name: analysis.fileName, sizeBytes: analysis.fileSize, encoding: analysis.encoding, delimiter: analysis.delimiter },
    summary: {
      headerColumns: analysis.headers.length,
      dataRows: analysis.rows.length,
      qualityScore: analysis.qualityScore,
      inconsistentRows: analysis.inconsistentRows.length,
      duplicateGroups: analysis.duplicateGroups.length,
      formulaRiskCells: analysis.formulaRisks.length,
      piiSignalColumns: analysis.piiSignals.length,
    },
    issues: analysis.issues,
    inconsistentRows: analysis.inconsistentRows,
    duplicateGroups: analysis.duplicateGroups.map(({ count, rows }) => ({ count, rows })),
    formulaRisks: analysis.formulaRisks,
    piiSignals: analysis.piiSignals,
    notice: "Potential signals only. This report does not prove security, safety, or legal compliance.",
  };
  return JSON.stringify(report, null, 2);
}

export function downloadLocalText(contents: string, filename: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const DEMO_CSV = `customer_id,email,contact_phone,amount,notes\n1001,ada@example.com,+1 555 010 1234,120.00,First export\n1002,grace@example.com,+1 555 010 9876,80.00,"=HYPERLINK(""https://example.com"",""Review"")"\n1001,ada@example.com,+1 555 010 1234,120.00,First export\n1003,ops@example.com,,42.00,Pending`;
