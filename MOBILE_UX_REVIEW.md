# Mobile Rejection-Flow Review

## User-reported observation

The supplied Samsung Internet screenshot showed two concrete problems in the rejected-image state: a long, numeric camera filename extended beyond the decision card, and the browser presented the application in a darkened rendering that changed the intended contrast and visual hierarchy.

## Correction applied

The rejection card now uses an independent content container with `min-width: 0`, safe word breaking, and an explicit block-level filename treatment on small screens. The mobile decision layout has reduced its horizontal padding, removed its unnecessary minimum height, and keeps its primary and dismiss actions full-width with a 46 px minimum height. The workspace also declares a light color scheme through document metadata and CSS so mobile browsers have an explicit rendering preference rather than inferring a dark conversion.

## Image support boundary

PNG, JPEG/JPG, GIF, WebP, HEIC, and other image formats remain intentionally unsupported in this product. Private CSV Preflight is a local **tabular-data** inspector; it does not currently offer a meaningful image inspection or editing workflow. Accepting images without useful image-specific analysis would make the product promise unclear. The rejection card now states that images are excluded because this is a CSV-only data inspector, and confirms that no image is uploaded or opened.

## Verification record

The repaired rejection state was rendered at 320 × 760 and 360 × 800 using a 95-character PNG filename. At both widths, the filename wrapped within the card rather than extending horizontally. The 360 px view also retained the decision-card boundary and its explanatory hierarchy without clipped horizontal content. Further width checks continue below.

The 390 × 844 and 430 × 932 views likewise had no horizontal overflow. However, the full 95-character name still consumed several visual lines at these widths, delaying the actions below the fold. The safer final treatment is to preserve the full filename for accessibility/title use while showing a compact visual version inside the card.

After introducing a two-line visual clamp, the 320 × 760 and 390 × 844 views retained the name inside the card with no horizontal overflow. The actions were still below the initial screenshot fold because the remaining card copy was too tall; the final compacting pass therefore separates the user decision from the filename, which becomes a short visual line with the full name retained in accessible metadata.

The compact-card screenshots showed the intended shorter title and one-line filename, but also exposed a possible horizontal viewport shift during automatic focus scrolling. The focus behavior is being changed to vertical-only page scrolling so that a decision card can be surfaced without changing the reader’s horizontal position.

The final decision-card state was opened in the browser after vertical-only scrolling was introduced. The browser reported `scrollX: 0`, with document and viewport widths equal, while the decision surface was brought down from the page top (`scrollY: 106` on the desktop verification). This confirms that the automatic visibility behavior did not introduce horizontal page motion. The development-only preview hook was removed before release.
