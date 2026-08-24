# Threat model

## Security objective

Help a user recognize high-confidence identity impersonation before entering
sensitive data, while treating false warnings on legitimate sites as security
failures.

## Adversaries

Assume an attacker can:

- read all source, bundled data, models, rules, evidence codes, and thresholds;
- repeatedly test mutations against the extension;
- control page DOM, styles, scripts, frames, navigation, redirects, and timing;
- use Unicode, IDNs, shared hosting, redirects, SPAs, overlays, shadow DOM,
  canvas, split text, and delayed insertion;
- imitate brand language and assets or remove them to force ambiguity;
- attempt to forge or replay messages at the page/extension boundary.

## Protected assets

- sensitive field values and browsing data;
- integrity of domain-to-organization evidence;
- warning correctness, provenance, and timing;
- extension execution and message boundaries;
- user trust, especially avoidance of false reassurance and false alarms.

## Out of scope and limitations

OriginLens cannot prove a site safe, inspect every JavaScript exfiltration path,
see inaccessible browser UI, or guarantee analysis of closed shadow roots and
inaccessible frames. Unknown visibility must remain unknown, not benign.
Compromised browsers, operating systems, and extension signing infrastructure
are outside the extension's enforcement boundary.

## Release-candidate attack surface

Before affirmative consent, the content script does not access page DOM or
behavior and the service worker does not process navigation events or expose
page-analysis state. A malformed, missing, or superseded consent record is
disabled. The first-run page states the handled categories, purpose, local
default, sensitive-value exclusions, and revocation path before the enable
control becomes available.

Stage 2 injects a bundled isolated-world script into HTTP(S) pages. The script
considers the DOM hostile and exposes a schema-validated structural response
only over Chrome's private extension tab-message channel. It never reads field
values and has no clipboard, downloads, permission, or page-message bridge. The
decision layer adds capture-phase focus, `beforeinput`, and submit guards only
while a validated danger decision is active. They inspect event type and target
structure, never input data. A page cannot call the extension channel because
OriginLens exposes no external messaging endpoint.

Closed shadow roots and inaccessible frames are not evidence of benignness. They
remain unobserved; partial coverage produces `unknown` unless the three positive
danger facts are already established.

Stage 3 additionally reads bounded text from selected top-frame title, heading,
metadata, favicon, accessible-image, high-salience, footer/legal, and
login-related surfaces. Page text is matched locally only against known aliases.
Only registry IDs, confidence, context, counts, and stable evidence codes cross
the content boundary; raw strings do not. Context keywords cannot suppress a
claim when password or OTP structure is present.

The bundled positive registry is not a malicious-domain list and is not assumed
complete. Each relationship has provenance and a re-verification date. Unknown
organizations and domains remain unverified. The release candidate produces
danger only from the conjunction of one strong registry claim, sensitive-data
intent, and a verified-domain mismatch.

The page warning is extension-created DOM, not a browser-owned interstitial. It
uses an isolated shadow tree, native top-layer modal behavior, reinsertion, and
capture guards, but a hostile page can still attempt removal or race the content
script. A deliberate bypass is transient for the current navigation and never
changes the danger decision. Badge, popup, and diagnostics remain independently
inspectable if page intervention is disrupted.

Behavior tracking observes only bounded DOM/event facts after version 2 consent:
click target structure plus danger-only focus, `beforeinput`, and submit event
types and target structure. It never reads keystrokes, pointer coordinates, or
field values. Page code can hide identity in canvas/closed roots, construct
exfiltration outside forms, or race mutation delivery. These cases do not become
benign. OriginLens never sees request bodies, clipboard contents, permission
outcomes, or managed downloads.

The optional resolver adds response poisoning, replay, endpoint compromise,
traffic analysis, and availability threats. It is disabled by default, sends no
visited location, pins an Ed25519 public key/key ID, binds signed payloads to
the exact normalized request, enforces expiry/size/count schemas, compares
locally, and rate limits/cache-bounds requests. Failure or invalid data restores
the bundled local assessment; a response cannot create danger, only a signed
positive relationship that suppresses a mismatch.

Persistent storage contains only the versioned protection-consent record and
user-entered resolver configuration. Revocation removes the consent record,
destroys page observers/interventions, and clears transient analysis. A local
malicious extension or compromised browser profile remains outside the trust
boundary. Release threats are reduced with local-only CSP, locked dependencies,
SBOM generation, deterministic packaging, checksum publication, private
vulnerability reporting, and manual review; they are not eliminated.
