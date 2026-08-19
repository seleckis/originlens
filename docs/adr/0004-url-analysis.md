# ADR 0004: Deterministic local URL analysis

- Status: Accepted
- Date: 2026-08-19

Stage 1 uses `tldts` 7.4.10 for registrable domains and bundled Punycode
decoding for hostname visibility. IP literals, user-info, non-default ports,
deep subdomains, brand-like token placement, Punycode, mixed scripts, and
bounded UTS #39-derived confusables are stable evidence codes, never brand
verification or blocking policy. `webNavigation` stores at most eight top-frame
origins per tab in transient service-worker memory; paths and queries are
excluded.
