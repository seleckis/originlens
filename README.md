# OriginLens

**See who a site really is.**

OriginLens is an open-source, privacy-first Chrome extension being built to
detect phishing from identity claims, sensitive-data intent, verified domain
relationships, and page behavior—not malicious-URL blocklists.

## Current status: Stage 2 structural analysis

The current build is a loadable Manifest V3 extension with early local signals.
It provides:

- a popup showing the active page origin;
- an options page;
- a local diagnostics view;
- deterministic URL/origin evidence such as unusual ports, user-info confusion,
  IDN visibility, mixed scripts, and confusables;
- bounded, local structural counts for sensitive form intent, form context,
  overlays, eligible nested frames, DOM mutations, and SPA navigation;
- explicit partial-coverage evidence for unavailable frames, traversal limits,
  and unobservable closed shadow roots;
- an event-driven service worker, no telemetry, analytics, or network endpoints.

OriginLens does **not** identify claimed organizations, verify domains, issue
phishing warnings, or block entry yet. See [ROADMAP.md](ROADMAP.md) for planned
work; roadmap items are not implemented features.

> **Important:** OriginLens cannot prove that a website is safe. It does not
> replace Chrome's built-in protections or phishing-resistant authentication
> such as passkeys and hardware security keys.

## Privacy baseline

Stage 2 has a bundled isolated-world content script on HTTP(S) pages and
eligible child frames. It counts bounded field and form structure but never
accesses field values or registers input/keylogging handlers. It has no
persistent storage, analytics, or application network calls. Current-navigation
evidence retains at most eight origins in transient service-worker memory and
discards paths and queries.

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

Use the canonical hosted fixture index:

`https://originlens.seleckis.lv/fixtures/`

Stage acceptance instructions should link to that address directly. The hosted
fixtures use fictional data, do not submit forms, and require no local fixture
server.

### Test-download deployment

For the self-hosted test artifact, run:

```bash
pnpm deploy:test-download
```

This creates an integrity-checkable ZIP and serves it only at
`https://originlens.seleckis.lv/originlens-stage-2.zip`. Chrome does not install
self-hosted extension ZIPs directly: extract the archive, then select its
`chrome-mv3` directory with **Load unpacked** in `chrome://extensions`.

The deployment command requires local `sudo` because it installs an Nginx vhost
and reloads the server. See [deployment notes](docs/DEPLOYMENT.md).

Run the automated checks:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

For local fixture development only, run:

```bash
pnpm test:fixtures
```

This optional fallback serves the same files at `http://127.0.0.1:4173/`; it is
not the canonical manual acceptance address.

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
