# Store artwork

The canonical brand mark and promotional tile sources are committed under
`assets/brand/` and `docs/store/assets/source/`. Generated PNG assets are
created with `pnpm store:assets` using the bundled Playwright Chromium version.

The screenshots show the actual v0.1.2 extension running against synthetic,
credential-free fixtures. They remain representative of v0.1.4 because the
interface and brand assets are unchanged. They must be regenerated and reviewed
whenever those surfaces change. Do not add third-party logos, real credentials,
personal data, or claims that OriginLens proves a site is safe.

Expected generated files:

- `generated/promo-440x280.png`
- `generated/screenshots/01-onboarding.png`
- `generated/screenshots/02-warning.png`
- `generated/screenshots/03-popup-danger.png`
- `generated/screenshots/04-diagnostics.png`
- `generated/screenshots/05-options.png`
