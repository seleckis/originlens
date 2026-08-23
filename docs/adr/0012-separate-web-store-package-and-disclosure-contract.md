# ADR 0012: Separate the Web Store package and disclosure contract

- Status: accepted
- Date: 2026-08-23

## Context

The manual-test ZIP intentionally contains a `chrome-mv3` directory and an SBOM,
but Chrome Web Store uploads require `manifest.json` at the archive root. Store
review also requires exact permission and user-data disclosures. Local website
content and current-navigation processing count as handled user data even when
OriginLens never retains or transmits browsing history.

## Decision

Produce a separate deterministic Web Store ZIP containing only production
extension files. Keep the SBOM and checksum adjacent to it. Validate version,
permissions, host access, CSP, icon dimensions, layout, and remote-script
absence before hashing. Treat the checked-in listing, privacy disclosure, and
submission worksheet as one contract with the exact artifact.

Do not automate dashboard credentials or publishing. Require independent
approval before upload, review submission, and final deferred publication.

## Consequences

Manual acceptance remains convenient without making the upload invalid. Store
answers conservatively disclose local website-content and current-browsing
processing while preserving the narrower facts that no browsing history or
sensitive values are retained or transmitted. Each later version must update the
artifact name, disclosures, checksum, and review record together.
