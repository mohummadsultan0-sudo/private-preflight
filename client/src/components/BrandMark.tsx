/** Audit Ledger style: a deliberately spare wordmark that makes the local-processing tool feel precise, calm, and trustworthy. */
import { Link } from "wouter";

const BRAND_MARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%2324201d'/%3E%3Cpath d='M20 18h25v28H20z' fill='none' stroke='%23f6efe4' stroke-width='4'/%3E%3Cpath d='M20 18v28' stroke='%23e65a2e' stroke-width='8'/%3E%3Cpath d='M41 47h12' stroke='%23e65a2e' stroke-width='4'/%3E%3C/svg%3E";

type BrandMarkProps = { compact?: boolean; className?: string };

export function BrandMark({ compact = false, className = "" }: BrandMarkProps) {
  return (
    <Link href="/" className={`brand-mark ${className}`} aria-label="Private Preflight home">
      <img src={BRAND_MARK} alt="" className="brand-mark__icon" />
      {!compact && (
        <span className="brand-mark__name">
          <small>LOCAL INSPECTION SUITE</small>
          <b>private <strong>preflight</strong></b>
        </span>
      )}
    </Link>
  );
}
