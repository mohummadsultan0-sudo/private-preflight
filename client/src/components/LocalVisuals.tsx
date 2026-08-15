/** Audit Ledger style: local-first visual marks are CSS-native so evidence, seals, and branding travel with the static application. */
type LocalSealProps = {
  label?: string;
  detail: string;
  className?: string;
};

export function LocalSeal({ label = "LOCAL ONLY", detail, className = "" }: LocalSealProps) {
  return (
    <div className={`local-seal ${className}`} aria-label={`${label}: ${detail}`}>
      <span className="local-seal__glyph" aria-hidden="true"><i /><i /><i /></span>
      <div><strong>{label}</strong><span>{detail}</span></div>
    </div>
  );
}

export function LedgerArt({ className = "" }: { className?: string }) {
  return (
    <div className={`ledger-art ${className}`} aria-hidden="true">
      <span className="ledger-art__index">LOCAL / 01</span>
      <div className="ledger-art__sheet"><i /><i /><i /><i /><i /></div>
      <div className="ledger-art__seal"><b>∴</b><span>NO API<br />PATH</span></div>
    </div>
  );
}
