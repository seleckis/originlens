# Release and Chrome Web Store workflow

OriginLens uses Chrome Web Store API V2 with a dedicated Google Cloud service
account. `gcloud` impersonation mints short-lived tokens in memory; the
repository contains no service-account key, OAuth refresh token, or access
token.

Non-secret identifiers are versioned in `store.config.json`. The active human
Google account must have `roles/iam.serviceAccountTokenCreator` on only the
configured service account, and that service-account email must be registered
under **Account** in the Chrome Web Store Developer Dashboard.

## Commands

```bash
pnpm store:status
pnpm store:package
pnpm store:upload
pnpm store:submit
pnpm store:publish
pnpm store:release
```

- `store:status` is read-only. It prints the published, submitted, staged, last
  asynchronous-upload, warning, and takedown states.
- `store:package` installs from the lockfile, runs lint, formatting, strict type
  checking, unit/integration tests, production builds, performance checks,
  Playwright tests, Store asset/package validation, and reproducibility checks.
  It locates the versioned upload ZIP and prints its path, version, size, and
  SHA-256.
- `store:upload` runs `store:package`, verifies that the package version exceeds
  every published and submitted version, requires the exact interactive phrase
  `UPLOAD <version>`, uploads only the draft package, polls processing, and
  writes a gitignored receipt under `dist/`. It never submits or publishes.
- `store:submit` accepts only the exact artifact recorded in the successful
  upload receipt. It requires `SUBMIT <version> STAGED_PUBLISH`, blocks on Store
  warnings, and submits for review with `STAGED_PUBLISH`. Approval leaves the
  revision staged.
- `store:publish` works only when the submitted revision is `STAGED`. It
  requires `PUBLISH <version>` and publishes that already approved staged
  revision.
- `store:release` is the normal automatic-release path. It requires a clean,
  tagged, pushed checkpoint, runs the complete package gate, requires
  `RELEASE <version> DEFAULT_PUBLISH`, uploads the draft, and submits with
  `DEFAULT_PUBLISH`. Google review continues asynchronously and approval causes
  automatic publication.

`store:submit` and `store:release` never infer a publish mode. Their names,
summaries, API bodies, and confirmation phrases explicitly select
`STAGED_PUBLISH` and `DEFAULT_PUBLISH`, respectively.

## Artifact layout

`pnpm package:test-download` produces:

- `dist/originlens-release-candidate.zip`
- `dist/originlens-release-candidate.zip.sha256`
- `dist/SBOM.cdx.json`

`pnpm package:web-store` produces
`dist/originlens-<version>-chrome-web-store.zip` and its adjacent `.sha256`. The
Store ZIP has `manifest.json` at its root and excludes the SBOM, source
documents, fixtures, and source maps. Fixed timestamps and sorted ZIP entries
make it reproducible from identical source, dependencies, and toolchain inputs.

## Release gate

1. Run `pnpm store:package` and review the printed version and checksum.
2. Run `pnpm test:fixtures`, use its loopback-only index for stable-Chrome
   manual acceptance, and record the result. Store reviewer instructions must
   remain self-contained and must not mention the fixture service.
3. Commit the accepted checkpoint, create the annotated `v<version>` tag, and
   push the commit and tag.
4. Run `pnpm store:status` and verify the expected item and prior version.
5. Choose one explicit mode:
   - `pnpm store:release` for automatic publication after approval; or
   - `pnpm store:upload` followed later by `pnpm store:submit` for staged
     approval and a separately confirmed `pnpm store:publish`.
6. Record the uploaded checksum and resulting state in
   [the submission worksheet](store/SUBMISSION.md). After publication, verify a
   clean-profile installation from the signed Store package.

## Recovery

- Authentication failure: run `gcloud auth login --no-launch-browser`, then
  retry `pnpm store:status`. Never create a JSON service-account key.
- Impersonation or HTTP 403 failure: verify the configured service-account email
  is still present in the Developer Dashboard and the human account still has
  Token Creator on that individual service account.
- Failed or timed-out upload: run `pnpm store:status` and inspect the Developer
  Dashboard package error. Fix the cause, increment the manifest version if the
  Store accepted the previous bytes, rebuild, and upload again. Never reuse a
  released or accepted version for different bytes.
- Rejected review: read the Dashboard rejection details, add a regression or
  disclosure correction as appropriate, rerun every release gate, and upload a
  higher version. The CLI intentionally has no cancellation command.
- Interrupted local command: no token is persisted. A successful upload receipt
  is bound to publisher ID, extension ID, version, and SHA-256; rerun
  `store:status` before deciding whether to continue.

Private vulnerability reports follow [SECURITY.md](../SECURITY.md).
