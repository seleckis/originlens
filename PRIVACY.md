# OriginLens privacy policy

Effective: 2026-08-23

Applies to: OriginLens v0.1.1

OriginLens is a local-first phishing-analysis browser extension. This policy
explains the information the extension handles, how it is used, and what never
happens to it.

## Your consent and control

OriginLens does not analyze website content or current web-browsing activity
until its first-run disclosure is shown and you affirmatively select **Enable
OriginLens protection**. The consent record is versioned so a future material
change can require a new disclosure and choice instead of silently preserving
old consent.

You can withdraw consent at any time with **Disable protection** in Options.
Revocation removes active page observers and warnings and clears transient
navigation, identity, structural, behavior, decision, bypass, resolver-result,
and resolver-cache state. Analysis remains off until you review the disclosure
and enable it again.

## Information handled on your device

OriginLens processes two Chrome Web Store user-data categories locally because
they are necessary for its visible phishing-analysis feature:

- **Website content and resources:** bounded selected strings from titles,
  headings, metadata, accessible image labels, and other high-salience surfaces;
  structural attributes and types for forms and controls; and bounded page
  behavior and destination categories.
- **Current web-browsing activity:** the active page origin, registrable domain,
  eligible frame structure, and at most eight bounded redirect origins for the
  current top-level navigation.

Raw page strings remain inside the isolated content script. The background
receives only registry identifiers, bounded counts, classifications, decision
booleans, confidence, and stable evidence codes. Paths and query strings are
discarded, and OriginLens does not create or retain a browsing-history record.

## Information OriginLens never accesses

OriginLens never reads, retains, logs, transmits, hashes, or inspects values
entered into password, one-time-code, payment-card, recovery, seed-phrase,
private-key, or other sensitive fields. It does not read ordinary form values,
DOM HTML, request bodies, clipboard contents, cookies, tokens, or permission
decisions.

OriginLens does not upload screenshots, page HTML, raw page text, full URLs,
query strings, browsing history, cookies, tokens, personal information, or
sensitive values. It has no telemetry, analytics, advertising, or reputation API
integration.

## How the information is used

Locally processed information is used only to display OriginLens's current
origin, phishing-analysis state, warning intervention, and inspectable evidence.
The extension never displays a green “safe” verdict. Current-navigation
evidence, warning-bypass state, resolver results, and resolver cache entries are
transient.

Capture-phase focus, `beforeinput`, and submit guards run only after a danger
decision. They inspect event type and target structure, never typed data.

## Optional identity resolver

The optional self-hosted identity resolver is disabled until you configure and
enable it. When enabled, it receives only a fixed protocol version, normalized
claimed organization, and configured locale. It never receives the visited
domain or location, page content, screenshot, field value, cookie, token, or
browsing history. Domain comparison remains local.

Requests omit credentials and referrer information, do not follow redirects, and
require HTTPS except for loopback development. Resolver responses are bounded,
schema-validated, Ed25519-signed data and are never executed. The operator of a
user-selected resolver is responsible for that server's own network and logging
practices.

## Storage, retention, and deletion

Chrome extension-local storage contains only the versioned local-analysis
consent choice and the resolver endpoint, locale, signing key ID, public key,
and enabled choice. OriginLens stores no page state, resolver result, browsing
history, sensitive value, or analytics identifier. Changing settings replaces
the stored configuration. Disabling protection removes its consent record;
removing the extension or clearing its extension data deletes all configuration
through Chrome.

## Sharing, advertising, and human access

The OriginLens project does not sell user data, use it for advertising or
profiling, operate a resolver backend, or receive handled website content or
browsing activity. The only optional transfer made by the extension is the
minimized resolver request described above, sent to the endpoint selected by the
user. That resolver's operator can process the minimized request under its own
privacy policy; OriginLens does not provide or control that server.

OriginLens's use and transfer of information received from Google APIs adheres
to the Chrome Web Store User Data Policy, including the Limited Use
requirements. Data controlled by the OriginLens project is used only for the
extension's disclosed, user-facing single purpose; it is not transferred for
unrelated purposes, advertising, or prohibited human review.

## Security and changes

Executable code is bundled locally under Manifest V3. Extension pages permit
only packaged scripts. Sanitized diagnostics omit visited locations, resolver
endpoints, raw page text, form values, and browsing history.

Material privacy changes require a reviewed extension update, corresponding
changes to this policy and Chrome Web Store disclosures, proactive in-product
notice, and renewed consent where the disclosed handling changes.

## Contact

Report ordinary privacy questions at
https://github.com/seleckis/originlens/issues. Report vulnerabilities through
GitHub private vulnerability reporting as described in `SECURITY.md`; never
include real credentials, cookies, tokens, personal data, or browsing history.
