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
