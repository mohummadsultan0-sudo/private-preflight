# Private CSV Preflight — Architecture & Resilience Plan

## 1. Operating model

Private CSV Preflight is deliberately a **static, browser-only application**. There is no application backend, database, file storage service, account system, or API involved in CSV analysis. The hosting server delivers the application bundle only; after the page loads, a selected file remains in browser memory and is never posted by the application.

```text
User file
   │ (File API; in-memory only)
   ▼
Browser parsing and analysis
   ├── structure / delimiter / encoding signal
   ├── duplicate index
   ├── formula-risk scan
   └── PII signal scan
   │
   ├── rendered report
   ├── local JSON / CSV report download
   └── optional spreadsheet-oriented export

Static host ── serves JavaScript/CSS/HTML only
Ad network ── optional, asynchronous, never part of analysis or file flow
```

### Why no critical backend exists

The product promise is local analysis. A parsing backend would create a privacy, availability, cost, breach, retention, and compliance burden that is not required for a CSV preflight tool. Its intentional absence reduces the number of systems that can fail.

## 2. Trust boundaries

| Boundary | Design decision | User-visible result |
| --- | --- | --- |
| User file | Only passed to browser file APIs and analysis functions. | “Local only” seal beside the file control and results. |
| Browser memory | Data exists only while the active tab is open or until the user chooses a local download. | Reset clears app state; refresh clears in-memory data. |
| Static host | Serves code, never receives CSV content. | Tool remains usable after first load without an application API. |
| Analytics | No file name, parsed field, issue sample, or analysis result may be sent. | Analytics, if ever enabled, is limited to anonymous page events. |
| Advertising | Must load asynchronously in isolated reserved slots. | A blocked or unavailable ad never blocks upload, analysis, result, or export. |

## 3. Analysis contract

The application reports **signals**, not legal, security, accounting, or compliance decisions. All detection rules are explainable in the UI.

| Check | Output | Safe wording |
| --- | --- | --- |
| CSV structure | delimiter, parsed rows, column count, parser errors | “The parser found…” |
| Duplicates | groups and affected row numbers, whole-row or selected-column key | “Potential duplicate group…” |
| Formula risk | cells with formula-like leading characters | “Potential spreadsheet formula cell…” |
| PII signal | email, phone-like, IP-like, or sensitive header indication | “Potential PII signal…” |
| Safe export | user-selected transformation with an explicit impact statement | “This export changes the flagged cell values by…” |

No check may say “safe”, “compliant”, “malicious”, “defective”, or “guaranteed”.

## 4. Failure-mode design

| Scenario | Detection | Product behavior | Recovery path |
| --- | --- | --- | --- |
| No file chosen | No `File` object. | Disabled analysis controls; concise helper text. | Choose file or try a supplied demo. |
| Wrong extension | Extension is not `.csv`, `.tsv`, or `.txt`. | Warning, not a hard block; text CSV can have an unusual extension. | Continue only after explicit confirmation. |
| Empty file | `size === 0`. | Error card without any analysis. | Choose another file. |
| File too large | Configured client-side maximum exceeded before read. | Error explains browser-memory limit; never starts processing. | Use a smaller export or a local desktop tool. |
| Text decoding issue | UTF-8 decode fails or parser reports encoding-like corruption. | Shows encoding signal and parser warning, with no unsafe auto-conversion. | Re-export as UTF-8 / try explicit fallback. |
| Malformed CSV | Parser returns quote/field mismatch errors. | Partial preview is labelled partial; exports disabled by default. | Review the reported line(s), fix source, upload again. |
| One-column import | Auto delimiter result has one field only. | Non-blocking warning and delimiter chooser. | Re-run locally with a different delimiter. |
| Large analysis workload | Parse is in progress. | Analysis state prevents duplicate clicks and provides real staged status. | Cancel/reset remains available before completion. |
| Browser memory / unexpected exception | Error boundary or caught analysis exception. | Generic failure statement with no file content echoed. | Reset and retry; guide links to browser support. |
| JavaScript disabled / old browser | React bundle cannot operate. | Static no-script message in HTML. | Enable JavaScript or use a current browser. |
| Static host unavailable | Browser cannot load the app. | Cannot be handled in-app; no sensitive file was uploaded. | CDN/host monitoring outside client scope. |
| Ad blocker / ad network outage | Ad request fails or blocked. | Reserved slot collapses or shows nothing; tool has no dependency. | None required. |

## 5. File limits and performance

The first release adopts a **5 MB hard file limit**. This is a product constraint, not a claim that browser memory ends at 5 MB. It makes predictable performance and recovery possible on ordinary devices. Parsing must be asynchronous where supported and must never save parsed source rows to browser storage. If later product requirements demand larger datasets, move to a documented worker-based pipeline with benchmarked limits rather than silently raising the limit.

## 6. Advertising isolation

Advertising is not added until an approved provider account and policy review are available. The UI uses a clearly marked, reserved `<aside>` region outside the upload target, issue tables, result controls, and download buttons. Provider code must:

1. Load after the core interactive application is usable.
2. Be `async` and fail silently without blocking the React application.
3. Have no access to CSV content, file names, issue samples, or app state.
4. Never be styled to resemble a primary action, export action, result, or file control.
5. Respect consent and privacy requirements applicable to the user’s jurisdiction before it is enabled.

## 7. Quality gate before release

- `pnpm check` and `pnpm build` must pass.
- Deterministic test fixtures must cover commas, semicolons, tabs, quoted commas, quoted newlines, empty input, malformed quotes, duplicate keys, formula-like cells, and PII-like signals.
- Manual browser checks must cover keyboard-only upload, file-drop upload, reset, failed parse, mobile layout, reduced motion, ad-slot absence, and unexpected errors.
- The live application must be inspected at desktop and mobile sizes before a release checkpoint.

## 8. Explicit non-goals for v1

The first release does not read XLSX/ODS, remove PII, guarantee protection from spreadsheet formulas, offer legal compliance, inspect files in the background, store reports, share uploaded data, integrate with external systems, or provide a support chat. These omissions preserve the core privacy and resilience model.
