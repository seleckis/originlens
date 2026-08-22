# Dataset and model licensing

No third-party datasets or model weights are included in Stage 3.

Stage 3 bundles the human-reviewed positive identity registry in
`lib/identity-registry.ts`. It contains factual organization names, aliases,
domain relationships, and source URLs curated from official bank and regulator
pages; it does not copy page text, logos, screenshots, or third-party datasets.
The registry schema is version 1, released 2026-08-22, reviewed by OriginLens
maintainers, and records a 2027-02-22 re-verification date. Registry code and
structure are distributed with the MPL-2.0 project; the linked source sites
retain their own content and terms.

Browser-extension and shared code are MPL-2.0. Any future dataset or model
weight must be documented here before inclusion with:

- artifact name and version;
- source and provenance;
- license and redistribution terms;
- permitted use and known restrictions;
- integrity hash;
- responsible reviewer and review date.

An artifact with terms incompatible with public redistribution must not be
silently bundled or represented as MPL-2.0 code.
