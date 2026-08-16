/** Audit Ledger contract: only user-chosen header labels are stored locally; no filenames, cell values, or file bytes persist. */

export type CsvRuleStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type SavedCsvExclusionRule = { id: string; name: string; headers: string[]; updatedAt: string };

export const CSV_EXCLUSION_RULES_KEY = "private-preflight:csv-exclusion-rules:v1";

const normalizeHeader = (header: string) => header.trim().replace(/\s+/g, " ").toLocaleLowerCase();

function normalizeRule(value: unknown): SavedCsvExclusionRule | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SavedCsvExclusionRule>;
  const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 48) : "";
  const headers = Array.isArray(candidate.headers) ? Array.from(new Set(candidate.headers.filter((header): header is string => typeof header === "string").map(normalizeHeader).filter(Boolean))).slice(0, 40) : [];
  if (!name || !headers.length) return null;
  return { id: typeof candidate.id === "string" && candidate.id ? candidate.id : crypto.randomUUID(), name, headers, updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date(0).toISOString() };
}

export function readSavedCsvExclusionRules(storage: CsvRuleStorage): SavedCsvExclusionRule[] {
  try {
    const raw = storage.getItem(CSV_EXCLUSION_RULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeRule).filter((rule): rule is SavedCsvExclusionRule => rule !== null).slice(0, 12) : [];
  } catch { return []; }
}

export function writeSavedCsvExclusionRules(storage: CsvRuleStorage, rules: readonly SavedCsvExclusionRule[]): void {
  storage.setItem(CSV_EXCLUSION_RULES_KEY, JSON.stringify(rules.slice(0, 12)));
}

export function createSavedCsvExclusionRule(name: string, headers: readonly string[], id = crypto.randomUUID(), updatedAt = new Date().toISOString()): SavedCsvExclusionRule | null {
  return normalizeRule({ id, name, headers, updatedAt });
}

export function matchingCsvRuleColumns(headers: readonly string[], rule: SavedCsvExclusionRule): number[] {
  const excludedHeaders = new Set(rule.headers.map(normalizeHeader));
  return headers.flatMap((header, index) => excludedHeaders.has(normalizeHeader(header)) ? [index] : []);
}
