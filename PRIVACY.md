# Privacy

OriginLens is designed for local-first phishing analysis with data minimization
as an architectural constraint.

## Current release-candidate behavior

The release-candidate build:

- displays the active page's origin after the user opens the popup;
- uses isolated-world content scripts on HTTP(S) pages and eligible child frames
  to count bounded form structure; it has HTTP(S) host access for that purpose;
- keeps the optional resolver disabled until the user configures and enables it;
- stores only resolver endpoint, locale, signing key ID, public key, and enabled
  choice in extension-local storage; it has no telemetry or analytics;
- never reads field values or DOM HTML;
- reads at most 64 bounded strings from selected top-frame title, heading,
  metadata, favicon, accessible-image, high-salience, footer/legal, and
  login-related surfaces for local alias matching;
- returns only known registry IDs, confidence, context, counts, and stable
  evidence codes from identity analysis; raw page strings never cross the
  content-script boundary;
- combines only those bounded summaries, the active tab URL reduced locally to
  its registrable domain, and stable policy gates in transient extension memory;
- uses capture-phase focus, `beforeinput`, and submit guards only after a danger
  decision; they inspect event type and target structure, never typed data;
- retains a user-selected warning bypass only for the current navigation and
  never changes or persists the underlying danger verdict;
- retains at most eight origins for only the current top-level navigation in
  transient service-worker memory; paths, queries, and prior navigations are
  discarded;
- displays a modal pre-entry warning only when all three danger gates are
  satisfied; caution and unknown do not interrupt browsing.
- observes bounded value-free behavior and destination categories, but never
  request bodies, clipboard contents, permission decisions, or download data;
- can export diagnostics that deliberately omit visited locations, resolver
  endpoints, page text, field values, and history;
- when explicitly enabled, sends a fixed protocol version plus normalized
  organization and locale to the configured resolver with omitted credentials,
  no referrer, no redirect following, and no cache reuse outside its verified
  bounded in-memory result cache.

## Enduring commitments

OriginLens must never read, store, log, transmit, hash, or inspect values typed
into password, OTP, payment-card, recovery, seed-phrase, private-key, or other
sensitive fields. Structural analysis may inspect element types, attributes,
relationships, visibility, and form destinations, but never field values.

The extension must never upload screenshots, page HTML, page text, full URLs,
query strings, browsing history, cookies, tokens, or personal information.
Telemetry is disabled by default and initial releases contain no analytics.

The optional resolver receives only a normalized claimed organization and locale
as page-derived data. It does not receive the visited domain or page content;
comparison remains local. Resolver use is optional with a fully local fallback.
Verified results, request history, and visited locations are not persisted.

Sanitized diagnostics must separate configuration facts and detected structure
from page-controlled text and sensitive data.
