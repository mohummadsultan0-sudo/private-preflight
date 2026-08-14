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
