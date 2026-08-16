/** Deterministic verification for the browser-only CSV engine. */
import { describe, expect, it } from "vitest";
import { analyzeText, createSafeCsvCopy, createSpreadsheetSafeCsv, detectDelimiter, parseDelimited } from "./csv";

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
});
