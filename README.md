# OriginLens

**See who a site really is.**

OriginLens is an open-source, privacy-first Chrome extension being built to
detect phishing from identity claims, sensitive-data intent, verified domain
relationships, and page behavior—not malicious-URL blocklists.

## Current status: Stage 0 shell

The current build is a loadable Manifest V3 extension shell. It provides:

- a popup showing the active page origin;
- an options page;
- a local diagnostics view;
- an event-driven service worker with no listeners;
- no page analysis, warnings, telemetry, analytics, or network endpoints.

OriginLens does **not** detect phishing yet. See [ROADMAP.md](ROADMAP.md) for
planned work; roadmap items are not implemented features.

> **Important:** OriginLens cannot prove that a website is safe. It does not
> replace Chrome's built-in protections or phishing-resistant authentication
> such as passkeys and hardware security keys.

## Privacy baseline

Stage 0 has no content script, required host permissions, storage, analytics, or
application network calls. The popup requests `activeTab` only, allowing it to
display the active page's origin after the user opens the extension.

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

### Test-download deployment

For the self-hosted Stage 0 test artifact, run:

```bash
pnpm deploy:test-download
```

This creates an integrity-checkable ZIP and serves it only at
`https://fixtures.example.invalid/originlens-stage-0.zip`. Chrome does not install
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
