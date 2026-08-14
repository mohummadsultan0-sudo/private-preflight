/** Audit Ledger style: the persistent four-step trail makes local inspection feel like a guided, evidence-first checkpoint. */
type AuditTrailProps = {
  mode: "csv" | "image";
  phase: "idle" | "reading" | "ready" | "error";
};

const labels = {
  csv: [
    ["Add", "CSV file"],
    ["Inspect", "Local parse"],
    ["Review", "Evidence"],
    ["Export", "By choice"],
  ],
  image: [
    ["Add", "Image file"],
    ["Inspect", "Local read"],
    ["Review", "Facts & EXIF"],
    ["Decide", "Before sharing"],
  ],
} as const;

export function AuditTrail({ mode, phase }: AuditTrailProps) {
  const active = phase === "ready" ? 3 : phase === "reading" || phase === "error" ? 2 : 1;
  return (
    <ol className="audit-trail" aria-label={`${mode === "csv" ? "CSV" : "Image"} inspection path`}>
      {labels[mode].map(([label, detail], index) => {
        const step = index + 1;
        const state = step < active ? "is-complete" : step === active ? "is-current" : "";
        return <li className={state} key={label}><span>{String(step).padStart(2, "0")}</span><div><strong>{label}</strong><small>{detail}</small></div></li>;
      })}
    </ol>
  );
}
