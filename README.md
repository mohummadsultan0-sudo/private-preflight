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

The current Pages address is expected to be:

```text
https://aldar000405-a11y.github.io/private-preflight/
```

## License

MIT
