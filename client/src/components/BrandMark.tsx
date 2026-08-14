/** Audit Ledger style: a deliberately spare wordmark that makes the local-processing tool feel precise, calm, and trustworthy. */
type BrandMarkProps = { compact?: boolean; className?: string };

export function BrandMark({ compact = false, className = "" }: BrandMarkProps) {
  return (
    <a href="/" className={`brand-mark ${className}`} aria-label="Private CSV Preflight home">
      <img src="/manus-storage/private-csv-preflight-mark_c773fe6a.png" alt="" className="brand-mark__icon" />
      {!compact && (
        <span className="brand-mark__name">
          private <strong>preflight</strong>
        </span>
      )}
    </a>
  );
}
