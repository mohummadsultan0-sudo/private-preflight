# GitHub Pages acceptance run

**Target:** `https://mohummadsultan0-sudo.github.io/private-preflight/`  
**Run status:** in progress

| Scenario | Result | Evidence |
| --- | --- | --- |
| Public home load | Pass | The GitHub Pages root rendered its CSV workspace, navigation, local-only disclosure, first-use guidance, and both share controls. |
| Shared-route surface | Pass | The public page exposes the Image Inspector and Privacy routes under `/private-preflight/`. |
| CSV fixture preparation | Pass | A harmless CSV fixture with duplicate rows, formula-like cells, and potential PII-like values was prepared locally. |
| File-control automation | Recovery in progress | The application intentionally renders the file input as visually hidden. The first automation attempt targeted the visible button rather than the hidden input, so no file was selected. The test will expose the existing input temporarily only for automated acceptance upload; this does not alter the deployed source. |
| CSV local analysis | Pass | `risk-and-duplicates.csv` was selected in the public Pages build. It completed with 3 rows, 6 formula-like-cell signals, 1 duplicate group, 2 PII-signal columns, and no parser notices. |
| CSV JSON report download | Pass | `risk-and-duplicates-preflight-report.json` appeared in browser download history with `github.io` as its source. |
| Image Inspector route | Pass | `/private-preflight/image-inspector` rendered the image uploader, local-only disclosure, batch entry point, navigation, and share controls. |
| Image EXIF inspection | Pass | `exif-image-1.jpg` rendered its format, dimensions, EXIF presence, make, model, capture time, and no-location result. The comparison ledger correctly marked EXIF, camera make/model, and capture time as removed in the clean JPEG. |
| Image output controls | Pass | JPEG quality, baseline-mode disclosure, local preview, lens, metadata comparison, JSON/CSV evidence controls, and clean-copy estimate were present in the public build. |
| Image clean-copy download | Pass | The public button generated a clean JPEG and displayed the explicit local-download recovery message. |
| Image JSON and CSV evidence downloads | Pass | Both controls generated their local reports and displayed success feedback in the public GitHub Pages build. |
| Batch queue entry | Pass | The public batch workspace opened and declared its visible limits: up to 8 supported images, 15 MB per image, and 40 MB combined. |
| Batch local reading | Pass | A JPEG with EXIF and a PNG without readable metadata were accepted together. The queue correctly offered one eligible clean copy as `image-01-clean.jpg`, kept the original name out of the ZIP output, exposed output-format and quality controls, and showed reorder/remove controls. |
| Batch combined CSV | Pass | The public control reported a local combined CSV download with one eligible item and 15 selected safe fields. |
| Batch clean ZIP | Pass | The public control completed a local ZIP containing one clean image, paired reports, and a filtered combined CSV; the per-item state changed to **Included in ZIP**. |
| Session queue restoration | Pass | Reloading the published Image Inspector restored both test rows in the same browser tab and displayed `Restored 2 local queue items for this browser tab.` |
| Per-item PNG output | Pass | Switching the eligible JPEG row to PNG removed its JPEG-quality control, changed the ordinal preview to `image-01-clean.png`, and produced a second successful local ZIP with that PNG output. |
| Batch queue clear | Pass | The public **Clear queue** action returned the batch workspace to its empty, ready-to-add state. |

## Cross-cutting verification

| Scenario | Result | Evidence |
| --- | --- | --- |
| Published routing | Pass | Direct page loads succeeded for the root, Image Inspector, and Privacy routes under the `/private-preflight/` base path. |
| Mobile behavior | Pass | Full-page captures at 375 × 812 showed readable single-column layouts and visible primary controls without horizontal overflow on the home, Image Inspector, and Privacy pages. |
| GitHub Pages identity | Pass | The canonical and Open Graph URL resolve to `https://mohummadsultan0-sudo.github.io/private-preflight/`. |
| Manus independence | Pass | Build output checks, loaded resource checks, and user-facing share tests found no `/manus-storage/` or Manus-domain assets in the public application path. |
| Automated regression suite | Pass | `pnpm check`, Vitest (18 tests), and `pnpm build:pages` all passed. The only build note was Vite’s non-blocking warning that the main compressed JavaScript chunk exceeds 500 kB. |

## Acceptance conclusion

No release-blocking defect was found in this acceptance run. The checks used only harmless local fixtures; no user CSV, image, metadata, clipboard content, or account data was inspected.
| Unsupported CSV upload recovery | Pass | A harmless PDF fixture was rejected with a focused **File not opened** card, a clear local-only statement, and visible **Choose compatible file** and **Dismiss** recovery actions. |
| Share fallback | Pass | The public **Share** control changed to **Link copied** and displayed `Link copied — send it wherever you like.` The deployed canonical and Open Graph URLs are `https://mohummadsultan0-sudo.github.io/private-preflight/`; no loaded `src` or `href` referenced Manus. |
| Mobile layout | Pass | At 375 × 812, the home, Image Inspector, and Privacy views showed a single readable column, accessible primary actions, compact navigation, and no visible horizontal overflow. |
| Privacy route and local-processing boundary | Pass | `/private-preflight/privacy` loaded directly and explained the local file path, reset behavior, visit measurement boundary, and advertising boundary. |
| Runtime resource check | Pass | The published Privacy page requested only the GitHub Pages origin plus Google Fonts origins. No product API, file-analysis endpoint, upload endpoint, Manus-hosted asset, or external image host appeared in the browser resource list. |
