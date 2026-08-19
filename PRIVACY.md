# Privacy

OriginLens is designed for local-first phishing analysis with data minimization
as an architectural constraint.

## Current behavior (Stage 2)

The Stage 0 shell:

- displays the active page's origin after the user opens the popup;
- uses an isolated-world content script on HTTP(S) pages to count bounded form
  structure; it has HTTP(S) host access for that purpose;
- configures no application network endpoint;
- has no storage, telemetry, or analytics;
- does not read field values, page text, DOM HTML, or browsing history;
- has no phishing verdict or blocking behavior.

## Enduring commitments

OriginLens must never read, store, log, transmit, hash, or inspect values typed
into password, OTP, payment-card, recovery, seed-phrase, private-key, or other
sensitive fields. Structural analysis may inspect element types, attributes,
relationships, visibility, and form destinations, but never field values.

The extension must never upload screenshots, page HTML, page text, full URLs,
query strings, browsing history, cookies, tokens, or personal information.
Telemetry is disabled by default and initial releases contain no analytics.

The optional Stage 6 resolver may receive only a normalized claimed organization
and locale by default. It must not receive the visited domain or page content;
comparison remains local. Resolver use will be optional with a fully local
fallback.

Sanitized diagnostics must separate configuration facts and detected structure
from page-controlled text and sensitive data.
