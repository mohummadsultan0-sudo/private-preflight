/** Audit Ledger style: the browser-native inspection tool leads; sales copy is deliberately secondary to the working surface. */
import { ArrowUpRight, Braces, CheckCircle2, FileSearch, LockKeyhole, ScanLine, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { CsvWorkspace } from "@/components/CsvWorkspace";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <BrandMark />
          <nav aria-label="Primary navigation"><a href="#tool">CSV preflight</a><Link href="/image-inspector">Image inspector</Link><a href="#how-it-works">How it works</a><Link href="/privacy">Privacy</Link></nav>
          <Link href="/image-inspector" className="header-action">Image inspector <ArrowUpRight aria-hidden="true" /></Link>
        </div>
      </header>
      <main>
        <CsvWorkspace />
        <section id="how-it-works" className="method-section" aria-labelledby="method-title">
          <div className="method-section__intro"><span className="eyebrow"><span>METHOD / 03</span> Browser-native preflight</span><h2 id="method-title">A small checkpoint before a file travels.</h2><p>Use the tool when you are about to open an export in a spreadsheet, share it with a colleague, import it into a system, or submit a sample to an external service.</p></div>
          <div className="method-grid">
            <article><span>01</span><FileSearch aria-hidden="true" /><h3>Inspect the structure</h3><p>Detect delimiter, row-width, quote, encoding and duplicate signals directly from the local text file.</p></article>
            <article><span>02</span><ScanLine aria-hidden="true" /><h3>Review what can surprise a spreadsheet</h3><p>Locate formula-like leading characters without exposing raw cell values in the result panels.</p></article>
            <article><span>03</span><LockKeyhole aria-hidden="true" /><h3>Decide what leaves your device</h3><p>Keep the original, download a local report, or explicitly create a changed spreadsheet-oriented copy.</p></article>
          </div>
        </section>
        <section className="boundary-section" aria-labelledby="boundaries-title">
          <div className="boundary-section__art"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 540'%3E%3Crect width='960' height='540' fill='%23e7dfd2'/%3E%3Cpath d='M90 90h520v300H90z' fill='%23f8f4eb' stroke='%2324201d' stroke-width='5'/%3E%3Cpath d='M130 150h360M130 205h420M130 260h310M130 315h460' stroke='%23b9afa1' stroke-width='14'/%3E%3Cpath d='M130 150h95M130 260h95' stroke='%231f5a48' stroke-width='14'/%3E%3Ccircle cx='700' cy='360' r='95' fill='%23f4f0e8' stroke='%23e65a2e' stroke-width='8'/%3E%3Cpath d='M650 360h100M700 310v100' stroke='%2324201d' stroke-width='12'/%3E%3C/svg%3E" alt="Abstract editorial grid representing local data inspection" /></div>
          <div className="boundary-section__copy"><span className="eyebrow"><span>BOUNDARY / 04</span> No operational backend</span><h2 id="boundaries-title">Your data has a short path.</h2><p>There is no analysis API to wait on, no account to create, and no file store to clean up. The static site delivers this interface; the selected CSV remains in browser memory while you use it.</p><div className="boundary-list"><div><ShieldCheck aria-hidden="true" /><span><strong>Built for local handling</strong><small>No application endpoint receives a selected file.</small></span></div><div><Braces aria-hidden="true" /><span><strong>Rules you can question</strong><small>Every finding is a visible structure or pattern signal.</small></span></div><div><CheckCircle2 aria-hidden="true" /><span><strong>Exports are explicit</strong><small>The original file is never overwritten by this page.</small></span></div></div></div>
        </section>
      </main>
      <footer className="site-footer"><div><BrandMark compact /><p>Private Preflight · CSV preflight and image inspection, locally.</p></div><div><Link href="/image-inspector">Image inspector</Link><Link href="/csv-validator">CSV checks</Link><Link href="/csv-duplicate-finder">Duplicate checks</Link><Link href="/privacy">Privacy</Link></div><small>© {new Date().getFullYear()} Private Preflight. Signals, not guarantees.</small></footer>
    </div>
  );
}
