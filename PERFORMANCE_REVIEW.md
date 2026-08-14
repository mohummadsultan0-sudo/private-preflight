# Production Readiness Review — 2026-08-14

## Architecture finding

Private CSV Preflight is a browser-only CSV analysis tool. It has **no application backend for CSV processing**, no database, no file storage service, and no user-upload endpoint. The production host serves HTML, JavaScript, CSS, and assets. Each visitor’s selected CSV is parsed in that visitor’s browser memory.

This is operationally important: a surge of local CSV inspections does **not** create an equivalent surge of file-processing load on the hosting service. The shared host is responsible for delivering the application; the visitor’s own browser performs parsing, duplicate detection, formula-risk checks, and local downloads.

## Measured production sample

The measurements below were made against `https://csvcheck-fj8jo5gq.manus.space` from the project environment. They are small diagnostic samples, not a certified load test or service-level guarantee.

| Check | Result | Interpretation |
| --- | ---: | --- |
| Homepage response, 5 warm samples | HTTP 200 on all samples; TTFB 2.43–3.40 s; total 3.33–4.29 s | The application is reachable, but first-page response is not yet fast enough to claim a premium production speed target. |
| Four production routes | HTTP 200 on `/`, `/csv-validator`, `/csv-formula-injection-scanner`, and `/privacy` | Server routing works in production. |
| Controlled burst | 20/20 HTTP 200; 5-way concurrency; average TTFB 2.58 s; average total 3.44 s | It demonstrates basic stability only at a very small, deliberately conservative level. |
| Published HTML | `cache-control: no-cache, no-store, must-revalidate` | The HTML is revalidated per visit; this contributes to repeat navigation cost when a browser performs a full page load. |
| Published versioned CSS/JS | `cache-control: max-age=7776000` | The large versioned assets can be cached after the initial visit. |
| Current bundle | JavaScript 667,499 B raw / 179.63 kB gzip; CSS 132,095 B raw / 22.48 kB gzip | The JavaScript is acceptable for a tool but should be reduced before paid traffic or a major launch. |

## Navigation correction

Internal guide, privacy, footer, and brand links were converted from document anchors to client-router links. After the application is loaded, moving between these routes should use the already loaded interface rather than re-download the HTML and application bundle.

The Formula risk guide transition was then exercised in the browser preview. The URL changed from `/` to `/csv-formula-injection-scanner` and the guide rendered successfully inside the existing application session.

## Hosting capacity: what can and cannot be concluded

Manus Autoscale hosting is documented as Google Cloud Run with 1 vCPU and 512 MB per instance, scaling from 0 to 5 instances. It is intended for bursty request/response apps. The documentation does **not** publish a per-project concurrent-request or 1,000-user guarantee. Therefore this review cannot truthfully certify that the current deployment handles 1,000 simultaneous first-time requests.

The only supported conclusion is:

> The current app is structurally better suited than a server-side CSV processor for traffic bursts because file analysis happens in every visitor’s browser. However, the initial page request still depends on a deployment limited to Autoscale’s documented 0–5 instances, and the measured response timings do not establish 1,000-concurrent-user capacity.

Reserved hosting is not an automatic answer for this static tool: the official documentation describes it as one persistent instance, and notes that a single instance can slow under heavy traffic.

## Recommended release gate for a 1,000-user event

Before committing to a campaign or traffic source that can create 1,000 simultaneous visitors, run an authorized, staged load test against a production-like environment, starting at 25, 50, 100, and then higher concurrent requests. Define a target for p95 TTFB, error rate, and page load, and obtain a confirmed platform capacity statement for the selected hosting configuration. Do not run an unbounded 1,000-request test on the live public domain.

Priority technical improvements are client-code splitting, removal of unused template dependencies, and a review of HTML edge-caching policy. If the launch requires an enforceable concurrency guarantee, request the hosting specification directly from the platform support team before spending on traffic.

## References

[1] Manus, [Publishing — Hosting Modes](https://manus.im/docs/website-builder/publishing).

[2] Manus, [Introducing Hosting Modes: Match Your Server to Your Project](https://manus.im/blog/manus-hosting-web-builder).
