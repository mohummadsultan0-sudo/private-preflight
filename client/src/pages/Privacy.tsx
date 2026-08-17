/** Audit Ledger style: privacy claims are organized as observable boundaries and limits, not vague assurances. */
import { ArrowLeft, FileKey2, LockKeyhole, Network, RadioTower, ScanLine, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { LocalSeal } from "@/components/LocalVisuals";
import { SharePreflight } from "@/components/SharePreflight";

const boundaries = [
  { icon: FileKey2, title: "Selected local file", text: "The app reads a CSV or supported image through your browser’s local file APIs. The application does not send its contents or name to an analysis endpoint." },
  { icon: ScanLine, title: "Analysis results", text: "CSV findings, image facts, and available image metadata are calculated in the active tab. They are not saved to an account, database, or application storage service." },
  { icon: RadioTower, title: "No required analysis backend", text: "The site is static. A host delivers the application bundle, but no product backend is required to inspect a file after the interface loads." },
  { icon: Network, title: "General visit measurement", text: "A general site-visit measurement script may load separately from the file workflow. It does not receive local file bytes, file names, CSV values, image metadata, or image previews." },
  { icon: Network, title: "Advertising & consent boundary", text: "Advertising is not enabled in this version. No advertising consent is requested or stored. Before a provider is enabled, the site owner must configure applicable disclosures and a verified consent-management flow." },
];

export default function Privacy() {
  return (
    <div className="site-shell privacy-shell">
      <header className="site-header"><div className="site-header__inner"><BrandMark /><div className="header-actions"><SharePreflight surface="privacy" /><Link className="header-action" href="/"><ArrowLeft aria-hidden="true" /> Return to preflight</Link></div></div></header>
      <main className="privacy-main">
        <section className="privacy-hero"><div><span className="eyebrow"><span>PRIVACY / 01</span> Designed for a short data path</span><h1>Your file should not need a destination to be inspected.</h1><p>Private Preflight is designed as a browser-only inspection suite. Its central product decision is that CSV and supported-image inspection do not require a product API, account, or file store.</p></div><LocalSeal className="privacy-seal" detail="Browser memory during inspection" /></section>
        <section className="boundary-grid">{boundaries.map((boundary, index) => { const Icon = boundary.icon; return <article key={boundary.title}><span>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" /><h2>{boundary.title}</h2><p>{boundary.text}</p></article>; })}</section>
        <section className="privacy-detail"><div><span className="eyebrow"><span>LIFECYCLE / 02</span> What happens in this browser</span><h2>Choose, inspect, decide, clear.</h2></div><ol><li><span>01</span><p><strong>Choose a file.</strong> The browser gives the app a local CSV or supported image File object only after you select it.</p></li><li><span>02</span><p><strong>Inspect locally.</strong> The app parses local text or image bytes and derives results in active page memory.</p></li><li><span>03</span><p><strong>Download only by choice.</strong> A CSV report or changed copy is generated as a local browser download when you activate that action.</p></li><li><span>04</span><p><strong>Reset or refresh.</strong> The application clears its working state. It does not retain a file history.</p></li></ol></section>
        <section className="privacy-caveat"><LockKeyhole aria-hidden="true" /><div><h2>Claims have boundaries.</h2><p>“Local only” describes the application’s file-analysis path. It does not control browser extensions, your operating system, network security, a third-party page you later upload the file to, or general hosting availability. The tool provides signals and local handling; it does not provide legal compliance, a security guarantee, or an enterprise data-retention policy.</p></div><ShieldCheck aria-hidden="true" /></section>
      </main>
      <footer className="site-footer"><div><BrandMark compact /><p>Private Preflight · CSV preflight and image inspection, locally.</p></div><div><Link href="/guides">Guides</Link><Link href="/about">About & contact</Link><Link href="/consent">Consent status</Link><Link href="/csv-pii-checker">PII signals</Link></div><small>Signals, not guarantees.</small></footer>
    </div>
  );
}
