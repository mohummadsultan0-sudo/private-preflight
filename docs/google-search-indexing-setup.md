# Google Search indexing setup

The root GitHub Pages site exposes `https://mohummadsultan0-sudo.github.io/robots.txt` with `Allow: /` and a root sitemap directive. Its public sitemap is available at `https://mohummadsultan0-sudo.github.io/sitemap.xml` and includes the homepage, Image Inspector, five core field guides, About, Privacy, and Consent routes.

On 2026-08-18, the signed-in Google account opened Google Search Console and added `https://mohummadsultan0-sudo.github.io/` as a URL-prefix property. Search Console requested ownership verification. The recommended option is an HTML file, but the available HTML tag method is more appropriate for the managed GitHub Pages root build and will be used after recording the exact Search Console verification tag.

The HTML verification tag was added to the root build and Search Console confirmed ownership. During public verification, the GitHub Pages API showed that the site was still configured with the legacy branch source even though a custom build workflow existed. The Pages setting was updated to `workflow` and the existing deployment workflow was rerun. The public root now serves both the AdSense and Search Console verification tags, with the same root canonical URL and crawler assets.

The sitemap path `sitemap.xml` was submitted successfully from the verified URL-prefix property. Immediately after submission, Search Console showed the submitted entry but reported `Couldn't fetch` with zero discovered pages. This is an initial retrieval state, not evidence that the public sitemap is unavailable: live public retrieval before submission returned the sitemap and `robots.txt` correctly. Recheck the sitemap report after Google’s crawler has processed the new property, and investigate only if the status persists.

An HTTP check immediately after submission returned `200` with `Content-Type: application/xml` for the public sitemap. Search Console’s URL Inspection field was then opened for the root URL. The page is new, so Search Console data may remain in its initial processing state while the site and sitemap are queued for Google’s crawler.

Submitting a sitemap and requesting indexing signal discovery to Google but do not guarantee immediate or eventual inclusion in search results. See Google’s [Add a website or platform property](https://support.google.com/webmasters/answer/34592?hl=en) and [Ask Google to recrawl your URLs](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) guidance.
