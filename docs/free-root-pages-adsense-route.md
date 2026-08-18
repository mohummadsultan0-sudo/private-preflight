# Free GitHub Pages root route for AdSense

The AdSense signup form rejected the project URL `https://mohummadsultan0-sudo.github.io/private-preflight/` because it requested a valid top-level site URL and suggested the account root. With the user’s explicit confirmation, a public repository named `mohummadsultan0-sudo.github.io` was created and a root-path build of Private Preflight was published.

The public root URL `https://mohummadsultan0-sudo.github.io/` and its `/guides` route were verified after the deployment workflow completed successfully. The root build uses root-relative internal routes, root canonical metadata, root sitemap and robots URLs, and does not contain a publisher ID or an enabled advertising slot.

The AdSense signup form was configured with the user-provided payment country, United Arab Emirates, and the preference not to receive customised help. The form’s agreement checkbox and Start using AdSense action remain under the user’s direct control. Returning to the sign-up URL produced a temporary blank/loading state and needs a completed page load before the site field can be replaced by the verified root URL.

The AdSense console later showed the root site with the status `Requires review` and asked for ownership verification. The user selected the Meta tag route and supplied `<meta name="google-adsense-account" content="ca-pub-2346818897162854">`. That tag was added to the root-site build and verified in the public document head. The public root `ads.txt` also contains `google.com, pub-2346818897162854, DIRECT, f08c47fec0942fa0`. Neither change loads an advertising script or activates advertisements.

## References

1. [GitHub Docs: Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
2. [GitHub Docs: About custom domains and GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)
