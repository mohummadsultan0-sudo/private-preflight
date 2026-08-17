/** Audit Ledger style: consent status is shown as an auditable system state; this inactive record must never imitate a functional choice panel. */
import { ArrowLeft, CircleSlash2, ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";

export default function Consent() {
  return (
    <div className="site-shell consent-shell">
      <header className="site-header"><div className="site-header__inner"><BrandMark /><div className="header-actions"><Link className="header-action" href="/privacy"><ShieldCheck aria-hidden="true" /> Privacy record</Link><Link className="header-action" href="/"><ArrowLeft aria-hidden="true" /> Return to preflight</Link></div></div></header>
      <main className="trust-main">
        <section className="trust-hero consent-hero"><div><span className="eyebrow"><span>CONSENT RECORD / 01</span> Current system status</span><h1>No advertising consent is being collected here.</h1><p>Advertising is not active in this release. Private Preflight does not load an advertising tag, advertising cookie, consent-management vendor, or advertising preference store. There is no consent choice for a visitor to make at this time.</p></div><div className="trust-stamp trust-stamp--inactive" aria-label="Advertising inactive"><CircleSlash2 aria-hidden="true" /><span>STATUS</span><strong>OFF</strong></div></section>
        <section className="consent-record"><article><span>01</span><h2>What is active now</h2><p>The browser runs the local file tool. A separate general site-visit measurement script may load, but it does not receive selected file bytes, names, CSV values, image metadata, or image previews.</p></article><article><span>02</span><h2>What will happen before ads are enabled</h2><p>The site owner must configure a verified consent-management platform and advertising account. The implementation must disclose the applicable providers, offer the required choices, and provide a way to revisit those choices where required.</p></article><article><span>03</span><h2>What this page cannot do</h2><p>This page does not create, store, revoke, or prove consent. It is a transparent record of the inactive state, not a substitute for a configured consent-management platform.</p></article></section>
        <section className="consent-source"><ShieldCheck aria-hidden="true" /><div><h2>Policy reference</h2><p>Google’s EU user consent policy describes consent, disclosure, records, and revocation duties for certain Google product use in the EEA, UK, and Switzerland. The final configuration must be checked against the owner’s network account, audience, location, and legal obligations.</p><a href="https://www.google.com/about/company/user-consent-policy/" target="_blank" rel="noreferrer">Read Google’s EU user consent policy <ExternalLink aria-hidden="true" /></a></div></section>
      </main>
      <footer className="site-footer"><div><BrandMark compact /><p>Private Preflight · CSV preflight and image inspection, locally.</p></div><div><Link href="/about">About & contact</Link><Link href="/privacy">Privacy</Link><Link href="/guides">Guides</Link></div><small>Advertising remains inactive in this release.</small></footer>
    </div>
  );
}
