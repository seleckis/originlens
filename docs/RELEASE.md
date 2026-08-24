# Release and Chrome Web Store workflow

No command in this repository publishes to the Chrome Web Store.

## Build and verify

```bash
pnpm install --frozen-lockfile
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

`pnpm package:test-download` produces:

- `dist/originlens-release-candidate.zip`
- `dist/originlens-release-candidate.zip.sha256`
- `dist/SBOM.cdx.json`

`pnpm package:web-store` produces the separate upload artifact:

- `dist/originlens-0.1.2-chrome-web-store.zip`
- `dist/originlens-0.1.2-chrome-web-store.zip.sha256`

The test ZIP intentionally contains a `chrome-mv3` directory plus its SBOM for
the **Load unpacked** workflow. The Web Store ZIP contains `manifest.json` at
its root and excludes the SBOM, source documents, test fixtures, and source
maps.

The fixed default `SOURCE_DATE_EPOCH` and sorted metadata-free ZIP entries make
the artifact reproducible from the same source and dependency/toolchain inputs.
Release operators may set an explicit `SOURCE_DATE_EPOCH`.

## Signing and checkpoint

1. Review the exact commit, clean worktree, full gate output, SBOM, audit, and
   reproducibility hash.
2. Deploy the test artifact and fixtures; verify the published checksum.
3. Complete manual stable-Chrome acceptance at
   `https://fixtures.example.invalid/fixtures/`.
4. Only after explicit acceptance, create the annotated `stage-10` and `v0.1.2`
   tags and push the commit/tags.
5. Obtain separate approval before creating/uploading a dashboard item and again
   before selecting **Submit for review**.
6. Use deferred publishing. After approval, verify the staged metadata and
   obtain a final explicit approval before **Publish**.
7. Record the item ID, listing URL, version, uploaded checksum, review outcome,
   and clean-profile Store installation result in
   [the submission worksheet](store/SUBMISSION.md).

Repository scripts never handle Chrome Web Store credentials or invoke a Store
publishing API.

Private vulnerability reports follow [SECURITY.md](../SECURITY.md). Rollback is
performed by withdrawing the candidate artifact or publishing a reviewed newer
version; never reuse a released version number for different bytes.
