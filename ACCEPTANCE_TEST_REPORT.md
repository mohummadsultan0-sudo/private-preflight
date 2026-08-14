# Manual Acceptance Test Report

**Test date:** 2026-08-14  
**Method:** Browser-driven acceptance testing of the local development preview, with synthetic local files and browser drag-and-drop events. The report distinguishes observed behavior from source-level checks.

## Scope

The test covers the user-facing local CSV flow, expected recovery paths, client navigation, responsive layout, and the promise that rejected files are not analysed. It does not certify every browser, assistive technology, ad network, hosting failure, or high-concurrency condition.

## Scenario ledger

| ID | Scenario | Expected result | Observed result | Status |
| --- | --- | --- | --- | --- |
| A1 | Valid CSV with duplicates, formula-like cell, and PII-like fields | Results show all relevant findings | Four rows; zero structure notices; four formula-like locations; one duplicate group; two PII-signal columns | Pass |
| A2 | Semicolon CSV | Delimiter detected as semicolon | Two rows, three fields, semicolon delimiter, no notices | Pass |
| A3 | Duplicate-free CSV | Duplicate panel shows a clear state | Semicolon fixture showed zero duplicate groups with a clear zero state | Pass |
| A4 | Malformed quote | Partial results carry a visible parser error | Overview shows one parser/structure notice, reduced row count, and lower readiness score | Pass |
| A5 | Empty CSV | File is rejected with recovery action | “This file is empty” shown with Reset workspace; no analysis | Pass |
| A6 | Image / PDF | File is rejected in the upload panel; no analysis | Image rejection verified; PDF shares the same direct-rejection branch by type | Pass (image observed; PDF branch source-equivalent) |
| A7 | Unknown text extension | User sees an explicit inspect-or-cancel decision | Explicit Cancel and Inspect local text choices appear before any read | Pass |
| A8 | Oversized file | File is rejected before parsing | 5 MB + 1 byte file rejected with clear size limit and Reset workspace | Pass |
| A9 | Report and changed-copy download choices | Downloads require user action; original remains unchanged | JSON and changed CSV downloads verified; original not altered by in-app flow | Pass |
| A10 | Internal pages and phone layout | Routes work and layout remains usable | Root and Privacy routes rendered; mobile review completed; keyboard focus begins visibly | Pass (basic coverage) |

## Test notes

The browser opened the root tool page and a local drag-and-drop event was dispatched with `acceptance-valid.csv`. The synthetic file contains four data rows, one whole-row duplicate, email and phone-like fields, and one `=`-prefixed note. The first rendered observation showed the expected four rows, four formula-like signals, one duplicate group, and two PII-signal columns. It also showed an inconsistent-column warning because the acceptance fixture’s formula cell had a comma but was not CSV-quoted. This was a fixture/demo defect, not a parser failure; it was corrected before continuing the happy-path test.

The root page was reloaded and the corrected CSV, with its formula cell quoted according to CSV escaping rules, was dispatched for the second happy-path observation.

The corrected result showed four rows, five headers, zero parser/structure notices, four potential formula cells, one duplicate group, and two PII-signal columns. The Formula risk tab listed three `+`-prefixed phone fields and the `=`-prefixed notes field, described the false-positive possibility, and required a separate “Review export” action before any changed copy could be downloaded.

The Duplicates tab initially found the expected whole-row group at rows 2 and 4. Selecting `customer_id` updated the comparison label to that single field while preserving the expected duplicate group. Both the initial state and the changed comparison rule were visible and understandable.

The PII signals tab displayed only column numbers, headers, signal kinds, and match counts: four email-like values and three phone-like values. It intentionally did not render source values. Returning to Formula risk preserved the expected locations and the separate export review action.

Opening “Review export” presented a modal that named the four affected cells, explained that a leading tab would be added, and stated that the original file was unchanged. Choosing “Keep original only” closed the modal without triggering a download or changing the displayed analysis.

The modal was reopened and “Download changed copy” was activated. The dialog then closed and the analysis remained in place, matching the intended behavior of producing a separate local copy only after confirmation.

The browser created `acceptance-valid-spreadsheet-safe.csv`. A byte-level inspection confirmed that the comma-containing, quote-containing formula cell was enclosed in CSV quotes and that internal quotes were escaped. A regression test now reparses this export to preserve that guarantee.

The “Report” action created `acceptance-valid-preflight-report.json`. Its contents contained the expected metadata, aggregate counts, row locations, headers, and trigger characters, but no raw CSV cell values. Selecting “Start over” then removed the result view and restored the empty upload surface.

An empty `empty.csv` was then dropped into the upload surface. The page displayed “This file is empty. Choose a CSV with a header row and data,” stated that the file was not uploaded, and offered Reset workspace. No analysis result was shown.

After resetting the empty-file error, a browser drag-and-drop event was dispatched with an `image/png` file named `vacation.png`. The following observation verifies that the rejected-file state is presented inside the upload surface.

The upload surface immediately replaced its normal prompt with “`vacation.png` is not a CSV text file.” It explicitly said that no image content was uploaded, opened, or analysed, and provided compatible-file and dismiss actions in the same visible area. Dismiss returned the user to a clean upload surface.

A local text file named `unknown-data.dat` then triggered an in-place decision card before analysis. The wording correctly explained that the browser would only attempt a local text read and offered Cancel or Inspect local text.

After selecting Inspect local text, the application detected the pipe delimiter, showed one data row and three fields, and retained the `.dat` filename. This confirms that the user decision is required before analysis. Start over then restored the empty upload surface.

A `malformed.csv` file with an unclosed quote produced a reduced one-row result, a readiness score of 68, and a visible Structure badge of 1 rather than presenting the parse as clean.

The Structure tab named the error “unclosed quote,” located it near row 2, and stated that the result may be partial. Start over restored the empty upload surface.

A CSV one byte larger than the 5 MB limit was rejected before analysis. The page stated the local limit, confirmed that no file was uploaded, and supplied Reset workspace.

After resetting, a small `application/octet-stream` file containing a null byte was dropped with an unknown `.bin` extension. The next observation checks the decision card and then verifies the binary-content rejection after explicit confirmation.

The `.bin` file showed the same inspect-or-cancel decision. After selecting Inspect local text, the application rejected it with “This file contains binary-like characters and cannot be safely interpreted as CSV text,” confirmed that it was not uploaded, and offered Reset workspace. This verifies content-level rejection beyond the filename and type decision.

Mobile screenshots of the root tool and Privacy page at 390 × 844 showed a readable single-column layout, a full-width primary action, and a visible return action on the guide page. Keyboard testing on the desktop preview began with Tab focus visible on the brand-home link.

The active element after the first Tab was confirmed as the Private CSV Preflight home link. A semicolon-delimited local file was then dispatched for direct user-interface verification of delimiter detection.

The semicolon test completed with a Semicolon separated label, two data rows, three headers, zero structure notices, zero duplicate groups, and a 100 readiness score.

After Start over, the header Privacy link opened the Privacy route with a visible Return to preflight action. The page had clear content and footer navigation, with no route dead end observed.

The built-in “Try a safe demo” path was re-tested after correcting the demo’s CSV escaping. It produced four rows, zero structure notices, four formula-risk signals, one duplicate group, and two PII-signal columns. This resolved the only defect found during the acceptance pass: an earlier unquoted comma inside the demo formula field caused an unintended structural warning.

## Final quality gate

The deterministic CSV test suite passed **6/6** tests, including the regression test for a changed formula cell containing commas and quotes. TypeScript validation passed, and the production build completed successfully. The build continues to emit a JavaScript chunk-size warning; it is a performance improvement opportunity, not a failed acceptance scenario.

## Outcome

All ten scoped scenarios passed after the demo-data correction. This acceptance pass does not certify untested browser versions, arbitrary assistive technologies, real advertising-provider behavior, host outages, or high-concurrency capacity. Those remain explicitly outside this manual local-tool acceptance scope.
