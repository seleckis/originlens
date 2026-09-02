# OriginLens

**See who a site really is.**

OriginLens is an open-source, privacy-first Chrome extension being built to
detect phishing from identity claims, sensitive-data intent, verified domain
relationships, and page behavior—not malicious-URL blocklists.

## Current status: v0.1.3 false-positive-corrected Web Store candidate

The current build is a loadable Manifest V3 extension with early local signals.
It provides:

- a first-run disclosure and affirmative opt-in before website content, web
  history, or bounded user activity is analyzed, with revocation in Options;
- a popup showing the active page origin;
- an options page;
- a local diagnostics view;
- deterministic URL/origin evidence such as unusual ports, user-info confusion,
  IDN visibility, mixed scripts, and confusables;
- bounded, local structural counts for sensitive form intent, form context,
  overlays, eligible nested frames, DOM mutations, and SPA navigation;
- explicit partial-coverage evidence for unavailable frames, traversal limits,
  and unobservable closed shadow roots;
- bounded claimed-identity extraction from selected high-salience page surfaces;
- a versioned, provenance-backed positive registry for five Latvian banks;
- deterministic canonical, official-login, legacy-redirect, parent-domain, and
  strong-mismatch facts with article, comparison, documentation, customer-logo,
  payment, and OAuth/SSO context handling;
- functional bank-authentication controls kept distinct from page-level identity
  claims, including when a framework shares their form with local credentials;
- an explicit danger policy requiring a strong identity claim, value-blind
  sensitive-data intent, and a provenance-backed domain mismatch;
- per-tab danger, caution, and unknown badges with accessible toolbar titles;
- an accessible pre-entry warning and deliberate per-navigation bypass that does
  not weaken the danger verdict;
- bounded delayed/click insertion, SPA, action-mutation, destination, download-
  click, permission-control, identity-removal, and canvas-visibility evidence;
- warning-start fixtures for delayed, click-triggered, Latvian, and Russian
  synthetic bank impersonation;
- a disabled-by-default self-hosted resolver with minimized requests,
  Ed25519-signed expiring provenance, local comparison, cache/rate limits, and
  local fallback;
- sanitized diagnostics export, explicit CSP, production SBOM, performance
  budgets, reproducible release-candidate packaging, and a separately validated
  manifest-at-root Chrome Web Store upload;
- an event-driven service worker with no telemetry or analytics.

OriginLens does **not** package local ML: the measured gaps do not yet have a
representative, licensed, temporally and site-family-separated corpus that could
support honest evaluation. Caution and unknown do not interrupt browsing, and
danger requires all three explicit gates rather than a score. The optional
resolver is positive identity enrichment, not a malicious-domain reputation
service.

> **Important:** OriginLens cannot prove that a website is safe. It does not
> replace Chrome's built-in protections or phishing-resistant authentication
> such as passkeys and hardware security keys.

## Privacy baseline

The release candidate has a bundled isolated-world content script on HTTP(S)
pages and eligible child frames, but it attaches no analyzer or observer until
the user accepts the first-run local-processing disclosure. After opt-in it
counts bounded field/form structure and matches bounded top-frame identity
surfaces locally against known aliases. It never accesses field values. Bounded
click target structure supports click-triggered insertion detection;
capture-phase focus, input, and submit guards inspect only target element
structure and event type when a danger decision is already active. They never
read keystrokes, pointer coordinates, or field values. Only registry IDs,
counts, confidence, contexts, decision booleans, and evidence codes cross the
content boundary; raw page text does not. Local storage contains the versioned
consent choice and optional resolver configuration. Network access occurs only
when that resolver is explicitly configured and enabled; its request excludes
visited location and page content. Current-navigation evidence, user-activity
evidence, resolver results/caches, and bypass state are transient and discard
paths and queries.

Future stages must never read, retain, log, hash, or transmit values entered in
password, OTP, payment-card, recovery, seed-phrase, private-key, or other
sensitive fields. See [PRIVACY.md](PRIVACY.md).

## Development

Requirements:

- Node.js 22.13 or newer
- pnpm 11.22 or newer

```bash
pnpm install
pnpm dev
```

Build the Chrome MV3 extension:

```bash
pnpm build
```

Load `.output/chrome-mv3` as an unpacked extension in Chrome.

### Manual Chrome acceptance

Start the loopback-only fixture server:

```bash
pnpm test:fixtures
```

Open `http://127.0.0.1:4173/` in the same Chrome profile as the unpacked
extension. The fixtures use fictional data and require no form submission.
Private fixture hostnames and endpoints are intentionally not recorded in this
repository or supplied to Chrome Web Store reviewers.

Run the automated checks:

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

`pnpm package:web-store` creates `dist/originlens-0.1.3-chrome-web-store.zip`.
This is distinct from the nested test-download ZIP and is never uploaded
automatically. Store listing copy, privacy declarations, assets, permission
justifications, and reviewer steps are recorded in [docs/store/](docs/store/).

The nondestructive live-bank regression is separately opt-in:

```bash
RUN_LIVE_BANK_TESTS=1 pnpm test:banks:live
```

The Playwright smoke test requires its bundled Chromium:

```bash
pnpm exec playwright install chromium
```

## Design documents

- [Architecture](docs/ARCHITECTURE.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Decision policy](docs/DECISION_POLICY.md)
- [Testing](docs/TESTING.md)
- [Architecture decisions](docs/adr/)
- [Research notes](docs/research/)

## License

Browser-extension and shared source code are licensed under the Mozilla Public
License 2.0. See [LICENSE](LICENSE). Dataset and model licensing is tracked
separately in
[docs/DATA_AND_MODEL_LICENSING.md](docs/DATA_AND_MODEL_LICENSING.md).
