/** Audit Ledger style: file analysis stays the first visual priority; evidence is explicit, human-reviewed, and never quietly modifies source data. */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  FileCheck2,
  FileWarning,
  FileUp,
  Fingerprint,
  Loader2,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analyzeFile,
  CsvAnalysis,
  CsvPreflightError,
  DEMO_CSV,
  downloadLocalText,
  findDuplicateGroups,
  MatchMode,
  MAX_FILE_BYTES,
  createReport,
  createSpreadsheetSafeCsv,
} from "@/lib/csv";

type Stage = "idle" | "reading" | "inspecting" | "complete" | "error";
type ResultView = "overview" | "structure" | "formula" | "duplicates" | "privacy";

const acceptedExtensions = ["csv", "tsv", "txt"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function delimiterName(value: string): string {
  return value === "\t" ? "Tab" : value === ";" ? "Semicolon" : value === "|" ? "Pipe" : "Comma";
}

function severityClass(count: number): string {
  if (count === 0) return "is-clear";
  if (count < 3) return "is-watch";
  return "is-alert";
}

function SummaryStat({ label, value, tone = "neutral", detail }: { label: string; value: number | string; tone?: "neutral" | "alert" | "watch" | "clear"; detail: string }) {
  return (
    <div className={`summary-stat summary-stat--${tone}`}>
      <span className="summary-stat__label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function IssueTag({ kind, label, count, description }: { kind: string; label: string; count: number; description: string }) {
  return (
    <div className={`issue-tag ${severityClass(count)}`}>
      <span className="issue-tag__key">{kind}</span>
      <div>
        <strong>{count} {label}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function CsvWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const decisionRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pendingNonStandardFile, setPendingNonStandardFile] = useState<File | null>(null);
  const [rejectedFile, setRejectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<CsvAnalysis | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resultView, setResultView] = useState<ResultView>("overview");
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [matchMode, setMatchMode] = useState<MatchMode>("normalized");
  const [showSafeExport, setShowSafeExport] = useState(false);

  const duplicateGroups = useMemo(
    () => (analysis ? findDuplicateGroups(analysis.rows, selectedColumns, matchMode) : []),
    [analysis, selectedColumns, matchMode],
  );

  const localSupported = typeof window !== "undefined" && "File" in window && "FileReader" in window;

  useEffect(() => {
    if (pendingNonStandardFile || rejectedFile) {
      const decision = decisionRef.current;
      if (!decision) return;
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const top = window.scrollY + decision.getBoundingClientRect().top - Math.max(24, (window.innerHeight - decision.offsetHeight) / 2);
      window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? "auto" : "smooth" });
      decision.focus({ preventScroll: true });
    }
  }, [pendingNonStandardFile, rejectedFile]);

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
    setStage("idle");
    setPendingNonStandardFile(null);
    setRejectedFile(null);
    setResultView("overview");
    setSelectedColumns([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const inspect = async (nextFile: File) => {
    setFile(nextFile);
    setError(null);
    setAnalysis(null);
    setStage("reading");
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      setStage("inspecting");
      const nextAnalysis = await analyzeFile(nextFile);
      setAnalysis(nextAnalysis);
      setStage("complete");
      setResultView("overview");
    } catch (caught) {
      const message = caught instanceof CsvPreflightError ? caught.message : "The browser could not complete this inspection. Your file was not uploaded. Reset and try again.";
      setError(message);
      setStage("error");
    }
  };

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) return;
    const extension = nextFile.name.includes(".") ? nextFile.name.split(".").pop()?.toLowerCase() : "";
    if (!extension || !acceptedExtensions.includes(extension)) {
      if (nextFile.type.startsWith("image/") || nextFile.type.startsWith("video/") || nextFile.type.startsWith("audio/") || nextFile.type === "application/pdf") {
        setRejectedFile(nextFile);
        return;
      }
      setPendingNonStandardFile(nextFile);
      return;
    }
    void inspect(nextFile);
  };

  const onFileInput = (event: React.ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0]);

  const useDemo = () => {
    const demo = new File([DEMO_CSV], "preflight-demo.csv", { type: "text/csv" });
    void inspect(demo);
  };

  const toggleColumn = (column: number) => {
    setSelectedColumns((current) => (current.includes(column) ? current.filter((item) => item !== column) : [...current, column]));
  };

  const downloadReport = () => {
    if (!analysis) return;
    downloadLocalText(createReport(analysis), `${analysis.fileName.replace(/\.[^.]+$/, "")}-preflight-report.json`, "application/json;charset=utf-8");
  };

  const downloadSafeExport = () => {
    if (!analysis) return;
    downloadLocalText(createSpreadsheetSafeCsv(analysis), `${analysis.fileName.replace(/\.[^.]+$/, "")}-spreadsheet-safe.csv`, "text/csv;charset=utf-8");
    setShowSafeExport(false);
  };

  const tabs: Array<{ id: ResultView; label: string; count?: number }> = analysis
    ? [
        { id: "overview", label: "Overview" },
        { id: "structure", label: "Structure", count: analysis.issues.length + analysis.inconsistentRows.length },
        { id: "formula", label: "Formula risk", count: analysis.formulaRisks.length },
        { id: "duplicates", label: "Duplicates", count: duplicateGroups.length },
        { id: "privacy", label: "PII signals", count: analysis.piiSignals.length },
      ]
    : [];

  return (
    <section className="workspace" id="tool" aria-labelledby="tool-heading">
      <div className="workspace__masthead">
        <div>
          <div className="eyebrow"><span>01</span> Browser-only file checkpoint</div>
          <h1 id="tool-heading">Inspect the file before the spreadsheet interprets it.</h1>
          <p className="lede">Structure, duplicate, formula-risk and potential PII checks run in this browser tab. The application never uploads your CSV.</p>
        </div>
        <div className="local-seal" aria-label="Local-only processing">
          <img src="/manus-storage/private-csv-preflight-local-seal_34c78c7d.jpg" alt="" />
          <div><strong>LOCAL ONLY</strong><span>File stays in this tab</span></div>
        </div>
      </div>

      {!localSupported && (
        <div className="inline-alert inline-alert--error" role="alert">
          <TriangleAlert aria-hidden="true" />
          <div><strong>This browser cannot run local file inspection.</strong><p>Use a current version of Chrome, Edge, Firefox, or Safari with JavaScript enabled. No file has been selected or sent.</p></div>
        </div>
      )}

      {!analysis && stage !== "complete" && (
        <div className="drop-layout">
          <div
            className={`dropzone ${isDragging ? "dropzone--dragging" : ""} ${stage === "reading" || stage === "inspecting" ? "dropzone--busy" : ""} ${rejectedFile || pendingNonStandardFile ? "dropzone--decision" : ""}`}
            onDragOver={(event) => { event.preventDefault(); if (localSupported) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); if (localSupported) chooseFile(event.dataTransfer.files?.[0]); }}
          >
            <div className="dropzone__index">FILE / 01</div>
            {rejectedFile ? (
              <div className="decision-card decision-card--inline" ref={decisionRef} tabIndex={-1} role="alert">
                <div className="decision-card__glyph"><FileWarning aria-hidden="true" /></div>
                <div className="decision-card__content"><span className="eyebrow"><span>FILE NOT OPENED</span> Unsupported format</span><h2>This file can’t be inspected here.</h2><p className="decision-card__filename-label" title={rejectedFile.name} aria-label={rejectedFile.name}>{rejectedFile.name}</p><p>{rejectedFile.type.startsWith("image/") ? "Images are intentionally not supported here because this is a CSV-only data inspector, not an image editor. " : ""}No file content was uploaded, opened, or analysed. Choose a local <code>.csv</code>, <code>.tsv</code>, or <code>.txt</code> export instead.</p></div>
                <div className="decision-card__actions"><Button className="action-button" onClick={() => { setRejectedFile(null); inputRef.current?.click(); }}><Upload aria-hidden="true" /> Choose compatible file</Button><Button variant="ghost" className="quiet-button" onClick={() => setRejectedFile(null)}>Dismiss</Button></div>
              </div>
            ) : pendingNonStandardFile ? (
              <div className="decision-card decision-card--inline" ref={decisionRef} tabIndex={-1} role="alert">
                <div className="decision-card__glyph"><AlertTriangle aria-hidden="true" /></div>
                <div className="decision-card__content"><span className="eyebrow"><span>CHECK</span> Unusual text extension</span><h2>Inspect this file as text?</h2><p className="decision-card__filename-label" title={pendingNonStandardFile.name} aria-label={pendingNonStandardFile.name}>{pendingNonStandardFile.name}</p><p>It does not end in .csv, .tsv, or .txt. The browser will attempt a local text read; binary or spreadsheet files will not be interpreted safely as CSV.</p></div>
                <div className="decision-card__actions"><Button variant="outline" onClick={() => setPendingNonStandardFile(null)}>Cancel</Button><Button className="action-button" onClick={() => { const selected = pendingNonStandardFile; setPendingNonStandardFile(null); void inspect(selected); }}>Inspect local text</Button></div>
              </div>
            ) : stage === "reading" || stage === "inspecting" ? (
              <div className="processing-state" aria-live="polite">
                <Loader2 className="spinner" aria-hidden="true" />
                <strong>{stage === "reading" ? "Reading locally" : "Inspecting locally"}</strong>
                <p>{stage === "reading" ? "Preparing an in-memory copy. Nothing has been uploaded." : "Checking file structure and visible signals. This can take a moment for larger files."}</p>
              </div>
            ) : (
              <>
                <div className="dropzone__icon"><FileUp aria-hidden="true" /></div>
                <h2>Drop a CSV here</h2>
                <p>or choose a local <code>.csv</code>, <code>.tsv</code>, or <code>.txt</code> export</p>
                <div className="dropzone__actions">
                  <Button className="action-button" disabled={!localSupported} onClick={() => inputRef.current?.click()}><Upload aria-hidden="true" /> Choose file</Button>
                  <Button variant="ghost" className="quiet-button" disabled={!localSupported} onClick={useDemo}>Try a safe demo <ArrowRight aria-hidden="true" /></Button>
                </div>
                <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={onFileInput} className="sr-only" aria-label="Choose a CSV file for local inspection" />
              </>
            )}
            <div className="dropzone__foot"><LockKeyhole aria-hidden="true" /> <span>Hard limit: {MAX_FILE_BYTES / 1024 / 1024} MB for predictable local performance.</span></div>
          </div>

          <aside className="tool-side-note" aria-label="How local inspection works">
            <span className="side-note__number">LOCAL / 02</span>
            <h3>Nothing crosses a server boundary.</h3>
            <ol>
              <li><span>1</span> Your browser reads the selected file into memory.</li>
              <li><span>2</span> Checks run in this page, not on a remote API.</li>
              <li><span>3</span> Reset or refresh clears the working copy.</li>
            </ol>
            <a href="#privacy-note">Read the handling limits <ArrowRight aria-hidden="true" /></a>
          </aside>
        </div>
      )}

      {error && (
        <div className="error-state" role="alert">
          <div className="error-state__sign"><TriangleAlert aria-hidden="true" /></div>
          <div><span className="eyebrow"><span>STOP</span> Inspection did not start</span><h2>{error}</h2><p>Your file was not uploaded. Resetting clears this tool’s in-memory state and lets you choose a different local export.</p></div>
          <Button variant="outline" onClick={reset}><RotateCcw aria-hidden="true" /> Reset workspace</Button>
        </div>
      )}

      {analysis && (
        <div className="result-stack" aria-live="polite">
          <header className="result-header">
            <div className="result-header__file"><FileCheck2 aria-hidden="true" /><div><span>LOCAL INSPECTION COMPLETE</span><h2>{analysis.fileName}</h2><p>{formatBytes(analysis.fileSize)} · {analysis.encoding} · {delimiterName(analysis.delimiter)} separated</p></div></div>
            <div className="result-header__actions"><Button variant="ghost" className="quiet-button" onClick={reset}><RotateCcw aria-hidden="true" /> Start over</Button><Button variant="outline" onClick={downloadReport}><Download aria-hidden="true" /> Report</Button></div>
          </header>

          <div className="result-grid">
            <div className="score-block"><span>READINESS</span><strong>{analysis.qualityScore}</strong><small>signal score / 100</small><p>It summarizes visible structure and preflight signals. It is not a safety or compliance grade.</p></div>
            <SummaryStat label="Rows" value={analysis.rows.length} detail={`${analysis.headers.length} header fields`} />
            <SummaryStat label="Formula cells" value={analysis.formulaRisks.length} tone={analysis.formulaRisks.length ? "alert" : "clear"} detail="potential spreadsheet interpretation" />
            <SummaryStat label="Duplicate groups" value={duplicateGroups.length} tone={duplicateGroups.length ? "watch" : "clear"} detail="using current match rule" />
            <SummaryStat label="PII signals" value={analysis.piiSignals.length} tone={analysis.piiSignals.length ? "watch" : "clear"} detail="potential, explainable rules" />
          </div>

          <nav className="result-tabs" aria-label="Inspection result sections">
            {tabs.map((tab) => <button type="button" className={resultView === tab.id ? "is-active" : ""} key={tab.id} onClick={() => setResultView(tab.id)}>{tab.label}{typeof tab.count === "number" && <span>{tab.count}</span>}</button>)}
          </nav>

          <div className="result-body">
            {resultView === "overview" && (
              <div className="overview-grid">
                <div className="overview-main">
                  <div className="panel-heading"><span className="evidence-bar">E-01</span><div><h3>Review in the order that limits surprises.</h3><p>The tool has not changed your file. Start with the checks that matter for your next step.</p></div></div>
                  <div className="issue-list">
                    <IssueTag kind="01" label="formula-risk cells" count={analysis.formulaRisks.length} description="Cells that start with spreadsheet-interpretable characters." />
                    <IssueTag kind="02" label="duplicate groups" count={duplicateGroups.length} description="Repeated row values under the current matching rule." />
                    <IssueTag kind="03" label="PII-signal columns" count={analysis.piiSignals.length} description="Headers or values that may need a sharing decision." />
                    <IssueTag kind="04" label="parser / structure notices" count={analysis.issues.length} description="Encoding, quote, delimiter, or column-count observations." />
                  </div>
                </div>
                <aside className="overview-side">
                  <img src="/manus-storage/private-csv-preflight-ledger-hero_fc1a22c7.jpg" alt="" />
                  <div><span>HOW TO READ THIS</span><h3>Signals are evidence, not verdicts.</h3><p>For example, a phone number beginning with “+” can look like a spreadsheet formula. Review the listed field before changing data.</p></div>
                </aside>
              </div>
            )}

            {resultView === "structure" && (
              <div className="detail-section">
                <div className="panel-heading"><span className="evidence-bar">S-01</span><div><h3>Structure & parse notes</h3><p>The parser found {analysis.headers.length} header fields and {analysis.rows.length} data rows using a {delimiterName(analysis.delimiter).toLowerCase()} delimiter.</p></div></div>
                {analysis.issues.length === 0 && analysis.inconsistentRows.length === 0 ? <div className="clean-state"><Check aria-hidden="true" /><div><strong>No parser or row-width notices found.</strong><p>This means the locally parsed rows match the detected header width. It does not validate the meaning of your data.</p></div></div> : <div className="notice-stack">{analysis.issues.map((issue, index) => <div className={`notice notice--${issue.severity}`} key={`${issue.code}-${index}`}><AlertTriangle aria-hidden="true" /><div><strong>{issue.code.replace(/_/g, " ")}</strong><p>{issue.message}</p></div></div>)}{analysis.inconsistentRows.length > 0 && <div className="row-reference"><span>Rows with a different field count</span><code>{analysis.inconsistentRows.slice(0, 40).join(", ")}{analysis.inconsistentRows.length > 40 ? " …" : ""}</code></div>}</div>}
                <div className="header-strip"><span>Detected headers</span><div>{analysis.headers.map((header, index) => <code key={`${header}-${index}`}>{header.trim() || `Column ${index + 1}`}</code>)}</div></div>
              </div>
            )}

            {resultView === "formula" && (
              <div className="detail-section">
                <div className="panel-heading"><span className="evidence-bar">F-01</span><div><h3>Potential spreadsheet formula cells</h3><p>These cells begin with a character that spreadsheet software may interpret. The list shows locations, not the raw cell content.</p></div></div>
                {analysis.formulaRisks.length === 0 ? <div className="clean-state"><ShieldCheck aria-hidden="true" /><div><strong>No formula-like leading characters found.</strong><p>This scan cannot prove that a file is safe for every spreadsheet application.</p></div></div> : <><div className="risk-banner"><div className="risk-banner__figure" aria-hidden="true"><span>!</span></div><div><strong>{analysis.formulaRisks.length} cells need human review.</strong><p>Phone numbers and negative values can trigger this signal too. Choose the export only if adding a leading tab is appropriate for your downstream use.</p></div></div><div className="data-table-wrap"><table><thead><tr><th>Row</th><th>Column</th><th>Header</th><th>Leading signal</th></tr></thead><tbody>{analysis.formulaRisks.slice(0, 100).map((risk) => <tr key={`${risk.row}-${risk.column}`}><td>{risk.row}</td><td>{risk.column}</td><td>{risk.header}</td><td><code>{risk.trigger}</code></td></tr>)}</tbody></table></div>{analysis.formulaRisks.length > 100 && <p className="table-limit">Showing the first 100 locations. The local report includes all findings.</p>}<div className="export-callout"><div><span>OPTIONAL EXPORT</span><h4>Prepare a spreadsheet-oriented copy</h4><p>Only flagged data cells receive a leading tab. This changes values and is not a universal mitigation.</p></div><Button className="action-button" onClick={() => setShowSafeExport(true)}><Download aria-hidden="true" /> Review export</Button></div></>}
              </div>
            )}

            {resultView === "duplicates" && (
              <div className="detail-section">
                <div className="panel-heading"><span className="evidence-bar">D-01</span><div><h3>Duplicate finder</h3><p>Choose all fields for repeated rows, or select business-key fields to inspect repeated values.</p></div></div>
                <div className="duplicate-controls"><div><span className="control-label">Columns to compare</span><div className="column-chips">{analysis.headers.map((header, index) => <button type="button" key={`${header}-${index}`} className={selectedColumns.includes(index) ? "is-selected" : ""} onClick={() => toggleColumn(index)}>{header.trim() || `Column ${index + 1}`}</button>)}</div><small>{selectedColumns.length === 0 ? "All columns are currently compared." : `${selectedColumns.length} selected field${selectedColumns.length === 1 ? "" : "s"} are compared.`}</small></div><div className="match-choice"><span className="control-label">Match behavior</span><div><button type="button" className={matchMode === "normalized" ? "is-selected" : ""} onClick={() => setMatchMode("normalized")}>Normalized</button><button type="button" className={matchMode === "exact" ? "is-selected" : ""} onClick={() => setMatchMode("exact")}>Exact</button></div><small>Normalized ignores surrounding whitespace, repeated spaces, and letter case.</small></div></div>
                {duplicateGroups.length === 0 ? <div className="clean-state"><Check aria-hidden="true" /><div><strong>No duplicate groups found with this rule.</strong><p>That does not prove a record is unique; choose the business fields that define a duplicate in your workflow.</p></div></div> : <div className="data-table-wrap"><table><thead><tr><th>Group</th><th>Rows</th><th>Occurrences</th><th>Comparison</th></tr></thead><tbody>{duplicateGroups.slice(0, 100).map((group, index) => <tr key={group.key}><td>#{index + 1}</td><td><code>{group.rows.join(", ")}</code></td><td>{group.count}</td><td>{selectedColumns.length ? selectedColumns.map((column) => analysis.headers[column]).join(", ") : "All fields"}</td></tr>)}</tbody></table></div>}
              </div>
            )}

            {resultView === "privacy" && (
              <div className="detail-section">
                <div className="panel-heading"><span className="evidence-bar">P-01</span><div><h3>Potential PII signals</h3><p>These are explainable pattern and header signals. They are not a legal classification or proof that a person is identifiable.</p></div></div>
                {analysis.piiSignals.length === 0 ? <div className="clean-state"><Fingerprint aria-hidden="true" /><div><strong>No configured PII-like header or value signals were found.</strong><p>Absence from this short rule set does not mean a file has no sensitive information.</p></div></div> : <><div className="privacy-note"><LockKeyhole aria-hidden="true" /><p>Values are intentionally not displayed in this panel. The tool only reports headers, kinds of signal, and count evidence.</p></div><div className="data-table-wrap"><table><thead><tr><th>Column</th><th>Header</th><th>Signals</th><th>Value matches</th></tr></thead><tbody>{analysis.piiSignals.map((signal) => <tr key={signal.column}><td>{signal.column}</td><td>{signal.header}</td><td>{signal.kinds.join(" · ")}</td><td>{signal.matches || "—"}</td></tr>)}</tbody></table></div></>}
              </div>
            )}
          </div>
        </div>
      )}

      {showSafeExport && analysis && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowSafeExport(false)}>
          <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="dialog-close" onClick={() => setShowSafeExport(false)} aria-label="Close export dialog"><X /></button>
            <span className="eyebrow"><span>REVIEW</span> Local export choice</span><h2 id="export-title">This export changes {analysis.formulaRisks.length} flagged cell{analysis.formulaRisks.length === 1 ? "" : "s"}.</h2><p>It adds a tab before each detected formula-like cell. This can reduce formula interpretation in some spreadsheet workflows, but it changes the data and is not universal protection. Your original file is not modified.</p>
            <div className="dialog-actions"><Button variant="outline" onClick={() => setShowSafeExport(false)}>Keep original only</Button><Button className="action-button" onClick={downloadSafeExport}><Download aria-hidden="true" /> Download changed copy</Button></div>
          </section>
        </div>
      )}

      <div className="ad-boundary" aria-label="Reserved advertisement placement">
        <span>ADVERTISEMENT — RESERVED AFTER PROVIDER APPROVAL</span>
        <p>The tool remains usable if this space is blocked, empty, or unavailable.</p>
      </div>
      <p id="privacy-note" className="tool-disclaimer"><ShieldCheck aria-hidden="true" /> This tool reports local signals, not compliance, safety, or security guarantees. <a href="/privacy">Read how local processing works.</a></p>
    </section>
  );
}
