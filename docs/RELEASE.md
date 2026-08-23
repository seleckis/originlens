# Release-candidate workflow

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
pnpm verify:reproducible
```

`pnpm package:test-download` produces:

- `dist/originlens-release-candidate.zip`
- `dist/originlens-release-candidate.zip.sha256`
- `dist/SBOM.cdx.json`

The fixed default `SOURCE_DATE_EPOCH` and sorted metadata-free ZIP entries make
the artifact reproducible from the same source and dependency/toolchain inputs.
Release operators may set an explicit `SOURCE_DATE_EPOCH`.

## Signing and checkpoint

1. Review the exact commit, clean worktree, full gate output, SBOM, audit, and
   reproducibility hash.
2. Deploy the test artifact and fixtures; verify the published checksum.
3. Complete manual stable-Chrome acceptance at
   `https://fixtures.example.invalid/fixtures/`.
4. Only after explicit acceptance, create the annotated release-candidate tag
   and push the commit/tag.
5. If publication is separately approved, sign/upload through the authorized
   Chrome Web Store account with least privilege and record the resulting item
   version/checksum. Repository scripts never handle store credentials.

Private vulnerability reports follow [SECURITY.md](../SECURITY.md). Rollback is
performed by withdrawing the candidate artifact or publishing a reviewed newer
version; never reuse a released version number for different bytes.
