# ADR 0013: Require affirmative consent before page analysis

- Status: Accepted
- Date: 2026-08-23

## Context

Chrome Web Store policy enforcement beginning 2026-08-01 requires prominent
in-product disclosure of handled user data and affirmative consent before
handling begins. Local-only processing still counts. OriginLens v0.1.0 started
bounded DOM and navigation analysis immediately after installation, so Store
copy and a privacy-policy link alone were insufficient.

## Decision

OriginLens stores a versioned `protectionConsent` record only after the user
reviews the first-run disclosure, selects its consent checkbox, and chooses
**Enable OriginLens protection**.

Without a current valid record:

- content scripts create no DOM/identity/behavior analyzer, observer, click
  handler, intervention, or page report;
- the background ignores navigation events and exposes no page-analysis state;
- Popup does not query or display the current origin; and
- Diagnostics does not inspect a tab.

The user can revoke consent in Options. Revocation destroys active page analysis
and warnings and clears transient background analysis, navigation, bypass,
resolver-result, and resolver-cache state. A material future disclosure change
increments the consent schema version and requires renewed consent.

## Consequences

Protection is intentionally inactive until the user opts in. Existing users
updating from a build without a consent record receive the same disclosure.
OriginLens gains one persistent boolean/version record but no additional Chrome
permission, backend, telemetry, or remotely executed code.
