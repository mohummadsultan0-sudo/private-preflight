# Private Preflight

Private Preflight is a browser-only inspection tool for CSV files and image metadata. Selected files are processed in the browser; the app is not a compliance, safety, or security guarantee.

## Run locally

```bash
pnpm install
pnpm dev
```

## Quality checks

```bash
pnpm check
pnpm exec vitest run
pnpm build
```

## GitHub Pages

The `main` branch runs `.github/workflows/deploy-pages.yml`. The workflow builds the static client with the `/private-preflight/` base path and publishes `dist/public` to GitHub Pages. `404.html` mirrors `index.html` so direct links to the browser routes remain available.

The source is published in the public repository [mohummadsultan0-sudo/private-preflight](https://github.com/mohummadsultan0-sudo/private-preflight). The deployed Pages address is:

```text
https://mohummadsultan0-sudo.github.io/private-preflight/
```

The Pages build is self-contained: the brand mark, local-only seal, ledger artwork, and favicon are all CSS/SVG-native application assets, so the published site does not depend on `/manus-storage/`.

## License

MIT
