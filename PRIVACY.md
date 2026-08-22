# Privacy

OriginLens is designed for local-first phishing analysis with data minimization
as an architectural constraint.

## Current behavior (Stage 3)

The Stage 3 build:

- displays the active page's origin after the user opens the popup;
- uses isolated-world content scripts on HTTP(S) pages and eligible child frames
  to count bounded form structure; it has HTTP(S) host access for that purpose;
- configures no application network endpoint;
- has no storage, telemetry, or analytics;
- never reads field values or DOM HTML;
- reads at most 64 bounded strings from selected top-frame title, heading,
  metadata, favicon, accessible-image, high-salience, footer/legal, and
  login-related surfaces for local alias matching;
- returns only known registry IDs, confidence, context, counts, and stable
  evidence codes from identity analysis; raw page strings never cross the
  content-script boundary;
- retains at most eight origins for only the current top-level navigation in
  transient service-worker memory; paths, queries, and prior navigations are
  discarded;
- reports identity/domain relationships as facts but has no phishing warning or
  blocking behavior.

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
