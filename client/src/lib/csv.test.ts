/** Deterministic verification for the browser-only CSV engine. */
import { describe, expect, it } from "vitest";
import { analyzeText, createSafeCsvCopy, createSpreadsheetSafeCsv, detectDelimiter, findCsvColumnIndexes, parseDelimited, previewSafeCsvCopy, sortCsvColumnIndexes } from "./csv";
import { createSavedCsvExclusionRule, matchingCsvRuleColumns, readSavedCsvExclusionRules, writeSavedCsvExclusionRules } from "./csvExclusionRules";

describe("parseDelimited", () => {
  it("keeps commas, escaped quotes, and newlines inside quoted cells", () => {
    const result = parseDelimited('name,notes\nAda,"one, two and a ""quote"""\nGrace,"line one\nline two"', ",");
    expect(result.issues).toHaveLength(0);
    expect(result.rows).toEqual([
      ["name", "notes"],
      ["Ada", 'one, two and a "quote"'],
      ["Grace", "line one\nline two"],
    ]);
  });

  it("reports an unclosed quote without throwing away the parsed prefix", () => {
    const result = parseDelimited('a,b\n1,"missing', ",");
    expect(result.issues[0]?.code).toBe("unclosed_quote");
    expect(result.rows[1]).toEqual(["1", "missing"]);
  });

  it("selects a semicolon delimiter when rows are consistent", () => {
    expect(detectDelimiter("name;email\nAda;ada@example.com\nGrace;grace@example.com")).toBe(";");
  });
});

describe("analyzeText", () => {
  it("finds formula-like cells, potential PII, duplicates, and inconsistent rows", () => {
    const analysis = analyzeText("email,phone,value\nada@example.com,+15550101234,=1+1\nada@example.com,+15550101234,=1+1\nmissing@example.com", "fixture.csv");
    expect(analysis.formulaRisks).toHaveLength(4);
    expect(analysis.piiSignals.map((signal) => signal.header)).toContain("email");
    expect(analysis.duplicateGroups).toHaveLength(1);
    expect(analysis.inconsistentRows).toEqual([4]);
  });

  it("creates an explicit spreadsheet-oriented export that prefixes only flagged cells", () => {
    const analysis = analyzeText("name,value\nAda,=1+1\nGrace,42", "fixture.csv");
    expect(createSpreadsheetSafeCsv(analysis)).toContain("\t=1+1");
    expect(createSpreadsheetSafeCsv(analysis)).toContain("Grace,42");
  });

  it("preserves valid CSV quoting when a changed formula cell contains commas and quotes", () => {
    const analysis = analyzeText('name,notes\nAda,"=HYPERLINK(""https://example.com"",""Review"")"', "fixture.csv");
    const exported = createSpreadsheetSafeCsv(analysis);
    const reparsed = parseDelimited(exported, ",");
    expect(reparsed.issues).toHaveLength(0);
    expect(reparsed.rows).toEqual([["name", "notes"], ["Ada", '\t=HYPERLINK("https://example.com","Review")']]);
  });

  it("creates a sharing copy with chosen columns removed and formula-like cells neutralized", () => {
    const analysis = analyzeText('name,email,notes\nAda,ada@example.com,"=HYPERLINK(""https://example.com"",""Review"")"\nGrace,grace@example.com,42', "fixture.csv");
    const safeCopy = createSafeCsvCopy(analysis, { excludedColumns: [1], neutralizeFormulaCells: true });
    expect(safeCopy.retainedColumns).toEqual([0, 2]);
    expect(safeCopy.excludedColumns).toEqual([1]);
    expect(safeCopy.neutralizedCellCount).toBe(1);
    expect(parseDelimited(safeCopy.contents, ",").rows).toEqual([["name", "notes"], ["Ada", '\t=HYPERLINK("https://example.com","Review")'], ["Grace", "42"]]);
  });

  it("can leave formula-like values unchanged when the user explicitly turns neutralization off", () => {
    const analysis = analyzeText("name,value\nAda,=1+1", "fixture.csv");
    const safeCopy = createSafeCsvCopy(analysis, { neutralizeFormulaCells: false });
    expect(safeCopy.neutralizedCellCount).toBe(0);
    expect(safeCopy.contents).toContain("=1+1");
  });

  it("creates a bounded before-and-after preview using the same filter and formula choices as download", () => {
    const analysis = analyzeText("name,email,notes\nAda,ada@example.com,=1+1\nGrace,grace@example.com,42\nLin,lin@example.com,43\nSam,sam@example.com,44", "fixture.csv");
    const preview = previewSafeCsvCopy(analysis, { excludedColumns: [1], neutralizeFormulaCells: true }, 2);
    expect(preview.sourceHeaders).toEqual(["name", "email", "notes"]);
    expect(preview.outputHeaders).toEqual(["name", "notes"]);
    expect(preview.sourceRows).toHaveLength(2);
    expect(preview.outputRows).toEqual([["Ada", "\t=1+1"], ["Grace", "42"]]);
  });

  it("matches locally stored header rules without retaining CSV data or file names", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); }, removeItem: (key: string) => { store.delete(key); } };
    const rule = createSavedCsvExclusionRule("Contact fields", [" Email ", "contact_phone"], "rule-1", "2026-08-16T00:00:00.000Z");
    expect(rule).not.toBeNull();
    writeSavedCsvExclusionRules(storage, [rule!]);
    expect(readSavedCsvExclusionRules(storage)).toMatchObject([{ id: "rule-1", name: "Contact fields", headers: ["email", "contact_phone"] }]);
    expect(matchingCsvRuleColumns(["customer_id", "EMAIL", "contact_phone", "notes"], rule!)).toEqual([1, 2]);
  });

  it("finds column labels locally without changing their original indexes", () => {
    const headers = ["Customer ID", "Email", "contact_phone", "Notes"];
    expect(findCsvColumnIndexes(headers, "PHONE")).toEqual([2]);
    expect(findCsvColumnIndexes(headers, "")).toEqual([0, 1, 2, 3]);
    expect(findCsvColumnIndexes(headers, "missing")).toEqual([]);
  });

  it("finds an unnamed header through its local fallback label", () => {
    expect(findCsvColumnIndexes(["", "Email"], "column 1")).toEqual([0]);
  });

  it("sorts only the visible column indexes by label or known PII-signal priority", () => {
    const headers = ["Notes", "email", "Amount", "contact_phone"];
    const visible = [0, 1, 2, 3];
    expect(sortCsvColumnIndexes(headers, visible, [1, 3], "alphabetical")).toEqual([2, 3, 1, 0]);
    expect(sortCsvColumnIndexes(headers, visible, [1, 3], "pii_first")).toEqual([3, 1, 2, 0]);
    expect(sortCsvColumnIndexes(headers, [3, 1], [1, 3], "source")).toEqual([1, 3]);
    expect(sortCsvColumnIndexes(headers, visible, new Map([[1, 1], [3, 3]]), "pii_count")).toEqual([3, 1, 2, 0]);
  });
});
