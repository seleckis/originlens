# ADR 0010: Optional signed identity resolver

- Status: accepted
- Date: 2026-08-23

## Context

A bundled positive registry cannot cover every legitimate domain relationship.
Dynamic positive evidence must not reveal browsing location or let a resolver
silently poison identity decisions.

## Decision

Add a disabled-by-default, self-hostable resolver. Requests contain a fixed
version plus only normalized organization and locale. Responses use bounded
schemas, provenance, expiry, Ed25519 signatures, configured key IDs, an
in-memory cache, and per-organization client rate limits. Candidate-domain
comparison is local and requires confidence of at least 0.9 plus direct official
evidence or two independent provenance origins. Invalid, expired, oversized,
tampered, or unavailable responses fall back to the bundled registry.

Persist only user-entered resolver configuration with Chrome local storage. This
adds the `storage` permission; no visited page state, resolver result, history,
or sensitive value is persisted. The already declared HTTP(S) host permissions
cover the optional fetch and are not expanded.

## Consequences

Operators can self-host positive identity enrichment without receiving visited
domains. Users must explicitly trust and pin a resolver public key. A failed
resolver cannot suppress the local high-confidence warning.
