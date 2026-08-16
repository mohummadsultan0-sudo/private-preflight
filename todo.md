# Manual acceptance test matrix

- [x] Prepare deterministic files for valid CSV, semicolon CSV, malformed CSV, empty CSV, duplicate-free CSV, image, PDF, unknown text, and oversized-file handling.
- [x] Verify the valid-file path: upload, overview, structure, formula risk, duplicates, PII, reset, and both local download actions.
- [x] Verify unsupported, empty, malformed, unknown-text, and file-size error paths show comprehensible recovery choices.
- [x] Verify internal navigation, guide pages, responsive mobile layout, and keyboard focus order.
- [x] Record every passed, blocked, and not-applicable scenario; fix defects that prevent reliable use.

## Mobile rejection-flow follow-up

- [x] Prevent long rejected-file names from overflowing or forcing horizontal page scrolling.
- [x] Ensure the mobile rejection card keeps its explanation and both actions visible and easy to tap.
- [x] Test the repaired flow at 320 px, 360 px, 390 px, and 430 px viewport widths.
- [x] Confirm that images remain deliberately unsupported by the CSV tool and that the rejection copy explains the reason.

## Local image inspector

- [x] Define the locally supported image types and explicit EXIF availability limits.
- [x] Build and test local extraction of file facts, dimensions, orientation, and available JPEG EXIF tags.
- [x] Add a separate image-inspection page and route without changing the CSV tool’s file contract.
- [x] Test valid PNG, image without EXIF, corrupt image, oversized image, unsupported format, and mobile layouts.
- [x] Confirm that image-inspector application code makes no file-analysis request: the local inspector uses File, ArrayBuffer, object URLs, and browser image decoding only. General page-visit measurement is disclosed separately and does not receive file bytes, names, metadata, previews, or CSV values.
- [x] Verify navigation from image inspection to CSV preflight and back, using the app’s internal routes.
- [x] Add `/image-inspector` to the static XML sitemap.

## Local EXIF removal

- [x] Define the supported output behavior and limitations for EXIF removal without sending image data to a server.
- [x] Implement a local clean-copy action that preserves the original file and provides an explicit browser download.
- [x] Verify that a JPEG containing EXIF downloads as a new image with no readable EXIF or location metadata.
- [x] Verify non-EXIF images, decoding failures, download failures, mobile controls, and privacy copy.

## Clean-copy formats and privacy summary

- [x] Define JPEG quality, alpha-handling, file-name, and metadata-removal limits for local clean-copy downloads.
- [x] Implement a user-selected clean JPEG or clean PNG download without changing the original file.
- [x] Show a clear before-and-after metadata comparison for the selected clean-copy output.
- [x] Copy a concise local privacy summary to the clipboard with visible success and recovery states.
- [x] Verify JPEG and PNG output downloads, no-EXIF behavior, clipboard handling, metadata comparison, and mobile controls.

## JPEG quality and advanced clean-copy controls

- [x] Define JPEG quality range, estimate behavior, and limitations of decoding/re-encoding ICC profiles and textual comments.
- [x] Implement an interactive JPEG quality slider and local output-size estimate before download.
- [x] Implement advanced ICC-profile and textual-comment options with plain-language, format-aware explanations.
- [x] Verify low- and high-quality JPEG output, estimate updates, advanced-option states, and metadata absence after download.
- [x] Verify mobile controls, unsupported/no-metadata behavior, recovery messages, tests, and production build.

## JPEG preview, local preferences, and XMP

- [x] Define preview scope, preference-storage privacy limits, and XMP detection/removal behavior by image format.
- [x] Implement an on-device visual before/after JPEG preview tied to the active quality setting.
- [x] Persist JPEG quality and advanced cleanup preferences only in browser local storage, with a clear reset path.
- [x] Detect and remove XMP metadata where supported, then show its state in the comparison and privacy summary.
- [x] Verify visual preview refresh, preference restoration/reset, XMP-clean output, mobile controls, tests, and production build.

## JSON report, JPEG mode, and magnified comparison

- [x] Define JSON report fields, browser encoder limits for JPEG mode, and the local-only behavior of the magnifier.
- [x] Implement download of a privacy-safe JSON report without source bytes, raw metadata values, or coordinates.
- [x] Implement an explicit JPEG mode setting with accurate browser-capability explanation and persistence.
- [x] Implement an accessible, local before/after magnifier for clean JPEG previews.
- [x] Verify JSON content and download, JPEG mode messaging, magnifier interaction, saved settings, mobile controls, tests, and production build.

## CSV metadata report

- [x] Define CSV columns, spreadsheet-safe escaping, and the privacy exclusions for metadata report exports.
- [x] Implement a local CSV metadata-report download beside the JSON report.
- [x] Verify CSV headers, rows, quoting, absence of sensitive raw values, spreadsheet import, mobile controls, tests, and production build.

## Batch processing, CSV field filters, and ZIP bundles

- [x] Define supported batch limit, per-file recovery states, CSV field-selection privacy limits, and ZIP bundle contents.
- [x] Implement local multi-image selection, per-image inspection, and clean-copy creation without uploading files.
- [x] Implement selectable CSV metadata fields and a local filtered CSV download.
- [x] Implement local ZIP bundles containing clean copies and JSON/CSV reports for eligible batch items.
- [x] Verify valid and rejected batch items, selected CSV fields, ZIP contents, metadata removal, mobile controls, tests, and production build.

## Per-item outputs, ZIP progress, and combined batch CSV

- [x] Define per-item JPEG/PNG eligibility, progress stages, and privacy-safe combined CSV columns.
- [x] Implement independent JPEG or PNG selection for every eligible batch item.
- [x] Implement accessible per-file ZIP progress states during clean-copy creation and archive finalization.
- [x] Implement a combined, privacy-safe batch CSV report download.
- [x] Verify mixed output contracts, progress completion and recovery paths, combined CSV rows, mobile controls, 14 deterministic tests, TypeScript, and production build.

## Batch field selection, item removal, and JPEG quality

- [x] Define privacy-safe combined CSV field selection, per-item removal behavior, and JPEG quality bounds for batch outputs.
- [x] Implement a combined CSV field picker in the batch interface and preserve those selected fields in the standalone CSV and ZIP report.
- [x] Implement an accessible remove action for each queue item before bundle creation, with queue limits and eligibility recalculated locally.
- [x] Implement an independent 40–95 JPEG quality control per eligible batch item, ignored for PNG output and applied to all matching reports and clean copies.
- [x] Verify field-filtering and per-item quality report contracts, removal-state safeguards, responsive styles, 15 deterministic tests, TypeScript, and production build.

## Batch queue drag-and-drop ordering

- [x] Define local-only drag-and-drop ordering, pointer/keyboard access behavior, and ordering lock during ZIP creation.
- [x] Implement drag handles and drop targets that reorder queue items before conversion without altering files or per-item output choices.
- [x] Verify deterministic ordering logic, reordered ordinal-ID contract, keyboard alternative, mobile layout, 17 tests, TypeScript, and production build.

## Batch move controls, session order, and ZIP numbering preview

- [x] Define visible move controls, session-only order persistence boundaries, and privacy-safe ZIP ordinal preview behavior.
- [x] Implement visible move-up and move-down buttons for every queue item, with disabled boundary and processing states.
- [x] Implement session-scoped queue restoration that keeps local files and their queue settings only in the browser, never in a network, account, analytics event, or server store.
- [x] Show each eligible item’s final `image-##` ZIP output ordinal before bundle creation and refresh it on any reorder or removal.
- [x] Verify move-control and ZIP-plan contracts, session-vault recovery safeguards, mixed eligibility, mobile-safe styles, 18 deterministic tests, TypeScript, and production build.

## Production quality, resilience, and advertising review

- [x] Define user-journey, failure-mode, privacy, accessibility, production, capacity, and advertising acceptance criteria.
- [x] Audit client-side file-processing paths, error boundaries, state restoration, dependency health, deterministic tests, and production build.
- [x] Exercise core CSV and image user journeys, unsupported and boundary files, batch recovery, refresh behavior, keyboard controls, and phone layouts.
- [x] Measure representative deployed static-page responses and document what browser-only processing and autoscaled static hosting can and cannot guarantee under concurrent traffic.
- [x] Document ad placements that remain outside all file-selection, inspection, evidence, download, and error-recovery flows.
- [x] Implement and verify priority fixes: ancillary-only image cleaning, production-only source-location exclusion, route splitting, dependency remediation, and workbench-first hierarchy; publish the readiness report with known limits and follow-up actions.

## Launch, audience, competition, and ad-revenue assessment

- [x] Define the distinction between verified functional readiness, production-risk limits, market demand, differentiation, and commercial viability.
- [x] Reconcile the latest technical audit with the actual published product and state any non-guarantees plainly.
- [x] Research current privacy-first image/CSV tools, AI substitutes, target jobs, and evidence of user demand using primary or authoritative sources.
- [x] Evaluate whether programmatic advertising can be a viable model under realistic traffic and policy constraints, without fabricating revenue projections.
- [x] Deliver an evidence-based launch judgement, positioning, target audience, risks, and a prioritized action plan.

## Privacy-aligned monetization options

- [x] Define commercial options that do not require uploading customer files or profiling file contents.
- [x] Compare privacy fit, buyer, technical complexity, risk, and validation path for each non-advertising revenue model.
- [x] Prioritize a small set of experiments that preserve the free local core and avoid unverified revenue promises.

## GitHub code export and GitHub Pages

- [x] Confirm the GitHub account, the user-approved public repository visibility, Pages URL preference, and compatibility boundaries with the current static project.
- [x] Prepare a GitHub Pages build and deployment workflow without altering the existing Manus deployment.
- [x] Create or connect the repository, push the source code, enable Pages, and verify the Pages URL if account authorization is available.
- [x] Document the repository, Pages URL, and any remaining account or DNS steps.
### GitHub Pages standalone asset verification

- [x] Replace Manus-hosted visual assets with CSS-native brand, seal, and ledger-art components; add a local vector favicon; and verify the GitHub Pages build has no `/manus-storage/` dependencies.

## Launch marketing, sharing, and first-use clarity

- [x] Inspect the available publishing channels and define a responsible, audience-specific launch scope; Instagram requires a separately authenticated account.
- [x] Research high-intent audiences, communities, search topics, and competitive positioning for browser-local CSV and image privacy workflows.
- [x] Add an accessible share control with native mobile sharing, clipboard fallback, a public-link fallback in managed previews, and clear privacy-preserving copy.
- [x] Improve first-use guidance and recovery cues for visitors who have never used a CSV or image metadata tool.
- [x] Validate the revised desktop and mobile experience; 18 deterministic tests, TypeScript, and the production build pass.
- [x] Save and publish the website checkpoint for the sharing and first-use UX release.
- [x] Prepare channel-specific launch messages and a 3:4 launch visual for manual publishing; direct account publishing is deferred because the user cannot sign in.
- [x] Deliver the complete copy-and-publish pack, campaign schedule, and measurement checklist for manual use.

## GitHub Pages as the public share destination

- [x] Audit application, metadata, marketing materials, and public assets for Manus-domain or `/manus-storage/` dependencies in the user-facing GitHub Pages path.
- [x] Point canonical metadata and share-control fallback to the GitHub Pages URL while preserving correct route paths.
- [x] Keep the launch visual as a manual-upload attachment rather than a user-facing Pages dependency, and remove all Manus-hosted references from the manual publishing pack.
- [x] Push the complete updated source to the public GitHub repository, verify the GitHub Actions deployment, and confirm the public shared URL.
- [x] Verify that the available alternate CLI account, `aldar000405-a11y`, does not have write access to `mohummadsultan0-sudo/private-preflight`.
- [x] Avoid the unavailable alternate-account email flow; no password or email verification code was collected.
- [x] Use the already authenticated repository-owner session to approve GitHub device authorization and push the verified update without email verification.

## GitHub Pages end-to-end acceptance sweep

- [x] Prepare harmless local CSV and image fixtures for valid, unsupported, and recovery-path checks.
- [x] Test the public home, CSV preflight, image inspector, privacy page, routes, local report downloads, and share fallback.
- [x] Test image cleanup, metadata reports, and a bounded batch flow without exposing any user data.
- [x] Check responsive phone rendering, keyboard-accessible controls, canonical metadata, and absence of Manus-linked page assets.
- [x] Record results, repair any critical defect, and publish a concise final acceptance report.

## Local image resizing

- [x] Define privacy-preserving resize controls, safe bounds, aspect-ratio behavior, and output semantics for a local clean copy.
- [x] Implement local image resizing for single-image and eligible batch clean-copy paths without uploading source bytes.
- [x] Show selected output dimensions, actual local size comparison, and retain existing clear recovery messages for unsupported or failed conversions.
- [x] Add deterministic resize/report tests; verify single-image 3200×2000 → 1280×800 preview and batch 3000×2000 → 1920×1280 ZIP output; verify phone layout; run TypeScript, 20 deterministic tests, and the GitHub Pages build.
- [x] Publish the update to GitHub Pages and validate that no Manus-hosted dependency is introduced.

## Safe CSV copy, anonymous image names, and orientation correction

- [x] Define privacy-safe contracts for column exclusion, formula neutralization, anonymous image output names, and orientation correction after EXIF removal.
- [x] Implement a browser-only CSV safe-copy workflow that lets users remove selected columns and neutralize formula-like cells before download.
- [x] Implement optional anonymous image output names for single images and ZIP batch items without exposing original names in output paths.
- [x] Implement EXIF orientation correction through the local clean-copy canvas before metadata is removed, with a clear result disclosure.
- [x] Add deterministic tests and verify error recovery, desktop/mobile controls, 24 tests, TypeScript, and the GitHub Pages build.
- [x] Publish and validate the updated GitHub Pages release without adding a server upload or Manus-hosted dependency.
