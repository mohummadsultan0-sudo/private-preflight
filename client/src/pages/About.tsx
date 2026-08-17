/** Audit Ledger style: trust information is presented as an open project record with concrete boundaries, not promotional assurances. */
import { ArrowLeft, ArrowUpRight, BookOpenCheck, FileSearch, Github, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";

const projectRecord = [
  { icon: FileSearch, title: "What the tool is for", text: "Private Preflight gives people a small local checkpoint for CSV exports and supported images before they open, share, import, or publish a file." },
  { icon: ShieldCheck, title: "How the product is built", text: "The inspection path runs in the browser. Selected file contents are not sent to a product analysis service by this site." },
  { icon: BookOpenCheck, title: "How to use the findings", text: "Signals are evidence for a human decision. They are not legal, security, data-quality, or compliance guarantees." },
];

export default function About() {
  return (
    <div className="site-shell trust-shell">
      <header className="site-header"><div className="site-header__inner"><BrandMark /><div className="header-actions"><Link className="header-action" href="/guides"><BookOpenCheck aria-hidden="true" /> Browse guides</Link><Link className="header-action" href="/"><ArrowLeft aria-hidden="true" /> Return to preflight</Link></div></div></header>
      <main className="trust-main">
        <section className="trust-hero"><div><span className="eyebrow"><span>PROJECT RECORD / 01</span> What this site is—and is not</span><h1>A local tool should be easy to inspect, too.</h1><p>Private Preflight is a free browser-based utility for lightweight CSV checks and image metadata handling. It is designed to make a narrow file-review task clearer, without asking visitors to create an account or upload the selected file for analysis.</p></div><div className="trust-stamp" aria-label="Browser-native application"><span>LOCAL</span><strong>01</strong><small>NO FILE API</small></div></section>
        <section className="trust-record-grid" aria-label="Project operating record">{projectRecord.map((record, index) => { const Icon = record.icon; return <article key={record.title}><span>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" /><h2>{record.title}</h2><p>{record.text}</p></article>; })}</section>
        <section className="trust-detail"><div><span className="eyebrow"><span>EDITORIAL / 02</span> Guidance, not hidden automation</span><h2>Each guide names its limits.</h2></div><div><p>The field guides explain what a local check can observe, what it cannot determine, and the next review step. They do not manufacture outcomes, testimonials, security certifications, or promises of compatibility with another system.</p><Link href="/guides" className="tool-return"><BookOpenCheck aria-hidden="true" /> Read the field guides <ArrowUpRight aria-hidden="true" /></Link></div></section>
        <section id="contact" className="contact-record"><div><span className="eyebrow"><span>CONTACT / 03</span> Public project channel</span><h2>Report a product issue without sending a file.</h2><p>Use the public issue tracker for broken paths, accessibility problems, correction requests, or general questions. Do not attach a CSV, image, personal data, or metadata report to a public issue.</p></div><a className="contact-record__action" href="https://github.com/mohummadsultan0-sudo/private-preflight/issues/new" target="_blank" rel="noreferrer"><Github aria-hidden="true" /><span>Open project issue</span><ArrowUpRight aria-hidden="true" /></a></section>
      </main>
      <footer className="site-footer"><div><BrandMark compact /><p>Private Preflight · CSV preflight and image inspection, locally.</p></div><div><Link href="/guides">Guides</Link><Link href="/privacy">Privacy</Link><Link href="/consent">Consent</Link><Link href="/">CSV preflight</Link></div><small>Signals, not guarantees.</small></footer>
    </div>
  );
}
