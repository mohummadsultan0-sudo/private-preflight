/** Audit Ledger style: the guide index treats practical topics as a field library, avoiding generic SEO copy and keeping the tool within reach. */
import { ArrowLeft, ArrowRight, FileSearch, ImageIcon, LockKeyhole, ScanSearch, ShieldAlert, TableProperties } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { AdSlot } from "@/components/AdSlot";

const entries = [
  { href: "/csv-validator", icon: TableProperties, code: "CSV / 01", title: "Validate CSV structure", text: "Review delimiters, quotes, row widths, and encoding signals before an import fails." },
  { href: "/csv-formula-injection-scanner", icon: ShieldAlert, code: "CSV / 02", title: "Check formula-risk cells", text: "Understand formula-like leading characters before a spreadsheet interprets an untrusted export." },
  { href: "/csv-duplicate-finder", icon: ScanSearch, code: "CSV / 03", title: "Review duplicate signals", text: "Compare repeated rows or a chosen business key before it affects a downstream workflow." },
  { href: "/csv-pii-checker", icon: LockKeyhole, code: "CSV / 04", title: "Spot possible PII", text: "Use small, explainable signals to pause before an export reaches another destination." },
  { href: "/image-metadata-guide", icon: ImageIcon, code: "IMAGE / 05", title: "Prepare a photo for sharing", text: "Inspect metadata, orientation, output format, and the limits of a locally re-encoded clean copy." },
];

export default function Guides() {
  return (
    <div className="site-shell guide-index-shell">
      <header className="site-header"><div className="site-header__inner"><BrandMark /><div className="header-actions"><Link className="header-action" href="/image-inspector"><ImageIcon aria-hidden="true" /> Image inspector</Link><Link className="header-action" href="/"><ArrowLeft aria-hidden="true" /> Return to preflight</Link></div></div></header>
      <main className="trust-main">
        <section className="trust-hero"><div><span className="eyebrow"><span>FIELD LIBRARY / 01</span> Local handling, explained</span><h1>Short guides for the decision after the scan.</h1><p>Private Preflight is intentionally small. These field guides clarify what the tool observes, how to review the results, and where a human decision is still required before a file moves to its next destination.</p></div><div className="trust-stamp" aria-label="Five practical field guides"><span>GUIDES</span><strong>05</strong><small>LOCAL WORKFLOWS</small></div></section>
        <section className="guide-index-grid" aria-label="Field guides">{entries.map((entry) => { const Icon = entry.icon; return <Link key={entry.href} href={entry.href} className="guide-index-card"><span>{entry.code}</span><Icon aria-hidden="true" /><h2>{entry.title}</h2><p>{entry.text}</p><small>Open guide <ArrowRight aria-hidden="true" /></small></Link>; })}</section>
        <section className="guide-index-note"><FileSearch aria-hidden="true" /><div><h2>Need the tool, not another explanation?</h2><p>Open CSV Preflight for structured text exports or Image Inspector for supported photos. Both work in the browser; neither route asks the application to receive your selected file.</p></div><div><Link href="/">CSV preflight <ArrowRight aria-hidden="true" /></Link><Link href="/image-inspector">Image inspector <ArrowRight aria-hidden="true" /></Link></div></section>
        <AdSlot slotKey="field-library" />
      </main>
      <footer className="site-footer"><div><BrandMark compact /><p>Private Preflight · CSV preflight and image inspection, locally.</p></div><div><Link href="/about">About & contact</Link><Link href="/privacy">Privacy</Link><Link href="/consent">Consent</Link></div><small>Signals, not guarantees.</small></footer>
    </div>
  );
}
