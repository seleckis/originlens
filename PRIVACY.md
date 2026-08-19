# Privacy

OriginLens is designed for local-first phishing analysis with data minimization
as an architectural constraint.

## Stage 0 behavior

The Stage 0 shell:

- displays the active page's origin after the user opens the popup;
- has no content script, host permissions, storage, telemetry, or analytics;
- configures no application network endpoint;
- performs no page or phishing analysis.

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
