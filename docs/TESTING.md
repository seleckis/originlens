# Testing strategy

False positives are first-class security failures. A high-confidence warning on
a verified legitimate bank is release-blocking.

## Test categories

1. Deterministic unit tests for pure analyzers and policy logic.
2. Synthetic benign-page fixtures, including long-tail and internationalized
   sites.
3. Synthetic phishing fixtures using fictional brands such as Northstar Bank.
4. Adversarial mutation fixtures for timing, DOM, script, frame, and behavior
   changes.
5. Browser-extension integration tests using Playwright and local fixtures.
6. Real-browser manual acceptance at every stage.
7. Optional nondestructive live-bank smoke tests.

These categories remain separately selectable as they are introduced. Normal CI
never depends on live websites.

## Stage 2 commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The Playwright test launches bundled Chromium with only the production extension
build enabled, observes the MV3 service worker, and checks the declared content
script boundary and the popup's honest capability state. It does not test
phishing detection.

## Test-download artifact

`pnpm package:test-download` creates `dist/originlens-stage-2.zip` and its
SHA-256 companion file from the production build. The ZIP contains the
`chrome-mv3` directory required by Chrome's **Load unpacked** flow.

`pnpm deploy:test-download` additionally installs the static artifact and the
Nginx vhost on the local host. It exposes only the ZIP and checksum at the
documented HTTPS URLs; all other paths return 404. This is a test distribution,
not Chrome Web Store publication.

## Fixture safety

Synthetic phishing uses fake credentials. If form submission is ever needed, it
may target only a local server that discards request bodies without logging
them. Tests never submit credentials to a live site, bypass CAPTCHA or access
controls, or retain cookies, tokens, query parameters, screenshots, or personal
information in diagnostics.

`pnpm test:fixtures` starts a loopback-only fixture server at
`http://127.0.0.1:4173/`. Its POST route consumes and discards request bodies
without logging them. It is for manual and extension integration checks only; it
is not a product backend.

Live-bank tests will require `RUN_LIVE_BANK_TESTS=1`, conservative navigation,
no form interaction, sanitized output, and documented skips when automation is
blocked. ML evaluation, if justified, must use temporal and site-family
separation and compare against the deterministic baseline.
