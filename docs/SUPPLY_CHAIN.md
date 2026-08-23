# Supply-chain and dependency review

## Controls

- `pnpm-lock.yaml` is committed and CI uses a frozen lockfile.
- Runtime code is bundled locally; extension pages execute no remote code.
- Manifest CSP permits only packaged scripts and no object sources.
- The production dependency set is intentionally small: React/React DOM for UI,
  `tldts` for maintained PSL parsing, and `punycode` for explicit IDN display.
- Resolver signatures use built-in Web Crypto; no cryptography package is added.
- No ML runtime, model weights, analytics SDK, OCR stack, or remote reputation
  client is packaged.
- `pnpm run sbom:generate` generates a deterministic CycloneDX 1.5 production
  SBOM, included beside the extension directory in the release-candidate ZIP.

Before a release, review `pnpm audit --prod`, dependency licenses, the generated
SBOM, lockfile changes, package provenance where available, and WXT output. An
audit finding is evaluated for reachability and impact; it is never silently
ignored merely because a numerical severity is low.
