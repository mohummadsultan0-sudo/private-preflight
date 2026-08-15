/** Audit Ledger style: a deliberately spare wordmark that makes the local-processing tool feel precise, calm, and trustworthy. */
import { Link } from "wouter";
type BrandMarkProps = { compact?: boolean; className?: string };

export function BrandMark({ compact = false, className = "" }: BrandMarkProps) {
  return (
    <Link href="/" className={`brand-mark ${className}`} aria-label="Private Preflight home">
      <span className="brand-mark__icon" aria-hidden="true" />
      {!compact && (
        <span className="brand-mark__name">
          private <strong>preflight</strong>
        </span>
      )}
    </Link>
  );
}
