/** Audit Ledger style: guidance reads like a compact field manual, with clear limits and a visible return path to the local tool. */
import { ArrowLeft, ArrowRight, BookOpenCheck, Braces, FileWarning, ImageIcon, LockKeyhole, ScanSearch, ShieldAlert, TableProperties } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";

type GuideKind = "formula" | "validator" | "duplicates" | "pii" | "image_metadata";

const guides: Record<GuideKind, { kicker: string; icon: typeof ShieldAlert; title: string; lede: string; intro: string; cards: Array<{ title: string; text: string }>; steps: string[]; note: string; source?: { label: string; href: string } }> = {
  formula: {
    kicker: "Formula-risk field guide",
    icon: ShieldAlert,
    title: "Check a CSV before a spreadsheet interprets it.",
    lede: "Find cells that start with characters spreadsheets may treat as formulas, then decide whether a changed export is appropriate for the next system.",
    intro: "CSV formula injection is not a property of every plus sign or equals sign. It is a risk created when spreadsheet software interprets an untrusted cell as a formula. Private CSV Preflight lists locations so you can review intent without displaying sensitive cell contents in the result table.",
    cards: [
      { title: "What the scan looks for", text: "Leading =, +, -, @, whitespace control characters, and full-width variants are treated as formula-like signals. This is intentionally cautious." },
      { title: "Why results need review", text: "A phone number beginning with + or a negative amount can trigger the same signal. A signal is a prompt to review, not a malicious-content verdict." },
      { title: "What the export changes", text: "The optional export adds a leading tab to detected cells. It creates a new local file and never overwrites the original." },
    ],
    steps: ["Open a local CSV in the browser tool.", "Review the Formula risk tab for rows, columns, headers, and leading signals.", "Keep the original when downstream software needs the exact value.", "Only download the changed copy after checking that the value change is acceptable."],
    note: "There is no universal CSV sanitization method that is suitable for every spreadsheet application or downstream consumer. Treat any export choice as part of a specific workflow review.",
    source: { label: "OWASP: CSV Injection", href: "https://owasp.org/www-community/attacks/CSV_Injection" },
  },
  validator: {
    kicker: "Structure field guide",
    icon: TableProperties,
    title: "Validate the shape before an import fails.",
    lede: "A CSV can look readable but still contain the delimiter, quote, encoding, or row-width issue that breaks an import downstream.",
    intro: "The validator parses the local text into rows and fields, selects a likely delimiter, reports quote problems, and compares each data row with the header width. It does not infer business meaning or claim that your target system accepts the file.",
    cards: [
      { title: "Delimiter detection", text: "Comma, semicolon, tab, and pipe are compared against the first rows. A one-column result is always shown as a warning, not silently accepted." },
      { title: "Quoted text", text: "Quoted commas, escaped quotes, and quoted line breaks are preserved by the local parser. An unclosed quote creates a prominent partial-results notice." },
      { title: "Encoding signal", text: "The tool reads UTF-8 first and warns if it has to use a Windows-1252 fallback. Review accented characters before using an export." },
    ],
    steps: ["Inspect the detected separator and header field count.", "Open Structure to review parser notices and inconsistent row numbers.", "Correct the source export when a malformed quote or unexpected single column appears.", "Use a smaller, valid text export if the file exceeds the browser-only limit."],
    note: "A successful parse is not a schema or import guarantee. Always validate against the requirements of the application receiving your data.",
  },
  duplicates: {
    kicker: "Duplicate field guide",
    icon: ScanSearch,
    title: "Duplicate means a rule, not a number.",
    lede: "Find repeated full rows or repeated business keys before a CSV creates duplicate contacts, orders, or reporting totals.",
    intro: "The default view compares every parsed field. You can switch to selected columns when your workflow has a real business key, such as email, customer ID, invoice number, or a combination of fields.",
    cards: [
      { title: "Normalized matching", text: "Whitespace, repeated spaces, and case differences are normalized. This helps reveal repeated values entered with minor formatting differences." },
      { title: "Exact matching", text: "Every character must match. Use it when case, punctuation, or spacing carries meaning in your source system." },
      { title: "No silent removal", text: "Private CSV Preflight lists the groups and row numbers. It does not delete a record because duplicates can be valid in many data models." },
    ],
    steps: ["Start with all fields to detect exact repeated rows.", "Select the fields that define a real business key for your use case.", "Review each group and its source row numbers.", "Resolve repeated data in the system of record when possible, rather than relying on a downloaded copy."],
    note: "The app can show that values repeat under your chosen rule. It cannot decide whether the repeated records should be merged, kept, or deleted.",
  },
  pii: {
    kicker: "Privacy field guide",
    icon: LockKeyhole,
    title: "Spot possible personal data before sharing an export.",
    lede: "Use simple, explainable local signals to notice fields that may deserve a sharing decision before a CSV travels to another person, tool, or service.",
    intro: "The PII view looks for a small set of header names and value patterns, including email-like, phone-like, and IP-like values. It deliberately reports a potential signal rather than declaring a legal category or user identity.",
    cards: [
      { title: "Values stay concealed", text: "The result table displays the field header, kinds of signal, and match counts rather than copying the potentially sensitive values to another UI surface." },
      { title: "Small rule set by design", text: "A compact pattern set is explainable and fast. It is not a replacement for an enterprise data-discovery or legal-compliance system." },
      { title: "Local handling", text: "The selected file stays in browser memory while you inspect it. Resetting or refreshing clears this working copy from the application." },
    ],
    steps: ["Open your local file without uploading it to a third-party analysis service.", "Review headers and signal types in the PII signals tab.", "Decide whether each field is necessary for the next destination.", "Use the original source or an approved redaction workflow when information must be removed."],
    note: "No absence of signals can prove a file contains no sensitive data. Use this tool as a preflight prompt, not a compliance decision.",
  },
  image_metadata: {
    kicker: "Image-sharing field guide",
    icon: ImageIcon,
    title: "Inspect a photo before it carries more than pixels.",
    lede: "Review available metadata, dimensions, orientation, and output choices before you share an image outside the device where it was created.",
    intro: "A photo can contain technical and descriptive information beyond what is visible. Private Preflight checks the selected supported image in the active browser tab, then can generate a new local clean copy through browser decoding and re-encoding. The original file is not changed.",
    cards: [
      { title: "What the inspection can reveal", text: "The image view identifies file facts, dimensions, available EXIF fields, ICC-profile signals, XMP signals, and textual-comment signals where the selected format and browser decode path make them observable." },
      { title: "What a clean copy does", text: "The clean-copy action creates a new JPEG, PNG, or WebP file from decoded image pixels. Re-encoding is intended to omit available metadata from the generated output; it also changes the file representation." },
      { title: "Why orientation is visible", text: "Some photos rely on EXIF orientation. When the tool can read that signal, it corrects the visible orientation in the clean copy before generating the local download." },
    ],
    steps: ["Open a supported image in Image Inspector and review the available evidence.", "Decide whether dimensions, output type, anonymous filename, and compression quality match the next destination.", "Read the before-and-after comparison before generating the local clean copy.", "Keep the original when you need provenance, editing flexibility, or an exact byte-for-byte record."],
    note: "A clean copy cannot guarantee removal of every possible embedded signal in every format, browser, or downstream platform. Review the generated file for the use case that matters to you.",
  },
};

export function Guide({ kind }: { kind: GuideKind }) {
  const guide = guides[kind];
  const Icon = guide.icon;
  return (
    <div className="site-shell guide-shell">
      <header className="site-header"><div className="site-header__inner"><BrandMark /><Link className="header-action" href="/"><ArrowLeft aria-hidden="true" /> Return to preflight</Link></div></header>
      <main className="guide-main">
        <section className="guide-hero"><div className="guide-hero__icon"><Icon aria-hidden="true" /></div><div><span className="eyebrow"><span>GUIDE / 01</span> {guide.kicker}</span><h1>{guide.title}</h1><p>{guide.lede}</p></div></section>
        <div className="guide-layout"><article className="guide-article"><p className="guide-intro">{guide.intro}</p><div className="guide-card-grid">{guide.cards.map((card, index) => <section key={card.title} className="guide-card"><span>{String(index + 1).padStart(2, "0")}</span><h2>{card.title}</h2><p>{card.text}</p></section>)}</div><section className="field-steps"><span className="eyebrow"><span>FIELD STEPS / 02</span> Before your next destination</span><ol>{guide.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol></section></article><aside className="guide-aside"><div className={`aside-art ${kind === "formula" ? "aside-art--formula" : ""}`}>{kind === "formula" ? <div className="formula-figure" aria-hidden="true"><i /><i /><i /><b>!</b></div> : <div className="guide-local-mark"><BrandMark compact /></div>}</div><div className="limit-note"><FileWarning aria-hidden="true" /><div><strong>Important limit</strong><p>{guide.note}</p>{guide.source && <a href={guide.source.href} target="_blank" rel="noreferrer">{guide.source.label} <ArrowRight aria-hidden="true" /></a>}</div></div><Link className="tool-return" href="/"><BookOpenCheck aria-hidden="true" /> Open the local tool <ArrowRight aria-hidden="true" /></Link></aside></div>
      </main>
      <footer className="site-footer"><div><BrandMark compact /><p>Private CSV Preflight · Browser-native inspection for CSV files.</p></div><div><Link href="/privacy">Privacy</Link><Link href="/csv-validator">Validator</Link><Link href="/csv-duplicate-finder">Duplicates</Link></div><small>Signals, not guarantees.</small></footer>
    </div>
  );
}
