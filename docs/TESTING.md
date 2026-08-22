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
5. Browser-extension integration tests using Playwright and isolated loopback
   fixtures.
6. Real-browser manual acceptance at every stage using the hosted fixture index.
7. Optional nondestructive live-bank smoke tests.

These categories remain separately selectable as they are introduced. Normal CI
never depends on live websites.

## Stage 3 commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The Playwright tests launch bundled Chromium with only the production extension
build enabled. They verify the manifest boundary, nested-frame aggregation,
mutation and SPA updates, current-navigation redirect evidence, sanitized
summaries, claimed identity, verified and mismatched domains, benign identity
contexts, and the popup's honest capability state. They do not submit
credentials or test Stage 4 warning behavior.

## Test-download artifact

`pnpm package:test-download` creates `dist/originlens-stage-3.zip` and its
SHA-256 companion file from the production build. The ZIP contains the
`chrome-mv3` directory required by Chrome's **Load unpacked** flow.

`pnpm deploy:test-download` additionally installs the static artifact and the
Nginx vhost on the local host. It exposes the ZIP, checksum, and separately
addressable fixture site at the documented HTTPS URLs. The site root and other
paths return 404. This is a test distribution, not Chrome Web Store publication.

## Fixture safety

Synthetic phishing uses fake credentials. If form submission is ever needed, it
may target only a local server that discards request bodies without logging
them. Tests never submit credentials to a live site, bypass CAPTCHA or access
controls, or retain cookies, tokens, query parameters, screenshots, or personal
information in diagnostics.

The canonical manual Chrome acceptance index is:

`https://fixtures.example.invalid/fixtures/`

Use that hosted address in stage-end acceptance instructions. Manual checks do
not require form submission; synthetic credential controls are non-submitting,
and Nginx accepts only GET and HEAD under `/fixtures/`. Deploy the current
fixture set with `pnpm deploy:test-download` before requesting manual
acceptance.

`pnpm test:fixtures` is an optional developer fallback. It starts a
loopback-only server at `http://127.0.0.1:4173/`, where its POST route consumes
and discards request bodies without logging them. Automated Playwright tests use
their own isolated loopback servers. None of these servers is a product backend,
and localhost is not the canonical manual acceptance address.

Live-bank tests require `RUN_LIVE_BANK_TESTS=1`, conservative navigation, no
form interaction, sanitized output, and documented skips when automation is
blocked. Run them separately with:

```bash
RUN_LIVE_BANK_TESTS=1 pnpm test:banks:live
```

The live configuration uses one worker, disables screenshots, video, and traces,
navigates only to the reviewed official page for each registry record, and never
interacts with a field, form, CAPTCHA, or access control. A navigation block or
timeout becomes a sanitized skip; a mismatch or warning on a loaded verified
bank page fails the regression. Normal CI never opts in.

ML evaluation, if justified, must use temporal and site-family separation and
compare against the deterministic baseline.
