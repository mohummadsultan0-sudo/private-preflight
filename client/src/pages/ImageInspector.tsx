/** Audit Ledger style: this page separates image inspection from the CSV workflow while retaining the same local-only evidence-first identity. */
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { ImageInspector } from "@/components/ImageInspector";

export default function ImageInspectorPage() {
  return <div className="site-shell image-shell"><header className="site-header"><div className="site-header__inner"><BrandMark /><nav aria-label="Primary navigation"><span className="nav-mode-label">Inspection modes</span><Link href="/">CSV preflight</Link><a href="#image-tool">Image inspector</a><Link href="/privacy">Privacy</Link></nav><Link href="/" className="header-action"><ArrowLeft aria-hidden="true" /> CSV preflight</Link></div></header><main><ImageInspector /></main><footer className="site-footer"><div><BrandMark compact /><span className="footer-ledger-label">PRIVATE PREFLIGHT / INSPECTION SUITE</span><p>One local inspection system for CSV preflight and image evidence.</p></div><div><Link href="/">CSV preflight</Link><Link href="/privacy">Privacy</Link></div><small>Signals, not guarantees.</small></footer></div>;
}
