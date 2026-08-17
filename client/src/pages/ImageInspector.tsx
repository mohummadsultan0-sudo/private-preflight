/** Audit Ledger style: this page separates image inspection from the CSV workflow while retaining the same local-only evidence-first identity. */
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { ImageInspector } from "@/components/ImageInspector";
import { SharePreflight } from "@/components/SharePreflight";

export default function ImageInspectorPage() {
  return <div className="site-shell image-shell"><header className="site-header"><div className="site-header__inner"><BrandMark /><nav aria-label="Primary navigation"><span className="nav-mode-label">Inspection modes</span><Link href="/" className="nav-mode-switch">CSV preflight</Link><a href="#image-tool" className="nav-mode-active" aria-current="page">Image inspector <small>active</small></a><Link href="/guides">Guides</Link><Link href="/privacy">Privacy</Link></nav><div className="header-actions"><SharePreflight surface="image" /><Link href="/" className="header-action header-action--switch"><ArrowLeft aria-hidden="true" /> Switch to CSV</Link></div></div></header><main><ImageInspector /></main><footer className="site-footer"><div><BrandMark compact /><span className="footer-ledger-label">PRIVATE PREFLIGHT / INSPECTION SUITE</span><p>One local inspection system for CSV preflight and image evidence.</p><SharePreflight surface="image" className="share-preflight--footer" /></div><div><Link href="/">CSV preflight</Link><Link href="/guides">Guides</Link><Link href="/about">About & contact</Link><Link href="/privacy">Privacy</Link><Link href="/consent">Consent</Link></div><small>Signals, not guarantees.</small></footer></div>;
}
