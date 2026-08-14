# Local Image Inspector — Product Contract

## Purpose

The image inspector is a separate, browser-only workspace inside Private CSV Preflight. It helps a user inspect a local image before sharing it by showing file facts, pixel dimensions, visible orientation, and the EXIF data that can be read safely from supported formats.

## Local-only data path

The browser receives a local `File` only when the user selects or drops it. The app reads the file in tab memory, extracts metadata locally, and creates a temporary object URL only to ask the browser for image dimensions. That URL is revoked after reading. The application does not send the file, metadata, file name, or image preview to an API, account, analytics event, database, or storage service.

## Supported inspection scope

| File type | Local file facts | Dimensions | EXIF treatment |
| --- | --- | --- | --- |
| JPEG / JPG | Yes | Yes | Reads available TIFF/EXIF fields from the JPEG EXIF block. |
| PNG | Yes | Yes | Reads a PNG `eXIf` block when present. Most PNGs will have no EXIF. |
| WebP | Yes | Yes | Reads an `EXIF` RIFF chunk when present. |
| GIF | Yes | Yes | No EXIF read; first-frame dimensions only. |
| HEIC / HEIF, SVG, AVIF, PDF, video, unknown binary | Rejected | Not attempted | Not supported in this release. |

The tool limits image inspection to **15 MB** to keep browser memory use predictable. A corrupt, undecodable, or oversized file is reported with a recovery action rather than producing partial facts.

## Privacy presentation

The inspector reports a **location metadata present** signal rather than showing raw coordinates. It exposes make, model, capture time, orientation, and metadata availability only when the image actually contains a readable tag. No conclusion about privacy, ownership, authenticity, safety, or legal compliance is made from a missing or present field.

## Failure states

The UI must distinguish unsupported type, file too large, local decode failure, malformed metadata, and an image with no EXIF. Every failure states that the file was not uploaded or stored and supplies a path back to choosing a supported image.

## Initial layout verification

The standalone route was rendered at 1280 × 720 and 390 × 844. The desktop layout kept the image workspace and explanatory panel side-by-side. The phone layout collapsed them into a single readable column, retained the 46 px primary image-selection control, and showed no horizontal clipping in the empty state.

## Local image flow verification

A valid 1 × 1 PNG was dispatched through the same drop surface a user uses. The completed view reported `image/png`, 70 B, 1 × 1 pixels, a 1:1 frame, no EXIF, and no location signal. Its no-EXIF state was presented as normal rather than an error, while the page retained its local-only boundary statement.

An unsupported `application/pdf` file was then dispatched through the image drop surface after resetting the PNG result. The PDF check rendered the intended recovery card: it identifies the type as unsupported, lists JPEG, PNG, WebP, and GIF as valid choices, and explicitly says the PDF was not uploaded, stored, or sent. Reset returned the user to the empty selection state.

A declared-PNG file of 15 MiB + 1 byte was subsequently dispatched to exercise the size guard. The next visual check verifies its recovery card.

The size guard rendered the intended recovery card: the explanation limits inspection to 15 MB, asks the user to choose a smaller image, and reiterates that nothing was uploaded, stored, or sent. Reset again restored the empty selection state.

A deliberately truncated PNG with a valid declared type was dispatched next. The tool rejected it in the distinct decode-failure state, explained that the browser could not decode it, advised an intact JPEG, PNG, WebP, or GIF, and again confirmed that no data was uploaded, stored, or sent.

A decodable JPEG fixture with a locally constructed EXIF block then completed successfully through the drop flow. It reported JPEG and `image/jpeg`, 425 B, a 1 × 2 visible frame and 1:2 aspect ratio, EXIF available, orientation `Rotated 90° clockwise`, camera make `Canon`, camera model `ModelX`, capture time `2026:08:14 13:00:00`, and a location-metadata-present signal. The page presented only the signal—not coordinates—and retained the explicit local-only boundary.

## Audit Ledger visual verification

The final desktop review adopts one `Private Preflight` suite hierarchy, with `CSV preflight` and `Image inspector` as explicit modes. Both workspaces now share the same four-stage audit trail, local-only circular seal, margin evidence marks, and charcoal privacy/evidence panel. Green is restricted to small local-processing evidence rather than a broad success surface; the former advertisement placeholder is now a quiet operating disclosure outside the inspection path.

At 390 × 844, the image workspace keeps the seal, four concise horizontal audit steps, a full-width 46 px selection action, the evidence panel, and footer in a single vertical flow with no clipping or horizontal overflow.

After the visual revision, a valid 70 B PNG again completed through the real drop flow. The result surface reported 1 × 1 pixels, 1:1 frame, no EXIF, and no location signal while the audit trail advanced to `Review` and retained the no-data-left-this-tab boundary.

## Local EXIF removal contract

When a JPEG, PNG, or WebP contains readable EXIF metadata, the result surface may offer **Download clean PNG**. The browser decodes the selected local image, redraws its visible pixels on an in-memory canvas, and downloads a newly encoded PNG. The source file is never changed, uploaded, stored, or sent. The clean copy intentionally drops EXIF and other source-file metadata; it also normalizes the visible orientation.

The action is unavailable for GIF files because retaining an animated GIF requires a different, frame-aware encoder. It is also unavailable when no readable EXIF exists, because there is no EXIF block for this release to remove. A conversion failure shows a dedicated recovery message and does not alter the original image. The existing 15 MB input cap remains in force to bound local memory use.

An end-to-end browser test now uses a synthetic but decodable JPEG carrying orientation, make, model, capture-time, and location EXIF signals. It is dispatched through the normal image drop surface; the next visual assertion confirms that the clean-copy control appears.

The JPEG result displayed the expected camera, time, orientation, and location signals along with `Download clean PNG`. Activating the button produced the local-only success message while retaining the original JPEG result unchanged. The next verification inspects the downloaded PNG for the absence of readable EXIF.

The downloaded file was a 1 × 2 RGBA PNG. The application’s own EXIF parser reported `metadataState: none` and `hasLocationMetadata: false` for it. A separate no-EXIF PNG test is in progress to confirm that the clean-copy action stays hidden when no EXIF is available to remove.

The no-EXIF PNG completed with its normal metadata-none presentation and no clean-copy control. The 390 px image workspace remains vertically readable, with the audit trail, selection action, evidence panel, and footer fitting without horizontal overflow.

For the clean-copy failure path, a valid EXIF-bearing JPEG is loaded through the normal drop surface while the canvas PNG encoder is temporarily made unavailable. The next interaction invokes the visible clean-copy action and checks that the original inspection remains visible with a recovery message.

The simulated encoder failure showed `The browser could not encode the clean PNG copy.` inside the clean-copy panel. The original JPEG findings and download action remained available, and no source image mutation occurred.

The release check passed 10 deterministic tests (CSV and image logic), TypeScript validation, and the production build. The Image Inspector’s final workbench now places the active Add / Inspect / Review / Decide flow ahead of the editorial framing while preserving the `Private Preflight` suite hierarchy. The clean-copy card is shown only when a non-GIF image has EXIF to remove; GIF files remain inspection-only in this release.

## Clean-copy formats, comparison, and shareable summary

The user may choose **Clean JPEG** or **Clean PNG** before downloading. Both outputs are re-encoded in browser memory from the visible decoded pixels, remove the source EXIF block and associated source-file metadata, and never modify the original. JPEG uses browser canvas quality `0.90` to prioritize a smaller file; because JPEG has no alpha channel, transparent source pixels are flattened against white. PNG remains lossless for visible pixels and retains transparency when the browser supports it. Output names end in `-clean.jpg` or `-clean.png`.

The result presents a compact before/after ledger that compares the detected EXIF block, camera make, camera model, capture time, and location signal against the selected clean-copy output. For each detected source field, the output state is **Removed**; fields that were absent remain **Not recorded**. This is a metadata comparison, not a claim about visual content, embedded watermarks, or all possible non-EXIF data.

The **Copy privacy summary** control writes a concise, human-readable statement to the clipboard. The text identifies the local-only inspection path, EXIF and location status, and selected output format, but intentionally excludes the original filename, camera values, coordinates, and image bytes. If browser clipboard access is unavailable or rejected, a visible recovery message instructs the user to copy manually from the on-screen summary.

An end-to-end test now loads a decodable JPEG with orientation, camera, capture-time, and location EXIF fields through the ordinary drop surface. The next visual check verifies the before/after ledger, default JPEG choice, alternative PNG choice, and the local privacy-summary control.

The JPEG result showed each detected source field alongside its clean-JPEG state: EXIF, camera make/model, capture time, and location were marked **Removed**, while orientation was marked **Normalized**. The default JPEG control reported its quality-90 sizing intent and a successful local download. The original inspection remained visible after download.

Changing the selected format updated the comparison header, call-to-action, and privacy-summary wording to **PNG**. The PNG choice then completed a local download with the matching success state, confirming that the selected output governs the generated file rather than merely changing its label.

The Copy privacy summary action completed with a visible success acknowledgement. The on-screen summary contains only local-processing and metadata-status statements, not the source filename, image bytes, camera values, or coordinates. At 390 px, the image workspace remains a single vertical flow with a full-width selection action and no page-level horizontal overflow; comparison rows are contained in their own mobile-safe scroll region when present.

Both selected outputs were verified after download. The clean JPEG was a 1 × 2 baseline JPEG with its `-clean.jpg` name, and the clean PNG was a 1 × 2 RGBA PNG with its `-clean.png` name. The application’s EXIF parser returned `metadataState: none` and `hasLocationMetadata: false` for each output. The privacy-summary button produced its copied confirmation, while the production test suite, TypeScript validation, and production build all passed.

The final visual refinement compresses the page heading, gives the workbench the first visual read, transforms the evidence panel into a warm-paper evidence insert, and repeats thin evidence marks and the local inspection stamp throughout the surface.

## JPEG quality, size estimate, and advanced ancillary cleanup

The clean JPEG control exposes a **40–95** quality slider, defaulting to **90**. The value is passed directly to browser canvas encoding; lower values usually reduce file size but may introduce visible compression artifacts. The tool generates a local preview encode after a brief input pause and reports its resulting byte size as an **estimate**, since the final encode can differ slightly between browser implementations. PNG remains lossless and reports its locally generated size estimate without a quality control.

The inspector detects a JPEG ICC colour profile and JPEG comment segments, plus PNG ICC and textual chunks where present. Every clean PNG discards those ancillary fields because it is re-encoded from pixels. Clean JPEG explicitly strips ICC and JPEG comment segments from the generated container, even when a browser encoder initially retains them. The comparison ledger states whether each detected field is removed or absent. These options address container metadata only and do not remove visible watermarks, text baked into pixels, or non-supported metadata containers.

An end-to-end fixture containing EXIF, an ICC profile segment, and a textual JPEG comment has been dispatched through the normal drop surface. The next visible assertion checks detection of every field, the default quality setting, and the local pre-download estimate.

The result detected EXIF, location, ICC, and text-comment signals. Its comparison marks all of them for removal, shows the default JPEG quality of 90, and reports an estimated 850 B clean JPEG before download. The advanced disclosure explains the role of each ancillary field and the limit of pixel re-encoding.

Changing the interactive JPEG slider updated the quality to 68 and recalculated the local estimate to 819 B. The privacy summary updated to the same selected quality, and the subsequent download reported success. The next check inspects the downloaded JPEG for removed EXIF, ICC, and comment segments.

The initial structural check revealed that the browser JPEG encoder had retained an ICC segment, so the clean-copy engine now strips ICC and JPEG comment segments explicitly from the generated JPEG container. The revised estimate for the same quality-68 output is 345 B, and a newly downloaded copy is ready for structural verification.

The structural verification passed for the revised 345 B, 64 × 96 JPEG: the application parser reported no EXIF, no ICC profile, and no textual comment segment. The phone and desktop empty-state layouts remained vertically balanced after the controls were added; the rich controls appear only after a local image is inspected.

## Visual JPEG preview, browser preferences, and XMP

For a selected JPEG, the clean-copy control renders two small local previews: the decoded source and the JPEG encoded at the active quality. The preview is a decision aid, not an authoritative colour-management or pixel-for-pixel proof. It is recreated after the quality control pauses briefly, uses browser object URLs, and is revoked on replacement or component disposal. PNG does not show a lossy-quality comparison because it has no JPEG quality setting.

Only non-sensitive settings are stored in browser `localStorage`: JPEG quality and whether the advanced cleanup disclosure is open. No file name, image bytes, preview, EXIF value, ICC profile, comment, XMP block, or inspection result is stored. A `Reset saved settings` action clears those preferences and returns the quality to 90 and the advanced disclosure to its collapsed state.

XMP is detected in JPEG APP1 XMP packets, PNG XMP textual chunks, and WebP XMP chunks. PNG and WebP clean outputs discard it through re-encoding; clean JPEG removes XMP APP1 packets explicitly alongside EXIF, ICC, and comments. The comparison ledger and privacy summary report XMP as **Removed** when present. The tool does not interpret XMP contents or claim to identify every proprietary metadata carrier.

An EXIF-bearing JPEG with an APP1 XMP packet was dispatched through the real image drop path. The browser preference record contained only the default quality `90` and `advancedOpen: false`, confirming that no image or metadata payload was persisted before the visual review.

The completed result detected XMP, marked it for removal in the comparison, and included its state in the privacy summary. It rendered both local previews side-by-side at quality 90 and estimated 376 B. Moving the real range control changed the active quality to 68, regenerated the clean preview, updated the estimate to 345 B, and updated the privacy summary to the same setting.

After that change, browser storage held exactly `{ "quality": 68, "advancedOpen": false }`. Reopening the route cleared the inspected image and both previews while retaining that small preference record, as intended.

Loading a new local XMP-bearing JPEG after reopening restored quality 68 automatically. The result again showed the original/clean quality previews, an XMP removal row, a 352 B local estimate, and no carried-over source image from the earlier inspection.

The first automated interaction with the reset control did not alter the stored quality value, so the reset event requires a direct retry and state check before this scenario can be marked passed.

Direct activation of the reset action restored quality 90 and the storage record `{ "quality": 90, "advancedOpen": false }`. A subsequent clean JPEG download from the XMP-bearing input completed successfully with a 366 B local estimate; the next structural check verifies removal from the output container.

The structural check passed for the 366 B, 80 × 40 clean JPEG: the application parser reported no EXIF, ICC, comments, or XMP. The complete suite now passes 11 deterministic tests, TypeScript validation, and the production build. Empty-state screenshots at 1280 px and 390 px confirm the unchanged workbench remains balanced with no horizontal clipping; the active result’s preview controls are intentionally created only after local inspection.

## Local JSON evidence report, JPEG scan mode, and magnifier

The optional JSON download contains an event timestamp, non-sensitive file facts (format, MIME type, dimensions, byte-size category), metadata **presence states**, selected output quality, browser-encoder mode, output-size estimate, and the tool’s local-processing boundary. It intentionally excludes the source filename, image bytes, preview URLs, raw EXIF field values, XMP contents, camera make/model, capture time, coordinates, and any user identifier.

## Local CSV metadata report

The CSV download uses the columns `section`, `field`, `value`, and `clean_copy_effect`. It represents only non-sensitive file facts, metadata **presence** signals, local clean-copy settings, and privacy boundaries. Every cell is RFC-style quoted when necessary; values that could be interpreted as spreadsheet formulas are prefixed with an apostrophe before CSV escaping. The report intentionally excludes the source filename, image bytes, preview URLs, raw EXIF/XMP content, camera fields, capture time, coordinates, user identifiers, and any raw file-size value; it uses only a size category.

## Batch processing, selected CSV fields, and ZIP bundles

The batch workspace accepts at most **8** supported images at once, with the existing **15 MB per-file** limit and a **40 MB combined** input limit. Each selection is inspected in browser memory in sequence. A rejected, oversized, or undecodable item is recorded with its own explanation and does not prevent the remaining eligible items from being reviewed or cleaned. Original inputs are not changed, uploaded, cached, or included in a bundle.

The CSV chooser permits only pre-defined, privacy-safe signal fields: format, MIME type, dimensions, megapixels, size category, EXIF availability, location signal, ICC signal, text-comment signal, XMP signal, chosen output format, JPEG quality, and clean-copy effect. Source name, raw field values, image bytes, preview URLs, coordinates, and user identifiers cannot be selected. At least one safe field must remain selected before export.

For eligible JPEG, PNG, and WebP items with metadata to remove, the ZIP action creates each selected clean copy plus one corresponding JSON and CSV report inside a single browser-generated `private-preflight-image-bundle.zip`. It excludes originals, rejected items, raw metadata, and source names from report contents. GIF entries remain inspection-only and rejected/unsupported entries remain outside the bundle. If memory, encoding, or ZIP creation fails, the UI preserves the item list and gives a recovery action; no partial bundle is downloaded.

The batch workspace renders from the empty image-inspection state with a clear local queue entry point, its 8-image and 40 MB limits, and an explicit multi-file chooser. The expanded state exposes the local add surface without altering the individual image inspection path.

A real local drop containing two decodable EXIF-bearing JPEGs and one PDF completed with two rows marked ready for clean copies, one PDF row marked rejected with its own supported-type explanation, and an enabled ZIP action for the eligible images. The rejected item did not prevent the remaining entries from proceeding.

The ZIP action completed with a local success acknowledgement. Its listing contained two clean JPEGs, two JSON reports, two CSV reports, a README, and the `clean/` and `reports/` organization folders. It contained neither the original names nor the rejected PDF. The checked CSV inside the ZIP had the expected safe header and signal rows.

A separate local JPEG inspection exposed the individual CSV field picker with 15 pre-defined, safe report fields. The next interaction reduces that list before download to verify that only explicitly selected fields are emitted.

The chooser was reduced to `format`, `mime type`, and `exif`; the visible summary changed to three selected fields and the CSV download stayed enabled. The next step downloads this filtered report for row-level verification.

The filtered download contained the header plus only the `format`, `mime_type`, and `exif` rows—no unselected rows and no source name or raw values. The batch entry point was rendered at 1280 px and 390 px: desktop retains the workbench and a concise batch card, while phone collapses the batch call-to-action to a readable full-width control without horizontal clipping. The complete suite passes 13 deterministic tests, TypeScript validation, and the production build.

## Per-item batch formats, progress, and combined CSV

Every eligible batch item defaults to **JPEG** and may be switched independently to **PNG** before ZIP creation. The choice applies only to that item: JPEG produces a white-backed, quality-90 clean JPEG; PNG produces a transparent-capable lossless clean PNG. GIF and entries without readable metadata remain ineligible for clean-copy conversion and have no format selector.

ZIP creation reports a local `Preparing`, `Cleaning`, `Writing reports`, or `Complete` status for each eligible item, along with a bounded percentage calculated from completed image/report work and archive finalization. A failed item records its recovery explanation, while the remaining items continue. The whole ZIP is withheld if no clean outputs are produced.

The optional combined CSV is one UTF-8-with-BOM spreadsheet file with an `item_id` column and the same safe fields used by individual reports. Its item IDs are ordinal identifiers, not source file names. It excludes original names, raw bytes, preview URLs, raw EXIF/XMP values, camera values, capture time, coordinates, and user identifiers.

## Batch field selection, removal, and per-item JPEG quality

The batch interface exposes the same predefined, privacy-safe field list for its **combined CSV**. All safe fields are selected initially; users may choose a narrower set, but the interface prevents a zero-field export. That selection controls the standalone combined download and the `reports/batch-metadata.csv` file inside the ZIP. It never enables source names, raw file sizes, image bytes, previews, EXIF/XMP contents, camera values, capture time, coordinates, or identifiers.

Every queue row has an accessible remove action until bundle creation begins. Removing an item removes only its local in-memory queue reference; it does not delete or modify the source file. The item count, combined-byte limit, eligible count, ordinal bundle IDs, progress total, and combined report rows are recalculated from the remaining queue. All queue controls are locked while ZIP creation is active.

Each eligible JPEG selection has an independent quality range of **40–95**, defaulting to **90**. The quality is used for that item's clean JPEG encoding and its JSON, individual CSV, and combined CSV evidence rows. Switching an item to PNG hides and disables its JPEG-quality control; PNG remains lossless for visible pixels and its report records no JPEG quality. Quality choices are held only in component memory for the active queue and are not saved to browser preferences.

## Local queue ordering

Before ZIP creation, any batch row may be moved with its visible drag handle and dropped before another row. The move changes only the local array that represents the queue; it does not copy, upload, rename, modify, or delete any source file. A row retains its inspection result, selected output format, JPEG quality, and recovery state when moved.

The active order determines the visible row numbers, the ordinal `image-01` identifiers assigned to eligible clean copies and combined CSV rows, and the sequence used during ZIP creation. Rejected rows remain visible and may be reordered, but never enter a clean-copy bundle. Dragging is disabled while files are still being read and throughout ZIP creation to keep progress totals and bundle IDs stable.

The handle exposes keyboard reordering with **Alt + Arrow Up** and **Alt + Arrow Down** when the queue is idle. A concise live status names the new position after a keyboard or pointer move. The interface does not require a drag-only interaction: deletion, output choices, quality settings, and the existing file chooser remain independently reachable by keyboard and touch.

## Session queue restoration and ZIP output preview

The batch workspace adds visible **Move up** and **Move down** controls to every row. The first item cannot move up and the final item cannot move down; all move controls are disabled while an image is being read or a ZIP is being created. They call the same local reorder operation as drag-and-drop, preserving all per-item settings.

To honour a browser refresh without introducing a server data path, the active queue is cached only in the browser’s local **session vault**: a tab-scoped session identifier in `sessionStorage` points to an IndexedDB record containing the selected local files and their queue state. The cache is available again after a refresh in the same tab, cannot be restored by a different browser session, and is never uploaded or read by an API. The **Clear queue** action deletes the current tab’s local vault record. If local browser storage is unavailable or full, the queue remains usable in the current page and the UI gives a recovery message instead of claiming persistence.

Before any bundle is created, each eligible row displays its deterministic clean-output name, such as `image-01-clean.jpg` or `image-02-clean.png`. These ordinals are recalculated on every reorder, removal, or eligibility change and match the names written to `clean/` in the final ZIP. Ineligible rows are explicitly marked **No clean ZIP output** and receive no ordinal. Source file names never appear in ZIP paths or combined-report IDs.

A local EXIF-bearing 64 × 32 JPEG has completed through the normal drop path. The `Download CSV report` action is present in the resulting local evidence area, ready for file-level verification.

The spreadsheet evidence panel rendered beside the JSON report with its explicit exclusions. The CSV download completed locally and displayed a confirmation message; the next check validates its headers, rows, spreadsheet-safe formatting, and privacy exclusions.

The downloaded UTF-8-with-BOM CSV contained the expected `section,field,value,clean_copy_effect` header and rows for safe source facts, metadata presence signals, clean-copy settings, and privacy exclusions. It excluded the source name, raw image data, camera values, preview URLs, and coordinate values. The application tests, TypeScript check, and production build passed after the CSV export was added.

The browser canvas encoder used by this static release exposes JPEG quality but does not expose a reliable Progressive/Baseline switch. The settings surface therefore shows **Baseline-compatible browser output** as the active local mode and identifies **Progressive JPEG** as unavailable in this browser-only build rather than claiming a setting that cannot be honored. This choice is saved with the existing local preferences; it carries no image data.

The JPEG comparison offers a pointer- and keyboard-accessible magnifier that enlarges one preview at a time. It uses the locally generated object URLs already needed for preview and does not transmit, persist, or analyse pixels beyond browser decoding/encoding. The magnifier is a visual aid and does not certify perceptual equivalence.

A local 120 × 80 JPEG with a minimal EXIF segment has been dispatched through the normal drop surface. Its active JPEG quality is 90, and the next visual check verifies the browser-mode disclosure, local magnifier, and JSON-report action.

The completed view showed the baseline-compatible browser-output mode and its explicit Progressive limitation, plus the local original/clean previews and interactive 3× lens. The JSON report action completed with an on-screen confirmation. The next checks inspect the downloaded JSON for its privacy boundary and exercise the lens controls.

The downloaded JSON contained only its documented schema, local-processing state, non-sensitive source facts, metadata presence signals, output selection, size category, and privacy exclusions. It did not include the source name, values, pixels, preview URLs, or coordinates. Switching the lens to the original preview updated the visible detail source; an actual keyboard event is still required to complete the arrow-key path assertion.

After focusing the detail stage, a real ArrowRight event moved the lens from its centered position while keeping the original-detail preview active. This confirms the promised pointer/keyboard interaction path without changing the selected output settings or transmitting pixels.

The final release verification confirms the local JSON report downloaded with the intended privacy-safe fields, the baseline-compatible mode disclosure was explicit, and the lens supported source switching and arrow-key movement. The full production test suite passes 11 deterministic tests, TypeScript validation, and the production build. Empty-state screenshots at 1280 px and 390 px show no horizontal clipping; active controls remain scoped to an inspected local image.

An empty, declared-JPEG file was dispatched next through the same drop surface. The following visual check verifies the dedicated empty-file recovery state.

The empty-file check rendered its own recovery message, instructing the user to choose a non-empty image and retaining the no-upload, no-storage, and no-send assurance.

## Cross-tool navigation verification

The primary `CSV preflight` header link from the image workspace transitioned to the CSV workspace at `/` and rendered its file-selection surface. The route changed within the already loaded application rather than leaving the product flow.
