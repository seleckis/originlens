# Store artwork

The canonical brand mark and promotional tile sources are committed under
`assets/brand/` and `docs/store/assets/source/`. Generated PNG assets are
created with `pnpm store:assets` using the bundled Playwright Chromium version.

The screenshots show the actual v0.1.0 extension running against synthetic,
credential-free fixtures. They must be regenerated and reviewed whenever the
relevant interface or brand assets change. Do not add third-party logos, real
credentials, personal data, or claims that OriginLens proves a site is safe.

Expected generated files:

- `generated/promo-440x280.png`
- `generated/screenshots/01-warning.png`
- `generated/screenshots/02-popup-danger.png`
- `generated/screenshots/03-diagnostics.png`
- `generated/screenshots/04-options.png`
