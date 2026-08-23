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
  SBOM. It is included in the manual-test release candidate and retained beside,
  never inside, the Chrome Web Store upload ZIP.
- `pnpm package:web-store` creates a deterministic manifest-at-root upload and
  validates version, permissions, CSP, icon dimensions, paths, source-map
  exclusion, and remote-script exclusion before hashing it.

Before a release, review `pnpm audit --prod`, dependency licenses, the generated
SBOM, lockfile changes, package provenance where available, and WXT output. An
audit finding is evaluated for reachability and impact; it is never silently
ignored merely because a numerical severity is low.
