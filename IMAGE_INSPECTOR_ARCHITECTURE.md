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

An empty, declared-JPEG file was dispatched next through the same drop surface. The following visual check verifies the dedicated empty-file recovery state.

The empty-file check rendered its own recovery message, instructing the user to choose a non-empty image and retaining the no-upload, no-storage, and no-send assurance.

## Cross-tool navigation verification

The primary `CSV preflight` header link from the image workspace transitioned to the CSV workspace at `/` and rendered its file-selection surface. The route changed within the already loaded application rather than leaving the product flow.
