# ADR 0007: Bounded claimed identity and positive registry

- Status: Accepted
- Date: 2026-08-22

## Context

Stage 3 must recognize a small set of provenance-backed organizations without
turning every brand mention into a phishing claim. Pages can contain bank names
for news, comparisons, documentation, customer lists, payments, and SSO, and an
attacker can manipulate every inspected DOM surface. Raw page strings must not
cross the content-script trust boundary, and the registry cannot be treated as
complete or permanently current.

## Decision

Inspect a maximum of 64 bounded high-salience signals in the top frame. Match
only aliases from the bundled positive registry and return registry IDs, source
codes, context codes, confidence, and coverage. Never return matched text. A
claim is strong only when it co-occurs with password/OTP intent or appears on at
least two source categories. Multiple organizations and recognized benign
contexts remain weak when no password or OTP is requested. Context never
suppresses credential-taking evidence.

Version every registry release. Each record contains a stable ID, organization
and legal name, aliases, domains and their relationships, authoritative source
URLs, evidence types, verification date, reviewer, and re-verification date.
Canonical, official-login, legacy-redirect, and documented parent-organization
domains are positive relationships. Anything absent remains unverified rather
than malicious by reputation.

Compare only the registrable domain. A verified relationship is a positive fact.
A mismatch is emitted only for one strong known claim on an unrelated domain.
Stage 3 displays that fact in diagnostics but does not warn or block; Stage 4
will decide how identity, sensitive intent, and mismatch combine.

Use the existing `activeTab`, `scripting`, HTTP(S) host access, and isolated
content script. Add no permission, storage, telemetry, backend, screenshot, OCR,
or remote lookup.

## Consequences

The initial registry is deliberately narrow and can abstain on unknown brands.
Text splitting, canvas-only labels, inaccessible content, and adversarial
omission can evade Stage 3 extraction; these are not converted into benign
evidence. Re-verification is operationally required. The deterministic boundary
supports unit, synthetic-context, extension, and optional nondestructive live
bank regressions without reading field values or retaining page content.
