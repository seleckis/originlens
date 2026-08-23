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

## Release-candidate commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm performance:check
pnpm test:e2e
pnpm store:assets
pnpm package:web-store
pnpm store:validate
pnpm verify:reproducible
```

The Playwright tests launch bundled Chromium with only the production extension
build enabled. They verify the manifest boundary, nested-frame aggregation,
mutation and SPA updates, current-navigation redirect evidence, sanitized
summaries, claimed identity, verified and mismatched domains, benign identity
contexts, bounded behavior, every hosted fixture, multilingual warning and
non-warning cases, signed resolver/local comparison, resolver failure, sanitized
exports, explicit three-gate decisions, badge state, warning timing, keyboard
focus, bypass/reset behavior, and false-positive cases for verified and unknown
organizations. They do not submit credentials.

## Test-download artifact

`pnpm package:test-download` creates `dist/originlens-release-candidate.zip`,
its SHA-256 companion file, and a CycloneDX SBOM from the production build. The
ZIP contains the `chrome-mv3` directory required by Chrome's **Load unpacked**
flow and the SBOM.

## Chrome Web Store artifact

`pnpm package:web-store` creates `dist/originlens-0.1.0-chrome-web-store.zip`,
its SHA-256 companion, and an adjacent CycloneDX SBOM. Unlike the test ZIP, the
upload ZIP has `manifest.json` at its root and contains only production
extension files.

`pnpm store:validate` verifies the exact upload layout, Manifest V3 and version,
the reviewed permission set, CSP, icon files and dimensions, store-artwork
dimensions, description length, source-map exclusion, SBOM exclusion, and the
absence of remotely loaded scripts. Reproducibility testing compares both the
manual-test and Web Store artifacts across consecutive builds.

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

### Release-candidate hosted acceptance

After deploying `originlens-release-candidate.zip`, load its extracted
`chrome-mv3` directory in Chrome and use only the hosted fixture index above:

1. **Claimed bank identity on a mismatched domain** must display the modal
   **Possible phishing page** before manual field entry. It must name Swedbank
   Latvia, show the actual registrable domain `example.invalid`, state that
   sensitive data is requested, focus **Leave this page**, and show a red `!`
   badge.
2. Tab and Shift+Tab must remain within the warning actions. Choosing **Continue
   anyway** must dismiss the dialog for that navigation while Popup and
   Diagnostics still show `Danger` and a bypassed intervention. Reloading must
   restore the warning.
3. After bypass, type a fictional marker in the password field without
   submitting. Popup and Diagnostics must never display that marker.
4. **Unknown-brand login** must not display a modal: sensitive intent alone is
   insufficient. The article, comparison, documentation, customer-logo,
   payment-redirect, and OAuth/SSO fixtures must also remain non-interrupting.
5. Existing Stage 2 structural fixtures must remain inspectable. No acceptance
   step submits any form.
6. **Potentially harmful delayed bank login** must initially show no modal, then
   begin showing **Possible phishing page** when the form appears. The click-
   triggered, Latvian, and Russian harmful fixtures must warn;
   canvas/split-text, shared-hosting, articles, comparison, payment, OAuth, and
   documentation fixtures must remain non-interrupting.
7. Diagnostics must show behavioral evidence/coverage, the optional resolver as
   disabled by default, and no packaged ML model. Download the sanitized export
   and confirm it contains no visited address or test field marker.
8. Resolver self-hosting is a separate optional check documented in
   [IDENTITY_RESOLVER.md](IDENTITY_RESOLVER.md); disabling or disconnecting it
   must leave local analysis functional.

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
