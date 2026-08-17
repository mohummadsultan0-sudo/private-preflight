/** Audit Ledger style: the browser-native inspection tool leads; sales copy is deliberately secondary to the working surface. */
import { ArrowUpRight, Braces, CheckCircle2, FileSearch, LockKeyhole, ScanLine, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { AdSlot } from "@/components/AdSlot";
import { CsvWorkspace } from "@/components/CsvWorkspace";
import { LedgerArt } from "@/components/LocalVisuals";
import { SharePreflight } from "@/components/SharePreflight";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <BrandMark />
          <nav aria-label="Primary navigation"><span className="nav-mode-label">Inspection modes</span><a href="#tool" className="nav-mode-active" aria-current="page">CSV preflight <small>active</small></a><Link href="/image-inspector" className="nav-mode-switch">Image inspector</Link><Link href="/guides">Guides</Link><a href="#how-it-works">How it works</a><Link href="/privacy">Privacy</Link></nav>
          <div className="header-actions"><SharePreflight surface="csv" /><Link href="/image-inspector" className="header-action header-action--switch">Switch to image <ArrowUpRight aria-hidden="true" /></Link></div>
        </div>
      </header>
      <main>
        <CsvWorkspace />
        <section className="first-use-strip" aria-labelledby="first-use-title">
          <div><span className="eyebrow"><span>START HERE / 00</span> A 30-second first check</span><h2 id="first-use-title">Choose a file you are about to open or send.</h2></div>
          <ol><li><span>01</span><p><strong>Pick a local file.</strong> CSV, TSV, TXT, JPEG, PNG, WebP, or GIF.</p></li><li><span>02</span><p><strong>Read the evidence.</strong> Start with visible signals, not hidden automation.</p></li><li><span>03</span><p><strong>Decide before sharing.</strong> Keep the original, or make a local clean copy when offered.</p></li></ol>
        </section>
        <section id="how-it-works" className="method-section" aria-labelledby="method-title">
          <div className="method-section__intro"><span className="eyebrow"><span>METHOD / 03</span> Browser-native preflight</span><h2 id="method-title">A small checkpoint before a file travels.</h2><p>Use the tool when you are about to open an export in a spreadsheet, share it with a colleague, import it into a system, or submit a sample to an external service.</p></div>
          <div className="method-grid">
            <article><span>01</span><FileSearch aria-hidden="true" /><h3>Inspect the structure</h3><p>Detect delimiter, row-width, quote, encoding and duplicate signals directly from the local text file.</p></article>
            <article><span>02</span><ScanLine aria-hidden="true" /><h3>Review what can surprise a spreadsheet</h3><p>Locate formula-like leading characters without exposing raw cell values in the result panels.</p></article>
            <article><span>03</span><LockKeyhole aria-hidden="true" /><h3>Decide what leaves your device</h3><p>Keep the original, download a local report, or explicitly create a changed spreadsheet-oriented copy.</p></article>
          </div>
        </section>
        <section className="boundary-section" aria-labelledby="boundaries-title">
          <div className="boundary-section__art"><LedgerArt className="ledger-art--boundary" /></div>
          <div className="boundary-section__copy"><span className="eyebrow"><span>BOUNDARY / 04</span> No operational backend</span><h2 id="boundaries-title">Your data has a short path.</h2><p>There is no analysis API to wait on, no account to create, and no file store to clean up. The static site delivers this interface; the selected CSV remains in browser memory while you use it.</p><div className="boundary-list"><div><ShieldCheck aria-hidden="true" /><span><strong>Built for local handling</strong><small>No application endpoint receives a selected file.</small></span></div><div><Braces aria-hidden="true" /><span><strong>Rules you can question</strong><small>Every finding is a visible structure or pattern signal.</small></span></div><div><CheckCircle2 aria-hidden="true" /><span><strong>Exports are explicit</strong><small>The original file is never overwritten by this page.</small></span></div></div></div>
        </section>
        <section className="ad-readiness-callout" aria-labelledby="guide-callout-title"><div><span className="eyebrow"><span>FIELD LIBRARY / 05</span> Beyond a one-click scan</span><h2 id="guide-callout-title">Know what a local signal means before you act on it.</h2><p>Read compact guides for structure, formula-risk, duplicate, privacy, and image-metadata checks. Each one records practical boundaries as clearly as it records the next step.</p></div><div><Link href="/guides">Browse field guides <ArrowUpRight aria-hidden="true" /></Link><Link href="/about">About & contact <ArrowUpRight aria-hidden="true" /></Link></div></section>
        <AdSlot slotKey="supporting-content" />
      </main>
      <footer className="site-footer"><div><BrandMark compact /><p>Private Preflight · CSV preflight and image inspection, locally.</p><SharePreflight surface="csv" className="share-preflight--footer" /></div><div><Link href="/image-inspector">Image inspector</Link><Link href="/guides">Guides</Link><Link href="/about">About & contact</Link><Link href="/privacy">Privacy</Link><Link href="/consent">Consent</Link></div><small>© {new Date().getFullYear()} Private Preflight. Signals, not guarantees.</small></footer>
    </div>
  );
}
